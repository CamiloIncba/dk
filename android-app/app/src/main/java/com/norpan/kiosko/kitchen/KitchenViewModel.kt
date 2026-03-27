package com.norpan.kiosko.kitchen

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.norpan.kiosko.data.BackendConfig
import com.norpan.kiosko.kitchen.model.KitchenOrderDto
import com.norpan.kiosko.kitchen.model.UpdateKitchenStatusRequest
import com.norpan.kiosko.kitchen.network.ApiKeyInterceptor
import com.norpan.kiosko.kitchen.network.KitchenApiService
import com.norpan.kiosko.printing.BluetoothPrinterManager
import com.norpan.kiosko.printing.KitchenTicketFormatter
import com.norpan.kiosko.printing.PrinterConfig
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

class KitchenViewModel : ViewModel() {

    private val _orders = MutableStateFlow<List<KitchenOrderDto>>(emptyList())
    val orders: StateFlow<List<KitchenOrderDto>> = _orders

    private val _readyOrders = MutableStateFlow<List<KitchenOrderDto>>(emptyList())
    val readyOrders: StateFlow<List<KitchenOrderDto>> = _readyOrders

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error
    
    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected
    
    // Timestamp actual - se actualiza cada segundo para contadores precisos
    private val _currentTimeMillis = MutableStateFlow(System.currentTimeMillis())
    val currentTimeMillis: StateFlow<Long> = _currentTimeMillis
    
    // Evento para nuevo pedido (dispara sonido/vibración)
    private val _newOrderEvent = MutableSharedFlow<Int>()
    val newOrderEvent: SharedFlow<Int> = _newOrderEvent
    
    // Evento de impresión (para mostrar toast en la Activity)
    private val _printEvent = MutableSharedFlow<PrintEvent>()
    val printEvent: SharedFlow<PrintEvent> = _printEvent
    
    // IDs conocidos para detectar nuevos
    private var knownOrderIds = setOf<Int>()
    private var isFirstLoad = true
    
    // IDs ya impresos (para no reimprimir automáticamente)
    private var printedOrderIds = mutableSetOf<Int>()

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(ApiKeyInterceptor())
        .build()

    private var api: KitchenApiService = createApi()
    private var currentBaseUrl: String = BackendConfig.getBaseUrlForRetrofit()
    
    private fun createApi(): KitchenApiService {
        return Retrofit.Builder()
            .baseUrl(BackendConfig.getBaseUrlForRetrofit())
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(KitchenApiService::class.java)
    }
    
    /**
     * Reinicializa el cliente API si la URL cambió
     */
    fun reinitializeIfNeeded() {
        val newUrl = BackendConfig.getBaseUrlForRetrofit()
        if (currentBaseUrl != newUrl) {
            api = createApi()
            currentBaseUrl = newUrl
            refreshAll()
        }
    }

    init {
        startPolling()
        startTimeTicker()
    }

    private fun startPolling() {
        viewModelScope.launch {
            while (true) {
                reinitializeIfNeeded() // Verificar si la URL cambió
                refreshAll()
                delay(5000)
            }
        }
    }
    
    /**
     * Actualiza el timestamp cada segundo para contadores precisos
     */
    private fun startTimeTicker() {
        viewModelScope.launch {
            while (true) {
                _currentTimeMillis.value = System.currentTimeMillis()
                delay(1000)
            }
        }
    }

    fun refreshAll() {
        viewModelScope.launch {
            try {
                val pending = api.getOrders()
                val ready = api.getReadyOrders()
                
                // Detectar nuevos pedidos
                if (!isFirstLoad) {
                    val currentIds = pending.map { it.id }.toSet()
                    val newIds = currentIds - knownOrderIds
                    for (newId in newIds) {
                        _newOrderEvent.emit(newId)
                        
                        // Auto-imprimir si está habilitado y configurado
                        val newOrder = pending.find { it.id == newId }
                        if (newOrder != null && 
                            PrinterConfig.autoPrintKitchenTicket && 
                            PrinterConfig.isKitchenPrinterConfigured() &&
                            !printedOrderIds.contains(newId)) {
                            autoPrintOrder(newOrder)
                        }
                    }
                }
                
                // Actualizar IDs conocidos
                knownOrderIds = (pending.map { it.id } + ready.map { it.id }).toSet()
                isFirstLoad = false
                
                _orders.value = pending
                _readyOrders.value = ready
                _error.value = null
                _isConnected.value = true
            } catch (e: Exception) {
                _error.value = "No se pudieron cargar pedidos"
                _isConnected.value = false
            }
        }
    }
    
    /**
     * Auto-imprime un pedido nuevo en la impresora de cocina
     */
    private fun autoPrintOrder(order: KitchenOrderDto) {
        viewModelScope.launch {
            printOrder(order, isAutomatic = true)
        }
    }
    
    /**
     * Imprime (o reimprime) un pedido en la impresora de cocina
     */
    fun printOrder(order: KitchenOrderDto, isAutomatic: Boolean = false) {
        viewModelScope.launch {
            try {
                val kitchenData = KitchenTicketFormatter.KitchenTicketData(
                    orderId = order.id,
                    items = order.items.map { item ->
                        KitchenTicketFormatter.KitchenItem(
                            productName = item.product.name,
                            quantity = item.quantity,
                            extras = item.extras?.map { it.extraOption.name } ?: emptyList()
                        )
                    }
                )
                
                val ticketBytes = KitchenTicketFormatter.buildKitchenTicket(kitchenData)
                val result = BluetoothPrinterManager.printToKitchenWithResult(ticketBytes)
                
                if (result.isSuccess) {
                    printedOrderIds.add(order.id)
                    _printEvent.emit(PrintEvent.Success(order.id, isAutomatic))
                } else {
                    _printEvent.emit(PrintEvent.Error(order.id, result.toUserMessage()))
                }
            } catch (e: Exception) {
                _printEvent.emit(PrintEvent.Error(order.id, e.message ?: "Error desconocido"))
            }
        }
    }

    fun setKitchenStatus(orderId: Int, status: String) {
        viewModelScope.launch {
            try {
                api.updateKitchenStatus(orderId, UpdateKitchenStatusRequest(status))
                // refresco inmediato para que se mueva entre tabs
                refreshAll()
                _error.value = null
            } catch (e: Exception) {
                _error.value = "Error actualizando pedido #$orderId"
            }
        }
    }
}

/**
 * Eventos de impresión para notificar a la UI
 */
sealed class PrintEvent {
    data class Success(val orderId: Int, val isAutomatic: Boolean) : PrintEvent()
    data class Error(val orderId: Int, val message: String) : PrintEvent()
}
