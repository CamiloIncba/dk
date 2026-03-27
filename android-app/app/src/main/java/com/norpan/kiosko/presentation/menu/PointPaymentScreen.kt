package com.norpan.kiosko.presentation.menu

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.norpan.kiosko.data.remote.ApiClient
import com.norpan.kiosko.printing.BluetoothPrinterManager
import com.norpan.kiosko.printing.KitchenTicketFormatter
import com.norpan.kiosko.printing.PrintResult
import com.norpan.kiosko.printing.PrinterConfig
import com.norpan.kiosko.printing.TicketFormatter
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Estados posibles del flujo de pago con Point
 */
sealed class PointPaymentState {
    data object CreatingIntent : PointPaymentState()
    data object WaitingForCard : PointPaymentState()
    data object Processing : PointPaymentState()
    data object Paid : PointPaymentState()
    data class Cancelled(val reason: String?) : PointPaymentState()
    data class Error(val message: String) : PointPaymentState()
    data object Timeout : PointPaymentState()
}

/**
 * Pantalla de pago con terminal Mercado Pago Point.
 * Maneja todo el flujo: crear intención, polling de estado, 
 * resultado y opciones de cancelar/reintentar.
 */
@Composable
fun PointPaymentScreen(
    orderId: Int,
    total: Double?,
    deviceId: String,
    intentId: String?,
    paymentState: PointPaymentState,
    onCancel: () -> Unit,
    onRetry: () -> Unit,
    onChangePaymentMethod: (() -> Unit)? = null
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    
    // Estado de impresión
    var isTryingPrint by remember { mutableStateOf(false) }
    var hasTriedAutoPrint by remember { mutableStateOf(false) }
    var showReceiptQr by remember { mutableStateOf(false) }
    var receiptQrBitmap by remember { mutableStateOf<android.graphics.Bitmap?>(null) }
    
    // Contador de tiempo esperando
    var waitingSeconds by remember { mutableIntStateOf(0) }
    
    // Contar tiempo esperando tarjeta
    LaunchedEffect(paymentState) {
        if (paymentState is PointPaymentState.WaitingForCard) {
            waitingSeconds = 0
            while (true) {
                delay(1000)
                waitingSeconds++
            }
        }
    }
    
    // Auto-impresión cuando el pago es exitoso
    LaunchedEffect(paymentState) {
        if (paymentState is PointPaymentState.Paid && !hasTriedAutoPrint) {
            hasTriedAutoPrint = true
            isTryingPrint = true
            
            scope.launch {
                try {
                    // 1) pedir URL de comprobante al backend
                    val receiptsApi = ApiClient.receiptsApi
                    var receiptUrl: String? = null
                    try {
                        val receipt = receiptsApi.getReceiptForOrder(orderId)
                        receiptUrl = receipt.receiptUrl
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }

                    // 2) obtener datos de la orden con items y extras
                    var ticketItems: List<TicketFormatter.TicketItem> = emptyList()
                    var paymentOpId: String? = null
                    try {
                        val printData = receiptsApi.getOrderPrintData(orderId)
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
                    } catch (e: Exception) {
                        e.printStackTrace()
                    }

                    // 3) armar ticket ESC/POS para cliente
                    val ticketData = TicketFormatter.TicketData(
                        orderId = orderId,
                        total = total,
                        paymentMethodDescription = "Mercado Pago - Tarjeta",
                        paymentOperationId = paymentOpId,
                        items = ticketItems
                    )

                    // Imprimir ticket cliente (si está habilitado)
                    var customerPrintResult: PrintResult = PrintResult.NotConfigured
                    if (PrinterConfig.autoPrintCustomerTicket && PrinterConfig.isKioskPrinterConfigured()) {
                        val bytes = TicketFormatter.buildCustomerTicket(ticketData)
                        customerPrintResult = BluetoothPrinterManager.printWithResult(bytes)
                    }

                    // 4) Imprimir comanda a cocina (si está habilitado)
                    var kitchenPrintResult: PrintResult = PrintResult.NotConfigured
                    if (PrinterConfig.autoPrintKitchenTicket && PrinterConfig.isKitchenPrinterConfigured()) {
                        val kitchenData = KitchenTicketFormatter.KitchenTicketData(
                            orderId = orderId,
                            items = ticketItems.map { item ->
                                KitchenTicketFormatter.KitchenItem(
                                    productName = item.productName,
                                    quantity = item.quantity,
                                    extras = item.extras.map { it.name }
                                )
                            }
                        )
                        val kitchenBytes = KitchenTicketFormatter.buildKitchenTicket(kitchenData)
                        kitchenPrintResult = BluetoothPrinterManager.printToKitchenWithResult(kitchenBytes)
                    }

                    // Mostrar mensaje según resultado
                    val customerOk = customerPrintResult.isSuccess || !PrinterConfig.isKioskPrinterConfigured()
                    val kitchenOk = kitchenPrintResult.isSuccess || !PrinterConfig.isKitchenPrinterConfigured()

                    when {
                        customerOk && kitchenOk -> {
                            Toast.makeText(context, "✅ Comprobante impreso", Toast.LENGTH_SHORT).show()
                        }
                        !customerOk && kitchenOk -> {
                            // Error solo en cliente
                            Toast.makeText(context, "⚠️ Ticket cliente: ${customerPrintResult.toUserMessage()}", Toast.LENGTH_LONG).show()
                        }
                        customerOk && !kitchenOk -> {
                            // Error solo en cocina
                            Toast.makeText(context, "⚠️ Comanda cocina: ${kitchenPrintResult.toUserMessage()}", Toast.LENGTH_LONG).show()
                        }
                        else -> {
                            // Ambas fallaron
                            Toast.makeText(context, "❌ Error impresoras: ${customerPrintResult.toUserMessage()}", Toast.LENGTH_LONG).show()
                        }
                    }

                    // Si falló ticket cliente, mostrar QR alternativo
                    if (!customerPrintResult.isSuccess && PrinterConfig.isKioskPrinterConfigured()) {
                        if (receiptUrl != null) {
                            receiptQrBitmap = generateQrBitmap(receiptUrl)
                            showReceiptQr = true
                            Toast.makeText(
                                context,
                                "No se pudo imprimir. Escaneá el QR de comprobante.",
                                Toast.LENGTH_LONG
                            ).show()
                        } else {
                            Toast.makeText(
                                context,
                                "No se pudo imprimir el comprobante.",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    } else {
                        Toast.makeText(
                            context,
                            "Comprobante impreso.",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    isTryingPrint = false
                }
            }
        }
    }
    
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF0D0D1A)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Mostrar QR de comprobante si hay error de impresión
            if (showReceiptQr && receiptQrBitmap != null) {
                ReceiptQrSection(
                    bitmap = receiptQrBitmap!!,
                    onDismiss = { 
                        showReceiptQr = false
                        onCancel() // Volver al inicio
                    }
                )
            } else {
                // Contenido principal según estado
                when (paymentState) {
                    is PointPaymentState.CreatingIntent -> {
                        CreatingIntentContent()
                    }
                    
                    is PointPaymentState.WaitingForCard -> {
                        WaitingForCardContent(
                            total = total,
                            waitingSeconds = waitingSeconds,
                            onCancel = onCancel,
                            onChangePaymentMethod = onChangePaymentMethod
                        )
                    }
                    
                    is PointPaymentState.Processing -> {
                        ProcessingContent()
                    }
                    
                    is PointPaymentState.Paid -> {
                        PaidContent(
                            isTryingPrint = isTryingPrint,
                            onContinue = onCancel
                        )
                    }
                    
                    is PointPaymentState.Cancelled -> {
                        CancelledContent(
                            reason = paymentState.reason,
                            onRetry = onRetry,
                            onExit = onCancel
                        )
                    }
                    
                    is PointPaymentState.Error -> {
                        ErrorContent(
                            message = paymentState.message,
                            onRetry = onRetry,
                            onExit = onCancel
                        )
                    }
                    
                    is PointPaymentState.Timeout -> {
                        TimeoutContent(
                            onRetry = onRetry,
                            onExit = onCancel
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CreatingIntentContent() {
    PulsingIcon(
        icon = Icons.Default.Sync,
        color = Color(0xFF00B4D8)
    )
    
    Spacer(modifier = Modifier.height(32.dp))
    
    Text(
        text = "Preparando terminal...",
        style = MaterialTheme.typography.headlineMedium,
        fontWeight = FontWeight.Bold,
        color = Color.White
    )
    
    Spacer(modifier = Modifier.height(8.dp))
    
    Text(
        text = "Conectando con la terminal de pago",
        style = MaterialTheme.typography.bodyLarge,
        color = Color.White.copy(alpha = 0.7f)
    )
    
    Spacer(modifier = Modifier.height(24.dp))
    
    CircularProgressIndicator(
        modifier = Modifier.size(48.dp),
        color = Color(0xFF00B4D8),
        strokeWidth = 4.dp
    )
}

@Composable
private fun WaitingForCardContent(
    total: Double?,
    waitingSeconds: Int,
    onCancel: () -> Unit,
    onChangePaymentMethod: (() -> Unit)? = null
) {
    // Animación de pulso
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    
    // Ícono de tarjeta con glow
    Box(
        modifier = Modifier
            .size(160.dp)
            .scale(scale)
            .clip(CircleShape)
            .background(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF7C4DFF).copy(alpha = 0.3f),
                        Color(0xFF7C4DFF).copy(alpha = 0.1f),
                        Color.Transparent
                    )
                )
            ),
        contentAlignment = Alignment.Center
    ) {
        Box(
            modifier = Modifier
                .size(120.dp)
                .clip(CircleShape)
                .background(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFFE040FB),
                            Color(0xFF7C4DFF)
                        )
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.CreditCard,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = Color.White
            )
        }
    }
    
    Spacer(modifier = Modifier.height(40.dp))
    
    // Total a pagar destacado
    if (total != null) {
        Text(
            text = "$${String.format("%,.0f", total)}",
            style = MaterialTheme.typography.displayMedium,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF00D4AA)
        )
        
        Spacer(modifier = Modifier.height(16.dp))
    }
    
    Text(
        text = "Acerque o inserte su tarjeta",
        style = MaterialTheme.typography.headlineSmall,
        fontWeight = FontWeight.Bold,
        color = Color.White,
        textAlign = TextAlign.Center
    )
    
    Spacer(modifier = Modifier.height(8.dp))
    
    Text(
        text = "La terminal está lista para recibir el pago",
        style = MaterialTheme.typography.bodyLarge,
        color = Color.White.copy(alpha = 0.7f),
        textAlign = TextAlign.Center
    )
    
    Spacer(modifier = Modifier.height(16.dp))
    
    // Tiempo de espera
    if (waitingSeconds > 0) {
        Text(
            text = "Esperando... ${waitingSeconds}s",
            style = MaterialTheme.typography.bodyMedium,
            color = Color.White.copy(alpha = 0.5f)
        )
    }
    
    Spacer(modifier = Modifier.height(32.dp))
    
    // Botón cambiar método de pago
    if (onChangePaymentMethod != null) {
        TextButton(
            onClick = onChangePaymentMethod,
            colors = ButtonDefaults.textButtonColors(
                contentColor = Color(0xFF00B4D8)
            )
        ) {
            Icon(
                imageVector = Icons.Default.SwapHoriz,
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Cambiar a pago con QR", fontSize = 14.sp)
        }
        
        Spacer(modifier = Modifier.height(16.dp))
    }
    
    // Botón cancelar
    OutlinedButton(
        onClick = onCancel,
        colors = ButtonDefaults.outlinedButtonColors(
            contentColor = Color.White
        ),
        border = ButtonDefaults.outlinedButtonBorder.copy(
            brush = Brush.horizontalGradient(
                listOf(Color.White.copy(alpha = 0.5f), Color.White.copy(alpha = 0.5f))
            )
        ),
        modifier = Modifier
            .width(200.dp)
            .height(50.dp)
    ) {
        Icon(
            imageVector = Icons.Default.Close,
            contentDescription = null,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text("Cancelar", fontSize = 16.sp)
    }
}

@Composable
private fun ProcessingContent() {
    PulsingIcon(
        icon = Icons.Default.CreditScore,
        color = Color(0xFFFFA726)
    )
    
    Spacer(modifier = Modifier.height(32.dp))
    
    Text(
        text = "Procesando pago...",
        style = MaterialTheme.typography.headlineMedium,
        fontWeight = FontWeight.Bold,
        color = Color.White
    )
    
    Spacer(modifier = Modifier.height(8.dp))
    
    Text(
        text = "Por favor espere, no retire la tarjeta",
        style = MaterialTheme.typography.bodyLarge,
        color = Color.White.copy(alpha = 0.7f)
    )
    
    Spacer(modifier = Modifier.height(24.dp))
    
    CircularProgressIndicator(
        modifier = Modifier.size(48.dp),
        color = Color(0xFFFFA726),
        strokeWidth = 4.dp
    )
}

@Composable
private fun PaidContent(
    isTryingPrint: Boolean,
    onContinue: () -> Unit
) {
    // Animación de check
    val scale by animateFloatAsState(
        targetValue = 1f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "checkScale"
    )
    
    Box(
        modifier = Modifier
            .size(140.dp)
            .scale(scale)
            .clip(CircleShape)
            .background(Color(0xFF00D4AA)),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = Icons.Default.Check,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = Color.White
        )
    }
    
    Spacer(modifier = Modifier.height(32.dp))
    
    Text(
        text = "¡Pago Aprobado!",
        style = MaterialTheme.typography.headlineLarge,
        fontWeight = FontWeight.Bold,
        color = Color(0xFF00D4AA)
    )
    
    Spacer(modifier = Modifier.height(16.dp))
    
    if (isTryingPrint) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                color = Color.White,
                strokeWidth = 2.dp
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "Imprimiendo comprobante...",
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = 0.7f)
            )
        }
    } else {
        Text(
            text = "Gracias por su compra",
            style = MaterialTheme.typography.bodyLarge,
            color = Color.White.copy(alpha = 0.7f)
        )
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Button(
            onClick = onContinue,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF00D4AA)
            ),
            modifier = Modifier
                .width(240.dp)
                .height(56.dp),
            shape = RoundedCornerShape(28.dp)
        ) {
            Text(
                text = "Continuar",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun CancelledContent(
    reason: String?,
    onRetry: () -> Unit,
    onExit: () -> Unit
) {
    Icon(
        imageVector = Icons.Default.Cancel,
        contentDescription = null,
        modifier = Modifier.size(100.dp),
        tint = Color(0xFFFF6B6B)
    )
    
    Spacer(modifier = Modifier.height(24.dp))
    
    Text(
        text = "Pago Cancelado",
        style = MaterialTheme.typography.headlineMedium,
        fontWeight = FontWeight.Bold,
        color = Color(0xFFFF6B6B)
    )
    
    if (!reason.isNullOrBlank()) {
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = reason,
            style = MaterialTheme.typography.bodyMedium,
            color = Color.White.copy(alpha = 0.6f),
            textAlign = TextAlign.Center
        )
    }
    
    Spacer(modifier = Modifier.height(40.dp))
    
    ActionButtons(
        onRetry = onRetry,
        onExit = onExit
    )
}

@Composable
private fun ErrorContent(
    message: String,
    onRetry: () -> Unit,
    onExit: () -> Unit
) {
    Icon(
        imageVector = Icons.Default.Error,
        contentDescription = null,
        modifier = Modifier.size(100.dp),
        tint = Color(0xFFFF6B6B)
    )
    
    Spacer(modifier = Modifier.height(24.dp))
    
    Text(
        text = "Error en el pago",
        style = MaterialTheme.typography.headlineMedium,
        fontWeight = FontWeight.Bold,
        color = Color(0xFFFF6B6B)
    )
    
    Spacer(modifier = Modifier.height(8.dp))
    
    Text(
        text = message,
        style = MaterialTheme.typography.bodyMedium,
        color = Color.White.copy(alpha = 0.6f),
        textAlign = TextAlign.Center,
        modifier = Modifier.padding(horizontal = 32.dp)
    )
    
    Spacer(modifier = Modifier.height(40.dp))
    
    ActionButtons(
        onRetry = onRetry,
        onExit = onExit
    )
}

@Composable
private fun TimeoutContent(
    onRetry: () -> Unit,
    onExit: () -> Unit
) {
    Icon(
        imageVector = Icons.Default.Timer,
        contentDescription = null,
        modifier = Modifier.size(100.dp),
        tint = Color(0xFFFFA726)
    )
    
    Spacer(modifier = Modifier.height(24.dp))
    
    Text(
        text = "Tiempo agotado",
        style = MaterialTheme.typography.headlineMedium,
        fontWeight = FontWeight.Bold,
        color = Color(0xFFFFA726)
    )
    
    Spacer(modifier = Modifier.height(8.dp))
    
    Text(
        text = "No se recibió respuesta de la terminal",
        style = MaterialTheme.typography.bodyMedium,
        color = Color.White.copy(alpha = 0.6f)
    )
    
    Spacer(modifier = Modifier.height(40.dp))
    
    ActionButtons(
        onRetry = onRetry,
        onExit = onExit
    )
}

@Composable
private fun ActionButtons(
    onRetry: () -> Unit,
    onExit: () -> Unit
) {
    Row(
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        OutlinedButton(
            onClick = onExit,
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = Color.White
            ),
            modifier = Modifier
                .width(140.dp)
                .height(50.dp)
        ) {
            Icon(
                imageVector = Icons.Default.ArrowBack,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Volver")
        }
        
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF7C4DFF)
            ),
            modifier = Modifier
                .width(160.dp)
                .height(50.dp),
            shape = RoundedCornerShape(25.dp)
        ) {
            Icon(
                imageVector = Icons.Default.Refresh,
                contentDescription = null,
                modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Reintentar")
        }
    }
}

