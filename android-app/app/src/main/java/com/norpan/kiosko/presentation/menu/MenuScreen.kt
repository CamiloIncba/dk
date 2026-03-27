package com.norpan.kiosko.presentation.menu

import android.graphics.Bitmap
import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.norpan.kiosko.data.remote.ApiClient
import com.norpan.kiosko.data.remote.dto.AdminOrderDto
import com.norpan.kiosko.data.remote.dto.CategoryDto
import com.norpan.kiosko.data.remote.dto.OrderResponse
import com.norpan.kiosko.data.remote.dto.ProductDto
import com.norpan.kiosko.printing.BluetoothPrinterManager
import com.norpan.kiosko.printing.TicketFormatter
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun MenuScreen(
    viewModel: MenuViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()

    // Guard de inactividad para la pantalla principal (carrito)
    var showInactivityDialog by remember { mutableStateOf(false) }
    var inactivityCountdown by remember { mutableIntStateOf(0) }
    var inactivityDialogSession by remember { mutableIntStateOf(0) }

    // Clave para reiniciar el timer incluso si el carrito no cambia (ej: usuario tocó "Seguir aquí")
    var inactivityTimerSeed by remember { mutableIntStateOf(0) }

    // Estado del menú secreto
    var secretTapCount by remember { mutableIntStateOf(0) }
    var showAdminPinDialog by remember { mutableStateOf(false) }
    var showAdminPanel by remember { mutableStateOf(false) }

    // Timer de inactividad: se resetea cuando:
    // - cambia el carrito
    // - cambia isInPayment
    // - cambiamos manualmente inactivityTimerSeed
    LaunchedEffect(state.cartItems, state.isInPayment, inactivityTimerSeed) {
        showInactivityDialog = false
        inactivityCountdown = 0

        // Sólo aplicamos guard cuando NO estamos en pantalla de pago
        if (!state.isInPayment && state.cartItems.isNotEmpty()) {
            val timeoutMillis = 90_000L // 1.5 minutos
            delay(timeoutMillis)

            // Verificamos de nuevo, por si en el medio cambió algo
            if (!state.isInPayment && state.cartItems.isNotEmpty()) {
                inactivityCountdown = 15
                showInactivityDialog = true
                inactivityDialogSession++
            }
        }
    }

    // Countdown interno del popup: si llega a 0 sin interacción → cancelar pedido
    LaunchedEffect(inactivityDialogSession) {
        if (showInactivityDialog && inactivityCountdown > 0) {
            while (inactivityCountdown > 0 && showInactivityDialog) {
                delay(1000)
                inactivityCountdown--
            }
            if (showInactivityDialog && inactivityCountdown <= 0) {
                // Nadie tocó nada → limpiamos carrito
                showInactivityDialog = false
                viewModel.clearCart()
            }
        }
    }

    Surface(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.fillMaxSize()) {

            // Valores locales para evitar smart cast issues
            val paymentOrderId = state.paymentOrderId
            val paymentInitPoint = state.paymentInitPoint

            // Si estamos en flujo de pago → mostramos PaymentScreen
            if (state.isInPayment &&
                paymentOrderId != null &&
                paymentInitPoint != null
            ) {
                PaymentScreen(
                    orderId = paymentOrderId,
                    total = state.paymentTotal,
                    initPoint = paymentInitPoint,
                    paymentStatus = state.paymentStatus,
                    onCancel = {
                        // Volver al menú / nuevo pedido
                        viewModel.exitPayment()
                    }
                )
            } else {
                // Pantalla principal de menú y carrito
                MenuContent(
                    state = state,
                    productsWithExtras = state.productsWithExtras,
                    onProductClick = { viewModel.onProductClick(it) },
                    onRemoveFromCart = { cartKey -> viewModel.removeOneFromCart(cartKey) },
                    onReload = { viewModel.loadMenu() },
                    onProceedToPayment = {
                        // Este llamado dispara la creación de la orden y el flujo de pago
                        viewModel.placeOrder()
                    }
                )
            }

            // Modal de selección de extras
            val extrasModalProduct = state.extrasModalProduct
            if (state.showExtrasModal && extrasModalProduct != null) {
                ExtrasSelectionDialog(
                    product = extrasModalProduct,
                    extraGroups = state.extrasModalGroups,
                    isLoading = state.extrasModalLoading,
                    onConfirm = { selectedExtras ->
                        viewModel.addToCartWithExtras(extrasModalProduct, selectedExtras)
                    },
                    onDismiss = { viewModel.closeExtrasModal() }
                )
            }

            // Hotspot invisible para abrir menú secreto (esquina superior derecha)
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(4.dp)
                    .size(80.dp)
                    .clickable {
                        secretTapCount++
                        if (secretTapCount >= 8) {
                            secretTapCount = 0
                            showAdminPinDialog = true
                        }
                    }
            ) {
                // No dibujamos nada visible
            }

            // Popup de inactividad para la pantalla principal (carrito)
            if (showInactivityDialog && !state.isInPayment && state.cartItems.isNotEmpty()) {
                AlertDialog(
                    onDismissRequest = {
                        // Si toca afuera, asumimos que quiere seguir
                        showInactivityDialog = false
                        inactivityCountdown = 0
                        inactivityTimerSeed++ // reiniciamos timer
                    },
                    title = {
                        Text(text = "¿Seguís ahí?")
                    },
                    text = {
                        Text(
                            text =
                            "Hay un pedido iniciado hace un rato.\n" +
                                "Si no confirmás, el kiosko se reiniciará en ${inactivityCountdown}s.\n\n" +
                                "¿Querés seguir armando este pedido o lo cancelamos?"
                        )
                    },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                showInactivityDialog = false
                                inactivityCountdown = 0
                                inactivityTimerSeed++ // vuelve a arrancar el ciclo de inactividad
                            }
                        ) {
                            Text("Seguir aquí")
                        }
                    },
                    dismissButton = {
                        TextButton(
                            onClick = {
                                showInactivityDialog = false
                                inactivityCountdown = 0
                                viewModel.clearCart()
                            }
                        ) {
                            Text("Cancelar pedido")
                        }
                    }
                )
            }

            // Diálogo de PIN para menú secreto
            if (showAdminPinDialog) {
                AdminPinDialog(
                    onSuccess = {
                        showAdminPinDialog = false
                        showAdminPanel = true
                    },
                    onCancel = {
                        showAdminPinDialog = false
                    }
                )
            }

            // Panel admin REAL: conectado al backend + items de cada pedido
            if (showAdminPanel) {
                AdminPanelDialog(
                    onClose = { showAdminPanel = false },
                    onResumePayment = { orderId, total ->
                        viewModel.resumePayment(orderId, total)
                        showAdminPanel = false
                    },
                    onOpenSettings = {
                        showAdminPanel = false
                        viewModel.openBackendSettings()
                    }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun MenuContent(
    state: MenuUiState,
    productsWithExtras: Set<Int>,
    onProductClick: (ProductDto) -> Unit,
    onRemoveFromCart: (String) -> Unit,
    onReload: () -> Unit,
    onProceedToPayment: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = "Kiosko NORPAN",
                        style = MaterialTheme.typography.titleLarge
                    )
                }
            )
        },
        bottomBar = {
            CartSummaryBar(
                state = state,
                onProceedToPayment = onProceedToPayment,
                onRemoveFromCart = onRemoveFromCart
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when {
                state.isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }

                state.error != null -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Text(
                            text = "Hubo un problema cargando el menú.",
                            style = MaterialTheme.typography.titleMedium,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = state.error,
                            style = MaterialTheme.typography.bodyMedium,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = onReload) {
                            Text("Reintentar")
                        }
                    }
                }

                else -> {
                    if (state.categories.isEmpty()) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "No hay productos disponibles.",
                                style = MaterialTheme.typography.titleMedium
                            )
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 16.dp, vertical = 8.dp)
                        ) {
                            items(state.categories) { category ->
                                CategorySection(
                                    category = category,
                                    cartItems = state.cartItems,
                                    productsWithExtras = productsWithExtras,
                                    onProductClick = onProductClick,
                                    onRemoveFromCart = onRemoveFromCart
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CategorySection(
    category: CategoryDto,
    cartItems: List<CartItem>,
    productsWithExtras: Set<Int>,
    onProductClick: (ProductDto) -> Unit,
    onRemoveFromCart: (String) -> Unit
) {
    Column {
        Text(
            text = category.name,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(vertical = 4.dp)
        )

        Spacer(modifier = Modifier.height(4.dp))

        category.products.forEach { product ->
            // Agrupar items del carrito por producto (pueden haber varios con diferentes extras)
            val productCartItems = cartItems.filter { it.product.id == product.id }
            val totalQuantity = productCartItems.sumOf { it.quantity }
            val hasExtras = productsWithExtras.contains(product.id)

            ProductRow(
                product = product,
                quantityInCart = totalQuantity,
                hasExtras = hasExtras,
                onProductClick = { onProductClick(product) },
                onRemoveFromCart = {
                    // Remover del último item añadido
                    productCartItems.lastOrNull()?.let { onRemoveFromCart(it.cartKey) }
                }
            )
            androidx.compose.material3.Divider(modifier = Modifier.padding(vertical = 4.dp))
        }
    }
}

@Composable
private fun ProductRow(
    product: ProductDto,
    quantityInCart: Int,
    hasExtras: Boolean,
    onProductClick: () -> Unit,
    onRemoveFromCart: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onProductClick() },
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = product.name,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium
                    )
                    if (hasExtras) {
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Personalizable",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
                product.description?.let {
                    if (it.isNotBlank()) {
                        Spacer(modifier = Modifier.height(2.dp))
                        Text(
                            text = it,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "$ ${product.price}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (quantityInCart > 0) {
                    IconButton(onClick = { onRemoveFromCart() }) {
                        Text(
                            text = "-",
                            style = MaterialTheme.typography.bodyLarge
                        )
                    }
                    Text(
                        text = quantityInCart.toString(),
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.widthIn(min = 24.dp),
                        textAlign = TextAlign.Center
                    )
                }

                IconButton(onClick = { onProductClick() }) {
                    Text(
                        text = "+",
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
            }
        }
    }
}

@Composable
private fun CartSummaryBar(
    state: MenuUiState,
    onProceedToPayment: () -> Unit,
    onRemoveFromCart: (String) -> Unit
) {
    val totalItems = state.cartItems.sumOf { it.quantity }
    val totalAmount = state.cartItems.sumOf { it.itemTotal * it.quantity }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .padding(horizontal = 16.dp, vertical = 8.dp)
    ) {
        // Lista de items en el carrito (si hay)
        if (state.cartItems.isNotEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 150.dp)
            ) {
                state.cartItems.forEach { cartItem ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.Top
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "${cartItem.quantity}x ${cartItem.product.name}",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium
                            )
                            if (cartItem.extras.isNotEmpty()) {
                                Text(
                                    text = cartItem.extras.joinToString(", ") { it.optionName },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                text = "$ ${"%.2f".format(cartItem.itemTotal * cartItem.quantity)}",
                                style = MaterialTheme.typography.bodyMedium
                            )
                            IconButton(
                                onClick = { onRemoveFromCart(cartItem.cartKey) },
                                modifier = Modifier.size(32.dp)
                            ) {
                                Text("-", style = MaterialTheme.typography.bodyLarge)
                            }
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Divider()
            Spacer(modifier = Modifier.height(8.dp))
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Carrito",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.SemiBold
                )
                Text(
                    text = "$totalItems ítems",
                    style = MaterialTheme.typography.bodySmall
                )
            }

            Text(
                text = "$ ${"%.2f".format(totalAmount)}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        Button(
            onClick = onProceedToPayment,
            enabled = totalItems > 0 && !state.isPlacingOrder,
            modifier = Modifier.fillMaxWidth()
        ) {
            Text(
                text = if (state.isPlacingOrder)
                    "Iniciando pago..."
                else
                    "Continuar al pago"
            )
        }

        state.orderError?.let {
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.error
            )
        }
    }
}

