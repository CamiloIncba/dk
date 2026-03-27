package com.norpan.kiosko.presentation.menu

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.norpan.kiosko.data.BackendConfig
import com.norpan.kiosko.data.remote.dto.CategoryDto
import com.norpan.kiosko.data.remote.dto.OrderItemExtraRequest
import com.norpan.kiosko.data.remote.dto.OrderItemWithExtrasRequest
import com.norpan.kiosko.data.remote.dto.ProductDto
import com.norpan.kiosko.data.remote.dto.ProductExtraGroupDto
import com.norpan.kiosko.data.repository.MenuRepository
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

/**
 * Eventos de UI que la Activity debe manejar
 */
sealed class MenuEvent {
    object OpenBackendSettings : MenuEvent()
    object OpenPrinterSettings : MenuEvent()
}

/**
 * Extra seleccionado para un item del carrito
 */
data class SelectedExtra(
    val optionId: Int,
    val optionName: String,
    val price: Double,
    val quantity: Int = 1
)

/**
 * Item del carrito con extras
 */
data class CartItem(
    val product: ProductDto,
    val quantity: Int,
    val extras: List<SelectedExtra> = emptyList(),
    // Key único para distinguir mismo producto con diferentes extras
    val cartKey: String = "${product.id}-${extras.map { "${it.optionId}:${it.quantity}" }.sorted().joinToString(",").ifEmpty { "noextras" }}"
) {
    val extrasTotal: Double get() = extras.sumOf { it.price * it.quantity }
    val itemTotal: Double get() = (product.price + extrasTotal) * quantity
}

data class MenuUiState(
    val isLoading: Boolean = false,
    val categories: List<CategoryDto> = emptyList(),
    val cartItems: List<CartItem> = emptyList(),
    val error: String? = null,

    // Estado de creación de orden / pago
    val isPlacingOrder: Boolean = false,
    val orderError: String? = null,

    // Pantalla de pago / QR
    val isInPayment: Boolean = false,
    val paymentOrderId: Int? = null,
    val paymentInitPoint: String? = null,
    val paymentTotal: Double? = null,
    val paymentStatus: String? = null, // "PAID", "CANCELLED", etc
    
    // Selección de método de pago
    val showPaymentMethodDialog: Boolean = false,
    val pendingOrderTotal: Double? = null,
    
    // Pago con terminal Point
    val isInPointPayment: Boolean = false,
    val pointDeviceId: String? = null,
    val pointIntentId: String? = null,
    val pointPaymentState: PointPaymentState = PointPaymentState.CreatingIntent,

    // Modal de extras
    val showExtrasModal: Boolean = false,
    val extrasModalProduct: ProductDto? = null,
    val extrasModalGroups: List<ProductExtraGroupDto> = emptyList(),
    val extrasModalLoading: Boolean = false,
    
    // Cache de productos que tienen extras (para mostrar indicador)
    val productsWithExtras: Set<Int> = emptySet()
)