@Composable
private fun PulsingIcon(
    icon: ImageVector,
    color: Color
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.9f,
        targetValue = 1.1f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = EaseInOutCubic),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    
    Box(
        modifier = Modifier
            .size(120.dp)
            .scale(scale)
            .clip(CircleShape)
            .background(color.copy(alpha = 0.2f)),
        contentAlignment = Alignment.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            modifier = Modifier.size(64.dp),
            tint = color
        )
    }
}

@Composable
private fun ReceiptQrSection(
    bitmap: android.graphics.Bitmap,
    onDismiss: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Escanea para ver tu comprobante",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        Card(
            modifier = Modifier.size(250.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                androidx.compose.foundation.Image(
                    bitmap = bitmap.asImageBitmap(),
                    contentDescription = "QR Comprobante",
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
        
        Spacer(modifier = Modifier.height(32.dp))
        
        Button(
            onClick = onDismiss,
            colors = ButtonDefaults.buttonColors(
                containerColor = Color(0xFF00D4AA)
            ),
            modifier = Modifier
                .width(200.dp)
                .height(50.dp),
            shape = RoundedCornerShape(25.dp)
        ) {
            Text("Continuar", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        }
    }
}

// Importar la función de generar QR
private fun generateQrBitmap(content: String): android.graphics.Bitmap? {
    return try {
        val writer = com.google.zxing.qrcode.QRCodeWriter()
        val bitMatrix = writer.encode(
            content,
            com.google.zxing.BarcodeFormat.QR_CODE,
            512,
            512
        )
        val width = bitMatrix.width
        val height = bitMatrix.height
        val bitmap = android.graphics.Bitmap.createBitmap(width, height, android.graphics.Bitmap.Config.ARGB_8888)
        for (x in 0 until width) {
            for (y in 0 until height) {
                bitmap.setPixel(
                    x, y,
                    if (bitMatrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE
                )
            }
        }
        bitmap
    } catch (e: Exception) {
        e.printStackTrace()
        null
    }
}