@Composable
private fun AdminPinDialog(
    onSuccess: () -> Unit,
    onCancel: () -> Unit
) {
    var pin by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = {
            pin = ""
            error = null
            onCancel()
        },
        title = {
            Text(text = "Acceso administrativo")
        },
        text = {
            Column {
                Text(
                    text = "Ingresá el PIN para acceder al panel.",
                    style = MaterialTheme.typography.bodyMedium
                )
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedTextField(
                    value = pin,
                    onValueChange = { value ->
                        if (value.length <= 4 && value.all { it.isDigit() }) {
                            pin = value
                        }
                    },
                    label = { Text("PIN") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                    visualTransformation = PasswordVisualTransformation()
                )
                if (error != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = error!!,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    if (pin == "9999") {
                        pin = ""
                        error = null
                        onSuccess()
                    } else {
                        error = "PIN incorrecto"
                    }
                }
            ) {
                Text("Ingresar")
            }
        },
        dismissButton = {
            TextButton(
                onClick = {
                    pin = ""
                    error = null
                    onCancel()
                }
            ) {
                Text("Cancelar")
            }
        }
    )
}

/**
 * Panel admin:
 * - Lista pedidos recientes desde /admin/orders/recent
 * - PENDING/PAYMENT_FAILED → "Ir a pagar"
 * - PAID → "Reimprimir ticket" / "Ver QR ticket"
 * - Y ahora: detalle de items al expandir cada pedido.
 */