class MenuViewModel(
    private val repository: MenuRepository = MenuRepository()
) : ViewModel() {

    private val _uiState = MutableStateFlow(MenuUiState(isLoading = true))
    val uiState: StateFlow<MenuUiState> = _uiState
    
    private val _events = MutableSharedFlow<MenuEvent>()
    val events: SharedFlow<MenuEvent> = _events

    init {
        loadMenu()
    }
    
    /**
     * Solicita abrir la pantalla de configuración del backend
     */
    fun openBackendSettings() {
        viewModelScope.launch {
            _events.emit(MenuEvent.OpenBackendSettings)
        }
    }

    /**
     * Solicita abrir la pantalla de configuración de impresoras
     */
    fun openPrinterSettings() {
        viewModelScope.launch {
            _events.emit(MenuEvent.OpenPrinterSettings)
        }
    }

    /**
     * Carga el menú solo si no hay un pedido/pago en curso.
     * Usado en onResume() para evitar perder el carrito o QR.
     */
    fun loadMenuIfIdle() {
        val state = _uiState.value
        // No recargar si:
        // - Hay items en el carrito
        // - Estamos en pantalla de pago QR
        // - Estamos en pago con Point
        // - Estamos creando una orden
        if (state.cartItems.isNotEmpty() || 
            state.isInPayment || 
            state.isInPointPayment ||
            state.isPlacingOrder ||
            state.showPaymentMethodDialog) {
            return
        }
        loadMenu()
    }

    fun loadMenu() {
        // Preservar carrito y estado de pago mientras se recarga el menú
        val currentState = _uiState.value
        _uiState.value = currentState.copy(isLoading = true, error = null)
        
        viewModelScope.launch {
            try {
                val response = repository.fetchMenu()
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    categories = response.categories,
                    error = null
                )
                // Cargar info de productos con extras en background
                checkProductsWithExtras(response.categories)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Error desconocido"
                )
            }
        }
    }

    /**
     * Verificar qué productos tienen extras configurados
     */
    private fun checkProductsWithExtras(categories: List<CategoryDto>) {
        viewModelScope.launch {
            val withExtras = mutableSetOf<Int>()
            for (category in categories) {
                for (product in category.products) {
                    try {
                        val extras = repository.getProductExtras(product.id)
                        if (extras.isNotEmpty()) {
                            withExtras.add(product.id)
                        }
                    } catch (_: Exception) {
                        // Ignorar errores
                    }
                }
            }
            _uiState.value = _uiState.value.copy(productsWithExtras = withExtras)
        }
    }

    /**
     * Cuando el usuario toca un producto
     */
    fun onProductClick(product: ProductDto) {
        if (_uiState.value.productsWithExtras.contains(product.id)) {
            // Mostrar modal de extras
            openExtrasModal(product)
        } else {
            // Agregar directo al carrito
            addToCartSimple(product)
        }
    }

    /**
     * Abrir modal de extras para un producto
     */
    private fun openExtrasModal(product: ProductDto) {
        _uiState.value = _uiState.value.copy(
            showExtrasModal = true,
            extrasModalProduct = product,
            extrasModalLoading = true,
            extrasModalGroups = emptyList()
        )
        
        viewModelScope.launch {
            try {
                val groups = repository.getProductExtras(product.id)
                _uiState.value = _uiState.value.copy(
                    extrasModalGroups = groups,
                    extrasModalLoading = false
                )
            } catch (e: Exception) {
                // Si falla, cerrar modal y agregar sin extras
                _uiState.value = _uiState.value.copy(
                    showExtrasModal = false,
                    extrasModalProduct = null,
                    extrasModalLoading = false
                )
                addToCartSimple(product)
            }
        }
    }

    fun closeExtrasModal() {
        _uiState.value = _uiState.value.copy(
            showExtrasModal = false,
            extrasModalProduct = null,
            extrasModalGroups = emptyList(),
            extrasModalLoading = false
        )
    }

    /**
     * Agregar al carrito con los extras seleccionados
     */
    fun addToCartWithExtras(product: ProductDto, extras: List<SelectedExtra>) {
        val cartKey = "${product.id}-${extras.map { "${it.optionId}:${it.quantity}" }.sorted().joinToString(",").ifEmpty { "noextras" }}"
        
        val current = _uiState.value.cartItems.toMutableList()
        val index = current.indexOfFirst { it.cartKey == cartKey }

        if (index >= 0) {
            val existing = current[index]
            current[index] = existing.copy(quantity = existing.quantity + 1)
        } else {
            current.add(CartItem(product = product, quantity = 1, extras = extras))
        }

        _uiState.value = _uiState.value.copy(
            cartItems = current,
            showExtrasModal = false,
            extrasModalProduct = null,
            extrasModalGroups = emptyList()
        )
    }

    /**
     * Agregar producto sin extras
     */
    private fun addToCartSimple(product: ProductDto) {
        addToCartWithExtras(product, emptyList())
    }

    @Deprecated("Use onProductClick instead")
    fun addToCart(product: ProductDto) {
        onProductClick(product)
    }

    fun removeOneFromCart(cartKey: String) {
        val current = _uiState.value.cartItems.toMutableList()
        val index = current.indexOfFirst { it.cartKey == cartKey }
        if (index >= 0) {
            val existing = current[index]
            if (existing.quantity > 1) {
                current[index] = existing.copy(quantity = existing.quantity - 1)
            } else {
                current.removeAt(index)
            }
            _uiState.value = _uiState.value.copy(cartItems = current)
        }
    }

    fun clearCart() {
        _uiState.value = _uiState.value.copy(cartItems = emptyList())
    }

    fun getCartTotal(): Double {
        return _uiState.value.cartItems.sumOf { it.itemTotal }
    }

    fun getCartItemCount(): Int {
        return _uiState.value.cartItems.sumOf { it.quantity }
    }

    /**
     * Muestra el diálogo de selección de método de pago.
     * Alias para compatibilidad con código existente.
     */
    fun placeOrder() {
        showPaymentMethodSelection()
    }
    
    /**
     * Muestra el diálogo de selección de método de pago
     */
    fun showPaymentMethodSelection() {
        val currentCart = _uiState.value.cartItems
        if (currentCart.isEmpty()) return
        
        val total = currentCart.sumOf { it.itemTotal }
        _uiState.value = _uiState.value.copy(
            showPaymentMethodDialog = true,
            pendingOrderTotal = total
        )
    }
    
    /**
     * Oculta el diálogo de selección de método de pago
     */
    fun dismissPaymentMethodDialog() {
        _uiState.value = _uiState.value.copy(
            showPaymentMethodDialog = false,
            pendingOrderTotal = null
        )
    }
    
    /**
     * Procede con el método de pago seleccionado
     */
    fun proceedWithPaymentMethod(method: PaymentMethod) {
        dismissPaymentMethodDialog()
        when (method) {
            PaymentMethod.QR -> placeOrderWithQr()
            PaymentMethod.CARD -> placeOrderWithPoint()
        }
    }

    /**
     * Crea la orden y la preferencia de pago de Mercado Pago (QR).
     * Luego pasa la UI a la pantalla de pago y arranca el polling del estado.
     */
    private fun placeOrderWithQr(note: String? = null) {
        val currentCart = _uiState.value.cartItems
        if (currentCart.isEmpty()) {
            return
        }

        val total = currentCart.sumOf { it.itemTotal }

        _uiState.value = _uiState.value.copy(
            isPlacingOrder = true,
            orderError = null
        )

        viewModelScope.launch {
            try {
                // Convertir carrito a formato de API con extras
                val items = currentCart.map { item ->
                    OrderItemWithExtrasRequest(
                        productId = item.product.id,
                        quantity = item.quantity,
                        extras = if (item.extras.isNotEmpty()) {
                            item.extras.map { extra ->
                                OrderItemExtraRequest(
                                    optionId = extra.optionId,
                                    quantity = extra.quantity
                                )
                            }
                        } else null
                    )
                }

                // 1) Crear orden con extras
                val orderResponse = repository.createOrderWithExtras(items, note)

                // 2) Intentar crear QR nativo (kiosk) primero, sino usar checkout
                var qrContent: String
                try {
                    // QR Kiosko (nativo de MP, escaneable directo con billeteras)
                    val kioskQr = repository.createKioskQr(orderResponse.id)
                    if (kioskQr.success && !kioskQr.qrData.isNullOrBlank()) {
                        qrContent = kioskQr.qrData
                    } else {
                        // Fallback a checkout pro (URL web)
                        val mpQr = repository.createMpQr(orderResponse.id)
                        qrContent = mpQr.initPoint
                    }
                } catch (e: Exception) {
                    // Fallback a checkout pro si falla el kiosk
                    val mpQr = repository.createMpQr(orderResponse.id)
                    qrContent = mpQr.initPoint
                }

                // 3) Actualizar estado → pantalla de pago
                // NO vaciamos el carrito aquí, solo cuando el pago sea exitoso
                _uiState.value = _uiState.value.copy(
                    isPlacingOrder = false,
                    isInPayment = true,
                    paymentOrderId = orderResponse.id,
                    paymentInitPoint = qrContent,
                    paymentTotal = total,
                    paymentStatus = null
                )

                // 4) Empezar a observar el estado de la orden con polling rápido
                observePaymentStatus(orderResponse.id)
            } catch (e: Exception) {
                val baseUrl = BackendConfig.getBaseUrl()
                val errorMsg = when {
                    e.message?.contains("404") == true -> "HTTP 404 - Endpoint no encontrado en $baseUrl"
                    e.message?.contains("Unable to resolve host") == true -> "No se puede conectar a $baseUrl"
                    e.message?.contains("timeout") == true -> "Timeout conectando a $baseUrl"
                    e.message?.contains("Connection refused") == true -> "Servidor no disponible en $baseUrl"
                    else -> "${e.message} ($baseUrl)"
                }
                _uiState.value = _uiState.value.copy(
                    isPlacingOrder = false,
                    orderError = errorMsg
                )
            }
        }
    }

    /**
     * 👉 Nuevo:
     * Reanudar pago para una orden EXISTENTE (desde el panel admin).
     *
     * No crea orden nueva, sólo genera un nuevo QR para el orderId dado
     * y salta directo a PaymentScreen.
     */
    fun resumePayment(orderId: Int, total: Double) {
        _uiState.value = _uiState.value.copy(
            isPlacingOrder = true,
            orderError = null
        )

        viewModelScope.launch {
            try {
                // Intentar QR nativo kiosk primero, sino checkout
                var qrContent: String
                try {
                    val kioskQr = repository.createKioskQr(orderId)
                    if (kioskQr.success && !kioskQr.qrData.isNullOrBlank()) {
                        qrContent = kioskQr.qrData
                    } else {
                        val mpQr = repository.createMpQr(orderId)
                        qrContent = mpQr.initPoint
                    }
                } catch (e: Exception) {
                    val mpQr = repository.createMpQr(orderId)
                    qrContent = mpQr.initPoint
                }

                _uiState.value = _uiState.value.copy(
                    isPlacingOrder = false,
                    cartItems = emptyList(), // el carrito ya no importa en este flujo
                    isInPayment = true,
                    paymentOrderId = orderId,
                    paymentInitPoint = qrContent,
                    paymentTotal = total,
                    paymentStatus = null
                )

                observePaymentStatus(orderId)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isPlacingOrder = false,
                    orderError = e.message ?: "Error al reanudar el pago"
                )
            }
        }
    }

    /**
     * Polling optimizado para el Kiosko.
     * Usa el endpoint específico del kiosko que es más eficiente.
     * Polling cada 3 segundos para respuesta más rápida.
     */
    private fun observeKioskPaymentStatus(orderId: Int) {
        viewModelScope.launch {
            val maxAttempts = 100 // 100 * 3s = 5 minutos
            var attempts = 0

            while (attempts < maxAttempts) {
                delay(3000) // Polling más frecuente para kiosko
                attempts++

                val current = _uiState.value

                // Si el usuario ya salió de la pantalla de pago o cambió la orden, cortamos.
                if (!current.isInPayment || current.paymentOrderId != orderId) {
                    // Limpiar el QR del kiosko al salir
                    try { repository.deleteKioskQr() } catch (_: Exception) {}
                    break
                }

                try {
                    val status = repository.checkKioskPayment(orderId)

                    when {
                        status.paid -> {
                            _uiState.value = _uiState.value.copy(
                                paymentStatus = "PAID"
                            )
                            // En PAID sí cortamos el loop.
                            break
                        }

                        status.status == "PAYMENT_FAILED" -> {
                            // Pago rechazado, pero podemos reintentar
                            _uiState.value = _uiState.value.copy(
                                paymentStatus = "CANCELLED"
                            )
                            // NO cortamos - el cliente puede reintentar
                        }

                        !status.shouldRetry -> {
                            // No debería reintentar (orden no encontrada, etc)
                            break
                        }

                        // else: PENDING, seguir polling
                    }
                } catch (_: Exception) {
                    // Error de red - seguir reintentando
                }
            }
        }
    }

    /**
     * Polling del estado del pago consultando directamente a Mercado Pago.
     * Polling cada 3 segundos para respuesta más rápida.
     */
    private fun observePaymentStatus(orderId: Int) {
        viewModelScope.launch {
            val maxAttempts = 100 // 100 * 3s = 5 minutos
            var attempts = 0

            while (attempts < maxAttempts) {
                delay(3000) // Polling más frecuente
                attempts++

                val current = _uiState.value

                // Si el usuario ya salió de la pantalla de pago o cambió la orden, cortamos.
                if (!current.isInPayment || current.paymentOrderId != orderId) {
                    break
                }

                try {
                    // Consulta directamente a Mercado Pago para verificar el pago
                    val paymentStatus = repository.checkKioskPayment(orderId)
                    
                    if (paymentStatus.paid) {
                        // Pago exitoso: ahora sí vaciamos el carrito
                        _uiState.value = _uiState.value.copy(
                            paymentStatus = "PAID",
                            cartItems = emptyList()
                        )
                        // En PAID sí cortamos el loop.
                        break
                    }
                    
                    // Si el status indica que no hay que reintentar (ej: cancelado)
                    if (!paymentStatus.shouldRetry) {
                        _uiState.value = _uiState.value.copy(
                            paymentStatus = "CANCELLED"
                        )
                        // No cortamos para permitir reintentos
                    }
                } catch (_: Exception) {
                    // Podríamos loguear, pero para el tótem es mejor ignorar y reintentar.
                }
            }
        }
    }

    fun exitPayment() {
        // Limpiar el QR del kiosko al salir
        viewModelScope.launch {
            try { repository.deleteKioskQr() } catch (_: Exception) {}
        }
        
        _uiState.value = _uiState.value.copy(
            isInPayment = false,
            paymentOrderId = null,
            paymentInitPoint = null,
            paymentTotal = null,
            paymentStatus = null
        )
    }
    
    /**
     * Cambia de método de pago desde QR.
     * Cancela el pago QR actual y vuelve a mostrar el diálogo de selección.
     * Solo disponible si el pago aún no fue confirmado.
     */
    fun changePaymentMethodFromQr() {
        val orderId = _uiState.value.paymentOrderId
        val total = _uiState.value.paymentTotal
        
        // Limpiar el QR del kiosko
        viewModelScope.launch {
            try { repository.deleteKioskQr() } catch (_: Exception) {}
        }
        
        // Volver al diálogo de selección de método
        _uiState.value = _uiState.value.copy(
            isInPayment = false,
            paymentInitPoint = null,
            paymentStatus = null,
            showPaymentMethodDialog = true,
            pendingOrderTotal = total
        )
    }
    
    // ============================================================
    // FLUJO DE PAGO CON TERMINAL POINT
    // ============================================================
    
    /**
     * Crea la orden y envía intención de pago a la terminal Point.
     * Luego hace polling del estado hasta que se complete o cancele.
     */
    private fun placeOrderWithPoint(note: String? = null) {
        val currentCart = _uiState.value.cartItems
        if (currentCart.isEmpty()) return
        
        val total = currentCart.sumOf { it.itemTotal }
        
        _uiState.value = _uiState.value.copy(
            isPlacingOrder = true,
            orderError = null
        )
        
        viewModelScope.launch {
            try {
                // 1) Convertir carrito a formato de API
                val items = currentCart.map { item ->
                    OrderItemWithExtrasRequest(
                        productId = item.product.id,
                        quantity = item.quantity,
                        extras = if (item.extras.isNotEmpty()) {
                            item.extras.map { extra ->
                                OrderItemExtraRequest(
                                    optionId = extra.optionId,
                                    quantity = extra.quantity
                                )
                            }
                        } else null
                    )
                }
                
                // 2) Crear orden
                val orderResponse = repository.createOrderWithExtras(items, note)
                
                // 3) Obtener dispositivos Point disponibles
                val devices = repository.getPointDevices()
                if (devices.isEmpty()) {
                    _uiState.value = _uiState.value.copy(
                        isPlacingOrder = false,
                        orderError = "No hay terminales Point disponibles. Verifique la configuración."
                    )
                    return@launch
                }
                
                // Usar el primer dispositivo disponible
                val deviceId = devices.first().id
                
                // 3.5) NUEVO: Limpiar el Point antes de crear nuevo intent
                // Esto soluciona el problema de desincronización cuando:
                // - El Point mostró timeout/error pero el kiosko no se enteró
                // - Quedó un intent previo "colgado"
                try {
                    val clearResult = repository.clearPointDevice(deviceId)
                    if (clearResult != null && !clearResult.deviceStatus.available) {
                        android.util.Log.w("MenuViewModel", "Point ocupado después de clear: ${clearResult.cleanupResult.message}")
                        // El Point sigue ocupado, pero intentamos crear el intent de todas formas
                        // Si falla, el error se manejará más abajo
                    }
                } catch (e: Exception) {
                    android.util.Log.w("MenuViewModel", "Error en clearPointDevice: ${e.message}")
                    // Ignorar y continuar - el intento de crear intent mostrará error más claro
                }
                
                // 4) Crear intención de pago en el Point
                val intentResponse = repository.createPointIntent(
                    orderId = orderResponse.id,
                    deviceId = deviceId,
                    description = "Pedido #${orderResponse.id}"
                )
                
                // 5) Actualizar estado → pantalla de pago Point
                // NO vaciamos el carrito aquí, solo cuando el pago sea exitoso
                _uiState.value = _uiState.value.copy(
                    isPlacingOrder = false,
                    isInPointPayment = true,
                    paymentOrderId = orderResponse.id,
                    paymentTotal = total,
                    pointDeviceId = deviceId,
                    pointIntentId = intentResponse.intentId,
                    pointPaymentState = PointPaymentState.WaitingForCard
                )
                
                // 6) Empezar polling del estado del Point
                observePointPaymentStatus(orderResponse.id, deviceId, intentResponse.intentId)
                
            } catch (e: Exception) {
                val baseUrl = BackendConfig.getBaseUrl()
                val errorMsg = when {
                    e.message?.contains("device_busy") == true -> "La terminal Point está ocupada. Intente de nuevo en unos segundos."
                    e.message?.contains("device_not_found") == true -> "No se encontró la terminal Point."
                    e.message?.contains("404") == true -> "HTTP 404 - Endpoint no encontrado en $baseUrl"
                    e.message?.contains("Unable to resolve host") == true -> "No se puede conectar a $baseUrl"
                    e.message?.contains("timeout") == true -> "Timeout conectando a $baseUrl"
                    e.message?.contains("Connection refused") == true -> "Servidor no disponible en $baseUrl"
                    else -> "${e.message} ($baseUrl)"
                }
                _uiState.value = _uiState.value.copy(
                    isPlacingOrder = false,
                    orderError = errorMsg
                )
            }
        }
    }
    
    /**
     * Polling del estado del pago en la terminal Point.
     * Verifica cada 2 segundos si el cliente pasó la tarjeta.
     */
    private fun observePointPaymentStatus(orderId: Int, deviceId: String, intentId: String) {
        viewModelScope.launch {
            var attempts = 0
            val maxAttempts = 90 // 3 minutos máximo (90 * 2 segundos)
            
            while (attempts < maxAttempts) {
                delay(2000) // Polling cada 2 segundos
                attempts++
                
                val current = _uiState.value
                
                // Si el usuario salió de la pantalla de pago Point, cortamos
                if (!current.isInPointPayment || current.paymentOrderId != orderId) {
                    break
                }
                
                try {
                    val status = repository.getPointIntentStatus(deviceId, intentId)
                    
                    when (status.state) {
                        "FINISHED" -> {
                            // El cliente pasó la tarjeta, ahora procesamos
                            _uiState.value = _uiState.value.copy(
                                pointPaymentState = PointPaymentState.Processing
                            )
                            
                            // Procesar el resultado en el backend
                            val processResult = repository.processPointPayment(orderId, deviceId, intentId)
                            
                            if (processResult.success) {
                                // Pago exitoso: ahora sí vaciamos el carrito
                                _uiState.value = _uiState.value.copy(
                                    pointPaymentState = PointPaymentState.Paid,
                                    cartItems = emptyList()
                                )
                            } else {
                                _uiState.value = _uiState.value.copy(
                                    pointPaymentState = PointPaymentState.Error(
                                        processResult.message ?: "Error al procesar el pago"
                                    )
                                )
                            }
                            break
                        }
                        
                        "CANCELED" -> {
                            val reason = status.cancellation?.reason ?: "Cancelado por el usuario"
                            _uiState.value = _uiState.value.copy(
                                pointPaymentState = PointPaymentState.Cancelled(reason)
                            )
                            break
                        }
                        
                        "PROCESSING" -> {
                            _uiState.value = _uiState.value.copy(
                                pointPaymentState = PointPaymentState.Processing
                            )
                        }
                        
                        "OPEN" -> {
                            // Todavía esperando la tarjeta
                            _uiState.value = _uiState.value.copy(
                                pointPaymentState = PointPaymentState.WaitingForCard
                            )
                        }
                        
                        "ERROR" -> {
                            _uiState.value = _uiState.value.copy(
                                pointPaymentState = PointPaymentState.Error("Error en la terminal")
                            )
                            break
                        }
                    }
                } catch (e: Exception) {
                    // Ignorar errores de red y seguir intentando
                    android.util.Log.w("MenuViewModel", "Error polling Point status: ${e.message}")
                }
            }
            
            // Si llegamos al límite de intentos sin resultado
            if (attempts >= maxAttempts) {
                _uiState.value = _uiState.value.copy(
                    pointPaymentState = PointPaymentState.Timeout
                )
            }
        }
    }
    
    /**
     * Reintenta el pago con Point para la orden actual
     */
    fun retryPointPayment() {
        val orderId = _uiState.value.paymentOrderId ?: return
        val deviceId = _uiState.value.pointDeviceId ?: return
        val total = _uiState.value.paymentTotal ?: return
        
        viewModelScope.launch {
            try {
                // Cancelar intento anterior si existe
                _uiState.value.pointIntentId?.let { intentId ->
                    try {
                        repository.cancelPointIntent(deviceId, intentId)
                    } catch (_: Exception) { }
                }
                
                // Crear nuevo intento
                _uiState.value = _uiState.value.copy(
                    pointPaymentState = PointPaymentState.CreatingIntent
                )
                
                val intentResponse = repository.createPointIntent(
                    orderId = orderId,
                    deviceId = deviceId,
                    description = "Pedido #$orderId"
                )
                
                _uiState.value = _uiState.value.copy(
                    pointIntentId = intentResponse.intentId,
                    pointPaymentState = PointPaymentState.WaitingForCard
                )
                
                // Reiniciar polling
                observePointPaymentStatus(orderId, deviceId, intentResponse.intentId)
                
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    pointPaymentState = PointPaymentState.Error(
                        e.message ?: "Error al reintentar el pago"
                    )
                )
            }
        }
    }
    
    /**
     * Salir del flujo de pago Point y volver al menú.
     * Intenta cancelar el intent activo y limpiar el dispositivo.
     */
    fun exitPointPayment() {
        val deviceId = _uiState.value.pointDeviceId
        val intentId = _uiState.value.pointIntentId
        
        // Cancelar el intento y limpiar el dispositivo en segundo plano
        if (deviceId != null) {
            viewModelScope.launch {
                try {
                    // 1. Si hay un intent conocido, intentar cancelarlo
                    if (intentId != null) {
                        repository.cancelPointIntent(deviceId, intentId)
                    }
                    // 2. Limpiar el dispositivo por si quedó algo pendiente
                    repository.clearPointDevice(deviceId)
                } catch (_: Exception) { }
            }
        }
        
        _uiState.value = _uiState.value.copy(
            isInPointPayment = false,
            paymentOrderId = null,
            paymentTotal = null,
            pointDeviceId = null,
            pointIntentId = null,
            pointPaymentState = PointPaymentState.CreatingIntent
        )
    }
    
    /**
     * Cambia de método de pago desde Point.
     * Cancela el intento Point actual y vuelve a mostrar el diálogo de selección.
     * Solo disponible si está esperando tarjeta o creando intento.
     */
    fun changePaymentMethodFromPoint() {
        val deviceId = _uiState.value.pointDeviceId
        val intentId = _uiState.value.pointIntentId
        val orderId = _uiState.value.paymentOrderId
        val total = _uiState.value.paymentTotal
        
        // Cancelar el intento Point y limpiar el dispositivo en segundo plano
        if (deviceId != null) {
            viewModelScope.launch {
                try {
                    if (intentId != null) {
                        repository.cancelPointIntent(deviceId, intentId)
                    }
                    repository.clearPointDevice(deviceId)
                } catch (_: Exception) { }
            }
        }
        
        // Volver al diálogo de selección de método
        _uiState.value = _uiState.value.copy(
            isInPointPayment = false,
            pointDeviceId = null,
            pointIntentId = null,
            pointPaymentState = PointPaymentState.CreatingIntent,
            showPaymentMethodDialog = true,
            pendingOrderTotal = total
        )
    }
}
