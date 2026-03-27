package com.norpan.kiosko.data.repository

import com.norpan.kiosko.data.remote.ApiClient
import com.norpan.kiosko.data.remote.dto.CreateMpQrRequest
import com.norpan.kiosko.data.remote.dto.CreateOrderRequest
import com.norpan.kiosko.data.remote.dto.CreateOrderWithExtrasRequest
import com.norpan.kiosko.data.remote.dto.CreatePointIntentRequest
import com.norpan.kiosko.data.remote.dto.KioskPaymentStatusResponse
import com.norpan.kiosko.data.remote.dto.KioskPosQrResponse
import com.norpan.kiosko.data.remote.dto.KioskQrResponse
import com.norpan.kiosko.data.remote.dto.MenuResponse
import com.norpan.kiosko.data.remote.dto.MpQrResponse
import com.norpan.kiosko.data.remote.dto.OrderItemRequest
import com.norpan.kiosko.data.remote.dto.OrderItemWithExtrasRequest
import com.norpan.kiosko.data.remote.dto.OrderResponse
import com.norpan.kiosko.data.remote.dto.PointClearResponse
import com.norpan.kiosko.data.remote.dto.PointDeviceResponse
import com.norpan.kiosko.data.remote.dto.PointIntentResponse
import com.norpan.kiosko.data.remote.dto.PointIntentStatusResponse
import com.norpan.kiosko.data.remote.dto.ProcessPointPaymentRequest
import com.norpan.kiosko.data.remote.dto.ProcessPointPaymentResponse
import com.norpan.kiosko.data.remote.dto.ProductExtraGroupDto

class MenuRepository {

    // Usar getters dinámicos para que siempre obtengan la referencia actual
    // después de reinitialize() cuando cambia la URL del backend
    private val menuApi get() = ApiClient.menuApi
    private val ordersApi get() = ApiClient.ordersApi
    private val paymentsApi get() = ApiClient.paymentsApi

    suspend fun fetchMenu(): MenuResponse {
        return menuApi.getMenu()
    }

    suspend fun getProductExtras(productId: Int): List<ProductExtraGroupDto> {
        return menuApi.getProductExtras(productId)
    }

    suspend fun createOrder(
        items: List<Pair<Int, Int>>,
        note: String? = null
    ): OrderResponse {
        val orderItems = items.map { (productId, quantity) ->
            OrderItemRequest(
                productId = productId,
                quantity = quantity
            )
        }

        val request = CreateOrderRequest(
            items = orderItems,
            note = note
        )

        return ordersApi.createOrder(request)
    }

    suspend fun createOrderWithExtras(
        items: List<OrderItemWithExtrasRequest>,
        note: String? = null
    ): OrderResponse {
        val request = CreateOrderWithExtrasRequest(
            items = items,
            note = note
        )
        return ordersApi.createOrderWithExtras(request)
    }

    /**
     * @deprecated Usar createKioskQr para el kiosko
     */
    suspend fun createMpQr(orderId: Int): MpQrResponse {
        val request = CreateMpQrRequest(orderId = orderId)
        return paymentsApi.createMpQr(request)
    }

    // ============================================================
    // Nuevos métodos para QR Kiosko (estático)
    // ============================================================

    /**
     * Monta una orden en el QR estático del Kiosko.
     * El cliente escanea el QR físico del kiosko y paga.
     */
    suspend fun createKioskQr(orderId: Int): KioskQrResponse {
        val request = CreateMpQrRequest(orderId = orderId)
        return paymentsApi.createKioskOrder(request)
    }

    /**
     * Limpia la orden del QR del Kiosko (para cancelar)
     */
    suspend fun deleteKioskQr(): Boolean {
        return try {
            val result = paymentsApi.deleteKioskOrder()
            result["deleted"] == true
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Obtiene el QR del POS del Kiosko para imprimir una sola vez.
     */
    suspend fun getKioskPosQr(): KioskPosQrResponse {
        return paymentsApi.getKioskQr()
    }

    /**
     * Verifica el estado del pago para el Kiosko.
     * Más eficiente que el polling genérico.
     */
    suspend fun checkKioskPayment(orderId: Int): KioskPaymentStatusResponse {
        return paymentsApi.checkKioskPayment(orderId)
    }

    suspend fun getOrder(orderId: Int): OrderResponse {
        return ordersApi.getOrder(orderId)
    }
    
    // ============================================================
    // Terminal Point (cobro con tarjeta de débito/crédito)
    // ============================================================
    
    /**
     * Obtiene los dispositivos Point vinculados a la cuenta
     */
    suspend fun getPointDevices(): List<PointDeviceResponse> {
        return paymentsApi.getPointDevices()
    }
    
    /**
     * Crea una intención de pago en la terminal Point
     */
    suspend fun createPointIntent(
        orderId: Int,
        deviceId: String,
        description: String? = null
    ): PointIntentResponse {
        val request = CreatePointIntentRequest(
            orderId = orderId,
            deviceId = deviceId,
            description = description
        )
        return paymentsApi.createPointIntent(request)
    }
    
    /**
     * Consulta el estado de una intención de pago Point
     */
    suspend fun getPointIntentStatus(
        deviceId: String,
        intentId: String
    ): PointIntentStatusResponse {
        return paymentsApi.getPointIntentStatus(deviceId, intentId)
    }
    
    /**
     * Procesa el resultado del pago Point y actualiza la orden
     */
    suspend fun processPointPayment(
        orderId: Int,
        deviceId: String,
        intentId: String
    ): ProcessPointPaymentResponse {
        val request = ProcessPointPaymentRequest(
            orderId = orderId,
            deviceId = deviceId,
            intentId = intentId
        )
        return paymentsApi.processPointPayment(request)
    }
    
    /**
     * Cancela una intención de pago en la terminal Point
     */
    suspend fun cancelPointIntent(
        deviceId: String,
        intentId: String
    ): Boolean {
        return try {
            val result = paymentsApi.cancelPointIntent(deviceId, intentId)
            result["canceled"] == true
        } catch (e: Exception) {
            false
        }
    }
    
    /**
     * Limpia/resetea el dispositivo Point.
     * Útil para sincronizar cuando el kiosko y el Point se dessincronizan.
     * 
     * @return PointClearResponse con el estado del dispositivo y resultado de limpieza
     */
    suspend fun clearPointDevice(deviceId: String): PointClearResponse? {
        return try {
            paymentsApi.clearPointDevice(deviceId)
        } catch (e: Exception) {
            android.util.Log.e("MenuRepository", "Error limpiando Point: ${e.message}")
            null
        }
    }
}
