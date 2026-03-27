package com.norpan.kiosko.presentation.menu

import android.graphics.Bitmap
import android.widget.Toast
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.norpan.kiosko.data.KioskConfig
import com.norpan.kiosko.data.remote.dto.CategoryDto
import com.norpan.kiosko.presentation.menu.components.AttractScreen
import com.norpan.kiosko.presentation.menu.components.CartFooterBar
import com.norpan.kiosko.presentation.menu.components.CategoryTabsBar
import com.norpan.kiosko.presentation.menu.components.KioskConfigPanel
import com.norpan.kiosko.presentation.menu.components.ProductsGrid
import com.norpan.kiosko.ui.theme.KioskTheme
import kotlinx.coroutines.delay

/**
 * Nueva versión del MenuScreen con UI estilo McDonald's/Burger King.
 * - Pantalla de descanso (attract screen)
 * - Navegación por tabs de categorías
 * - Productos en grilla con fotos grandes
 * - Carrito lateral siempre visible
 * - Todo configurable desde menú secreto
 */
@Composable
fun MenuScreenV2(
    viewModel: MenuViewModel = viewModel()
) {
    val state by viewModel.uiState.collectAsState()
    val productsWithExtras = state.productsWithExtras
    val context = LocalContext.current

    // Estado de la UI
    var showAttractScreen by remember { mutableStateOf(KioskConfig.attractScreenEnabled) }
    var selectedCategory by remember { mutableStateOf<CategoryDto?>(null) }
    var secretTapCount by remember { mutableIntStateOf(0) }
    var showAdminPinDialog by remember { mutableStateOf(false) }
    var showAdminPanel by remember { mutableStateOf(false) }
    var showKioskConfig by remember { mutableStateOf(false) }

    // Timer de inactividad
    var showInactivityDialog by remember { mutableStateOf(false) }
    var inactivityCountdown by remember { mutableIntStateOf(0) }
    var inactivityTimerSeed by remember { mutableIntStateOf(0) }

    // Recomposición key para aplicar cambios de config
    var configVersion by remember { mutableIntStateOf(0) }

    // Seleccionar primera categoría cuando se cargan
    LaunchedEffect(state.categories) {
        if (state.categories.isNotEmpty() && selectedCategory == null) {
            selectedCategory = state.categories.first()
        }
    }

    // Timer de inactividad (solo si hay carrito y no está pagando)
    LaunchedEffect(inactivityTimerSeed, state.cartItems.size, state.isInPayment, state.isInPointPayment) {
        if (state.cartItems.isEmpty() || state.isInPayment || state.isInPointPayment) {
            showInactivityDialog = false
            return@LaunchedEffect
        }

        delay(KioskConfig.inactivityTimeoutSeconds * 1000L)

        if (state.cartItems.isNotEmpty() && !state.isInPayment && !state.isInPointPayment) {
            showInactivityDialog = true
            inactivityCountdown = KioskConfig.inactivityCountdownSeconds

            while (inactivityCountdown > 0) {
                delay(1000L)
                inactivityCountdown--
            }

            if (showInactivityDialog) {
                showInactivityDialog = false
                viewModel.clearCart()
                showAttractScreen = KioskConfig.attractScreenEnabled
            }
        }
    }

    KioskTheme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = KioskConfig.backgroundColor
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                when {
                    // Pantalla de pago QR
                    state.isInPayment -> {
                        state.paymentOrderId?.let { orderId ->
                            state.paymentInitPoint?.let { initPoint ->
                                PaymentScreen(
                                    orderId = orderId,
                                    total = state.paymentTotal,
                                    initPoint = initPoint,
                                    paymentStatus = state.paymentStatus,
                                    onCancel = { 
                                        viewModel.exitPayment()
                                        showAttractScreen = KioskConfig.attractScreenEnabled
                                    },
                                    onChangePaymentMethod = if (state.paymentStatus != "PAID") {
                                        { viewModel.changePaymentMethodFromQr() }
                                    } else null
                                )
                            }
                        }
                    }
                    
                    // Pantalla de pago con terminal Point
                    state.isInPointPayment -> {
                        state.paymentOrderId?.let { orderId ->
                            state.pointDeviceId?.let { deviceId ->
                                PointPaymentScreen(
                                    orderId = orderId,
                                    total = state.paymentTotal,
                                    deviceId = deviceId,
                                    intentId = state.pointIntentId,
                                    paymentState = state.pointPaymentState,
                                    onCancel = {
                                        viewModel.exitPointPayment()
                                        showAttractScreen = KioskConfig.attractScreenEnabled
                                    },
                                    onRetry = { viewModel.retryPointPayment() },
                                    onChangePaymentMethod = when (state.pointPaymentState) {
                                        is PointPaymentState.WaitingForCard,
                                        is PointPaymentState.CreatingIntent -> {
                                            { viewModel.changePaymentMethodFromPoint() }
                                        }
                                        else -> null
                                    }
                                )
                            }
                        }
                    }

                    // Pantalla de descanso
                    showAttractScreen && KioskConfig.attractScreenEnabled -> {
                        AttractScreen(
                            onTouchToStart = {
                                showAttractScreen = false
                                inactivityTimerSeed++
                            }
                        )
                    }

                    // Menú principal
                    else -> {
                        MainMenuContent(
                            state = state,
                            productsWithExtras = productsWithExtras,
                            selectedCategory = selectedCategory,
                            configVersion = configVersion,
                            onCategorySelected = { selectedCategory = it },
                            onProductClick = { product ->
                                viewModel.onProductClick(product)
                                inactivityTimerSeed++
                            },
                            onRemoveFromCart = { cartKey ->
                                viewModel.removeOneFromCart(cartKey)
                                inactivityTimerSeed++
                            },
                            onAddToCart = { item ->
                                viewModel.addToCartWithExtras(item.product, item.extras)
                                inactivityTimerSeed++
                            },
                            onAddCustomizableProduct = { product ->
                                // Abrir el diálogo de extras para agregar una nueva unidad personalizada
                                viewModel.onProductClick(product)
                                inactivityTimerSeed++
                            },
                            onProceedToPayment = {
                                viewModel.showPaymentMethodSelection()
                            },
                            onReload = { viewModel.loadMenu() }
                        )
                    }
                }
                
                // Diálogo de selección de método de pago
                val pendingTotal = state.pendingOrderTotal
                if (state.showPaymentMethodDialog && pendingTotal != null) {
                    PaymentMethodDialog(
                        total = pendingTotal,
                        onMethodSelected = { method ->
                            viewModel.proceedWithPaymentMethod(method)
                        },
                        onDismiss = { viewModel.dismissPaymentMethodDialog() }
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
                            inactivityTimerSeed++
                        },
                        onDismiss = { viewModel.closeExtrasModal() }
                    )
                }

                // Hotspot invisible para menú secreto (esquina superior derecha)
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
                )

                // Diálogo de inactividad
                if (showInactivityDialog && !state.isInPayment && state.cartItems.isNotEmpty()) {
                    AlertDialog(
                        onDismissRequest = {
                            showInactivityDialog = false
                            inactivityCountdown = 0
                            inactivityTimerSeed++
                        },
                        title = { Text("¿Seguís ahí?") },
                        text = {
                            Text(
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
                                    inactivityTimerSeed++
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
                                    showAttractScreen = KioskConfig.attractScreenEnabled
                                }
                            ) {
                                Text("Cancelar pedido")
                            }
                        }
                    )
                }

                // Diálogo de PIN
                if (showAdminPinDialog) {
                    AdminPinDialog(
                        onSuccess = {
                            showAdminPinDialog = false
                            showAdminPanel = true
                        },
                        onCancel = { showAdminPinDialog = false }
                    )
                }

                // Panel admin
                if (showAdminPanel) {
                    AdminPanelDialogV2(
                        onClose = { showAdminPanel = false },
                        onResumePayment = { orderId, total ->
                            viewModel.resumePayment(orderId, total)
                            showAdminPanel = false
                        },
                        onOpenSettings = {
                            showAdminPanel = false
                            viewModel.openBackendSettings()
                        },
                        onOpenPrinterSettings = {
                            showAdminPanel = false
                            viewModel.openPrinterSettings()
                        },
                        onOpenKioskConfig = {
                            showAdminPanel = false
                            showKioskConfig = true
                        }
                    )
                }

                // Panel de configuración del kiosko
                if (showKioskConfig) {
                    KioskConfigPanel(
                        onClose = { showKioskConfig = false },
                        onApply = { configVersion++ }
                    )
                }
            }
        }
    }
}