@Composable
private fun AdminPanelDialog(
    onClose: () -> Unit,
    onResumePayment: (orderId: Int, totalAmount: Double) -> Unit,
    onOpenSettings: () -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var isLoading by remember { mutableStateOf(true) }
    var isRefreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var orders by remember { mutableStateOf<List<AdminOrderDto>>(emptyList()) }

    var isTryingPrint by remember { mutableStateOf(false) }

    var showReceiptQr by remember { mutableStateOf(false) }
    var receiptQrBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var receiptQrOrderId by remember { mutableStateOf<Int?>(null) }

    // detalle de items
    var expandedOrderId by remember { mutableStateOf<Int?>(null) }
    var orderDetails by remember { mutableStateOf<Map<Int, OrderResponse>>(emptyMap()) }
    var loadingDetailForId by remember { mutableStateOf<Int?>(null) }

    fun loadOrders() {
        scope.launch {
            if (!isLoading) {
                isRefreshing = true
            }
            error = null
            try {
                val api = ApiClient.adminOrdersApi
                val result = api.getRecentOrders(40)
                orders = result
            } catch (e: Exception) {
                error = e.message ?: "Error al cargar pedidos."
            } finally {
                isLoading = false
                isRefreshing = false
            }
        }
    }

    fun toggleOrderDetails(orderId: Int) {
        if (expandedOrderId == orderId) {
            // cerrar
            expandedOrderId = null
            return
        }
        expandedOrderId = orderId

        // si ya tenemos el detalle, listo
        if (orderDetails.containsKey(orderId)) return

        // sino, lo pedimos al backend
        scope.launch {
            try {
                loadingDetailForId = orderId
                val detail = ApiClient.ordersApi.getOrder(orderId)
                orderDetails = orderDetails + (orderId to detail)
            } catch (_: Exception) {
                Toast.makeText(
                    context,
                    "No se pudo cargar el detalle de la orden #$orderId",
                    Toast.LENGTH_SHORT
                ).show()
            } finally {
                loadingDetailForId = null
            }
        }
    }

    LaunchedEffect(Unit) {
        loadOrders()
    }

    AlertDialog(
        onDismissRequest = onClose,
        title = {
            Text(text = "Panel administrativo")
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth()
            ) {
                when {
                    isLoading -> {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp))
                            Text("Cargando pedidos recientes...")
                        }
                    }

                    error != null -> {
                        Text(
                            text = "No se pudieron cargar los pedidos.\n${error}",
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(onClick = { loadOrders() }) {
                            Text("Reintentar")
                        }
                    }

                    orders.isEmpty() -> {
                        Text(
                            text = "No hay pedidos recientes.",
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }

                    else -> {
                        Text(
                            text = "Pedidos recientes (máx. 40)\n" +
                                "Tocá una orden para ver los ítems.",
                            style = MaterialTheme.typography.bodySmall
                        )
                        Spacer(modifier = Modifier.height(8.dp))

                        LazyColumn(
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(max = 360.dp)
                        ) {
                            items(orders) { order ->
                                val detail = orderDetails[order.id]
                                val isExpanded = expandedOrderId == order.id
                                val isLoadingDetail = loadingDetailForId == order.id

                                AdminOrderRow(
                                    order = order,
                                    detail = detail,
                                    isExpanded = isExpanded,
                                    isLoadingDetail = isLoadingDetail,
                                    onToggleExpand = { toggleOrderDetails(order.id) },
                                    onResumePaymentClick = {
                                        val total = order.totalAmount.toDoubleOrNull()
                                        if (total == null) {
                                            Toast.makeText(
                                                context,
                                                "No se pudo leer el total de la orden.",
                                                Toast.LENGTH_SHORT
                                            ).show()
                                        } else {
                                            onResumePayment(order.id, total)
                                        }
                                    },
                                    onReprintClick = {
                                        if (isTryingPrint) return@AdminOrderRow

                                        val total = order.totalAmount.toDoubleOrNull()
                                        if (total == null) {
                                            Toast.makeText(
                                                context,
                                                "No se pudo leer el total de la orden.",
                                                Toast.LENGTH_SHORT
                                            ).show()
                                            return@AdminOrderRow
                                        }

                                        scope.launch {
                                            try {
                                                isTryingPrint = true
                                                showReceiptQr = false
                                                receiptQrBitmap = null
                                                receiptQrOrderId = null

                                                val receiptsApi = ApiClient.receiptsApi
                                                var receiptUrl: String? = null
                                                try {
                                                    val receipt = receiptsApi.getReceiptForOrder(order.id)
                                                    receiptUrl = receipt.receiptUrl
                                                } catch (_: Exception) {
                                                    Toast.makeText(
                                                        context,
                                                        "No se pudo obtener el comprobante online.",
                                                        Toast.LENGTH_SHORT
                                                    ).show()
                                                }

                                                // Obtener items con extras
                                                var ticketItems: List<TicketFormatter.TicketItem> = emptyList()
                                                var paymentOpId: String? = null
                                                try {
                                                    val printData = receiptsApi.getOrderPrintData(order.id)
                                                    ticketItems = printData.items.map { item ->
                                                        TicketFormatter.TicketItem(
                                                            productName = item.productName,
                                                            quantity = item.quantity,
                                                            unitPrice = item.unitPrice,
                                                            extras = item.extras.map { extra ->
                                                                TicketFormatter.TicketExtra(
                                                                    name = extra.name,
                                                                    quantity = extra.quantity,
                                                                    unitPrice = extra.unitPrice
                                                                )
                                                            }
                                                        )
                                                    }
                                                    paymentOpId = printData.payment?.mpPaymentId
                                                } catch (_: Exception) {
                                                    // Continuar sin detalle
                                                }

                                                val ticketData = TicketFormatter.TicketData(
                                                    orderId = order.id,
                                                    total = total,
                                                    paymentMethodDescription = "Reimpresión desde panel",
                                                    paymentOperationId = paymentOpId,
                                                    items = ticketItems
                                                )

                                                val bytes = TicketFormatter.buildCustomerTicket(ticketData)
                                                val ok = BluetoothPrinterManager.print(bytes)

                                                if (!ok) {
                                                    if (receiptUrl != null) {
                                                        receiptQrBitmap = generateQrBitmap(receiptUrl)
                                                        receiptQrOrderId = order.id
                                                        showReceiptQr = true
                                                        Toast.makeText(
                                                            context,
                                                            "No se pudo imprimir. Escaneá el QR de comprobante.",
                                                            Toast.LENGTH_LONG
                                                        ).show()
                                                    } else {
                                                        Toast.makeText(
                                                            context,
                                                            "No se pudo imprimir el comprobante.\nVerificá la impresora.",
                                                            Toast.LENGTH_LONG
                                                        ).show()
                                                    }
                                                } else {
                                                    Toast.makeText(
                                                        context,
                                                        "Comprobante reimpreso.",
                                                        Toast.LENGTH_SHORT
                                                    ).show()
                                                }
                                            } finally {
                                                isTryingPrint = false
                                            }
                                        }
                                    },
                                    onShowQrClick = {
                                        if (isTryingPrint) return@AdminOrderRow

                                        scope.launch {
                                            try {
                                                isTryingPrint = true
                                                showReceiptQr = false
                                                receiptQrBitmap = null
                                                receiptQrOrderId = null

                                                val receiptsApi = ApiClient.receiptsApi
                                                val receipt = receiptsApi.getReceiptForOrder(order.id)
                                                val bitmap = generateQrBitmap(receipt.receiptUrl)
                                                if (bitmap != null) {
                                                    receiptQrBitmap = bitmap
                                                    receiptQrOrderId = order.id
                                                    showReceiptQr = true
                                                } else {
                                                    Toast.makeText(
                                                        context,
                                                        "No se pudo generar el QR del comprobante.",
                                                        Toast.LENGTH_SHORT
                                                    ).show()
                                                }
                                            } catch (_: Exception) {
                                                Toast.makeText(
                                                    context,
                                                    "No se pudo obtener el comprobante.",
                                                    Toast.LENGTH_SHORT
                                                ).show()
                                            } finally {
                                                isTryingPrint = false
                                            }
                                        }
                                    }
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                            }
                        }
                    }
                }

                if (isTryingPrint) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Procesando comprobante...",
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                if (showReceiptQr && receiptQrBitmap != null && receiptQrOrderId != null) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = "QR de comprobante - Orden #${receiptQrOrderId}",
                        style = MaterialTheme.typography.bodySmall
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Image(
                        bitmap = receiptQrBitmap!!.asImageBitmap(),
                        contentDescription = "QR comprobante",
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(200.dp)
                    )
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onClose) {
                Text("Cerrar")
            }
        },
        dismissButton = {
            Row {
                TextButton(
                    onClick = onOpenSettings
                ) {
                    Text("⚙️ Servidor")
                }
                TextButton(
                    onClick = { loadOrders() },
                    enabled = !isLoading && !isRefreshing
                ) {
                    Text(if (isRefreshing) "Actualizando..." else "Actualizar")
                }
            }
        }
    )
}