@Composable
private fun MainMenuContent(
    state: MenuUiState,
    productsWithExtras: Set<Int>,
    selectedCategory: CategoryDto?,
    configVersion: Int,
    onCategorySelected: (CategoryDto) -> Unit,
    onProductClick: (com.norpan.kiosko.data.remote.dto.ProductDto) -> Unit,
    onRemoveFromCart: (String) -> Unit,
    onAddToCart: (CartItem) -> Unit,
    onAddCustomizableProduct: (com.norpan.kiosko.data.remote.dto.ProductDto) -> Unit,
    onProceedToPayment: () -> Unit,
    onReload: () -> Unit
) {
    when {
        state.isLoading -> {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator(
                        color = KioskConfig.primaryColor,
                        modifier = Modifier.size(64.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Cargando menú...",
                        style = MaterialTheme.typography.bodyLarge,
                        color = KioskConfig.textColor
                    )
                }
            }
        }

        state.error != null -> {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(32.dp)
                ) {
                    Text(
                        text = "😕",
                        style = MaterialTheme.typography.displayLarge
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Hubo un problema cargando el menú",
                        style = MaterialTheme.typography.titleLarge,
                        color = KioskConfig.textColor,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = state.error,
                        style = MaterialTheme.typography.bodyMedium,
                        color = KioskConfig.textColor.copy(alpha = 0.7f),
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Button(onClick = onReload) {
                        Text("Reintentar")
                    }
                }
            }
        }

        else -> {
            // Layout vertical: Header, Categorías, Productos, Footer del carrito
            Column(modifier = Modifier.fillMaxSize()) {
                // Header
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(KioskConfig.surfaceColor)
                        .padding(horizontal = 24.dp, vertical = 16.dp)
                ) {
                    Column {
                        Text(
                            text = KioskConfig.businessName,
                            style = MaterialTheme.typography.titleLarge,
                            color = KioskConfig.primaryColor
                        )
                        Text(
                            text = KioskConfig.headerTitle,
                            style = MaterialTheme.typography.displaySmall,
                            color = KioskConfig.textColor
                        )
                    }
                }

                // Tabs de categorías
                if (state.categories.isNotEmpty()) {
                    CategoryTabsBar(
                        categories = state.categories,
                        selectedCategoryId = selectedCategory?.id,
                        onCategorySelected = onCategorySelected
                    )
                }

                // Grilla de productos (ocupa el espacio disponible)
                AnimatedContent(
                    targetState = selectedCategory,
                    transitionSpec = {
                        val direction = if ((targetState?.id ?: 0) > (initialState?.id ?: 0)) 1 else -1
                        (slideInHorizontally { direction * it / 4 } + fadeIn()) togetherWith
                            (slideOutHorizontally { -direction * it / 4 } + fadeOut())
                    },
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    label = "categoryTransition"
                ) { category ->
                    val products = category?.products ?: emptyList()
                    ProductsGrid(
                        products = products,
                        cartItems = state.cartItems,
                        productsWithExtras = productsWithExtras,
                        isLoading = false,
                        onProductClick = onProductClick
                    )
                }

                // Footer del carrito (siempre visible)
                CartFooterBar(
                    cartItems = state.cartItems,
                    productsWithExtras = productsWithExtras,
                    isPlacingOrder = state.isPlacingOrder,
                    orderError = state.orderError,
                    onRemoveItem = onRemoveFromCart,
                    onAddItem = onAddToCart,
                    onAddCustomizableProduct = onAddCustomizableProduct,
                    onProceedToPayment = onProceedToPayment
                )
            }
        }
    }
}

/**
 * Panel admin con opción adicional para configurar el kiosko.
 */
@Composable
private fun AdminPanelDialogV2(
    onClose: () -> Unit,
    onResumePayment: (orderId: Int, totalAmount: Double) -> Unit,
    onOpenSettings: () -> Unit,
    onOpenPrinterSettings: () -> Unit,
    onOpenKioskConfig: () -> Unit
) {
    // Reutilizamos la lógica del panel existente pero agregamos botón de config
    val context = LocalContext.current

    AlertDialog(
        onDismissRequest = onClose,
        title = { Text("Panel administrativo") },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Opciones disponibles:",
                    style = MaterialTheme.typography.bodyMedium
                )

                Button(
                    onClick = onOpenKioskConfig,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("🎨 Configurar apariencia")
                }

                Button(
                    onClick = onOpenSettings,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("⚙️ Configurar servidor")
                }

                Button(
                    onClick = onOpenPrinterSettings,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("🖨️ Configurar impresoras")
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "Para ver pedidos y reimprimir tickets, usa el panel completo (en desarrollo).",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        },
        confirmButton = {
            TextButton(onClick = onClose) {
                Text("Cerrar")
            }
        }
    )
}

/**
 * Diálogo de PIN para acceso admin.
 */
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