@Composable
private fun AdminOrderRow(
    order: AdminOrderDto,
    detail: OrderResponse?,
    isExpanded: Boolean,
    isLoadingDetail: Boolean,
    onToggleExpand: () -> Unit,
    onResumePaymentClick: () -> Unit,
    onReprintClick: () -> Unit,
    onShowQrClick: () -> Unit
) {
    val statusUpper = order.status.uppercase()
    val statusLabel = when (statusUpper) {
        "PENDING" -> "Inconclusa"
        "PAYMENT_FAILED" -> "Pago fallido"
        "PAID" -> "Pagada"
        "CANCELLED" -> "Cancelada"
        else -> order.status
    }

    val totalFormatted = order.totalAmount.toDoubleOrNull()?.let {
        "%.2f".format(it)
    } ?: order.totalAmount

    val createdText = order.createdAt
        .replace('T', ' ')
        .replace('Z', ' ')
        .take(16)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onToggleExpand() }
            .padding(8.dp)
    ) {
        Text(
            text = "Orden #${order.id}",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold
        )
        Text(
            text = "$statusLabel · $createdText",
            style = MaterialTheme.typography.bodySmall
        )
        Text(
            text = "Total: $ $totalFormatted",
            style = MaterialTheme.typography.bodySmall
        )
        order.receiptCode?.let {
            Text(
                text = "Comprobante: $it",
                style = MaterialTheme.typography.bodySmall
            )
        }

        Spacer(modifier = Modifier.height(4.dp))

        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (statusUpper == "PENDING" || statusUpper == "PAYMENT_FAILED") {
                Button(onClick = onResumePaymentClick) {
                    Text("Ir a pagar")
                }
            }
            if (statusUpper == "PAID") {
                Button(onClick = onReprintClick) {
                    Text("Reimprimir ticket")
                }
                TextButton(onClick = onShowQrClick) {
                    Text("Ver QR ticket")
                }
            }

            TextButton(onClick = onToggleExpand) {
                Text(if (isExpanded) "Ocultar detalle" else "Ver detalle")
            }
        }

        if (isExpanded) {
            Spacer(modifier = Modifier.height(4.dp))

            when {
                isLoadingDetail -> {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp))
                        Text(
                            text = "Cargando ítems...",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }

                detail?.items.isNullOrEmpty() -> {
                    Text(
                        text = "Sin ítems (o no se pudo cargar el detalle).",
                        style = MaterialTheme.typography.bodySmall
                    )
                }

                else -> {
                    val items = detail!!.items!!
                    val totalUnits = items.sumOf { it.quantity }

                    Text(
                        text = "Ítems ($totalUnits):",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.height(2.dp))

                    items.forEach { item ->
                        val name = item.product?.name ?: "Producto ${item.productId}"
                        Text(
                            text = "· x${item.quantity}  $name",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            }
        }
    }
}

/**
 * Copiado de PaymentScreen, pero local a este archivo para poder
 * generar QR de comprobantes desde el panel admin.
 */
private fun generateQrBitmap(content: String, size: Int = 600): Bitmap? {
    return try {
        val writer = QRCodeWriter()
        val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size)
        val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)

        val black = Color.Black.toArgb()
        val white = Color.White.toArgb()

        for (x in 0 until size) {
            for (y in 0 until size) {
                bitmap.setPixel(x, y, if (bitMatrix[x, y]) black else white)
            }
        }
        bitmap
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}
