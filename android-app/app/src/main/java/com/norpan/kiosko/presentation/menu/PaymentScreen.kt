package com.norpan.kiosko.presentation.menu

import android.graphics.Bitmap
import android.widget.Toast
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.norpan.kiosko.data.remote.ApiClient
import com.norpan.kiosko.printing.BluetoothPrinterManager
import com.norpan.kiosko.printing.KitchenTicketFormatter
import com.norpan.kiosko.printing.PrintResult
import com.norpan.kiosko.printing.PrinterConfig
import com.norpan.kiosko.printing.TicketFormatter
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun PaymentScreen(
    orderId: Int,
    total: Double?,
    initPoint: String,
    paymentStatus: String?,
    onCancel: () -> Unit,
    onChangePaymentMethod: (() -> Unit)? = null
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    // QR de pago (Mercado Pago)
    val paymentQrBitmap = remember(initPoint) {
        generateQrBitmap(initPoint)
    }

    // Estados para impresión / comprobante
    var isTryingPrint by remember { mutableStateOf(false) }
    var hasTriedAutoPrint by remember { mutableStateOf(false) }

    var showReceiptQr by remember { mutableStateOf(false) }
    var receiptQrBitmap by remember { mutableStateOf<Bitmap?>(null) }

    // Guard de inactividad
    var showInactivityDialog by remember { mutableStateOf(false) }
    var inactivityCountdown by remember { mutableIntStateOf(0) }
    var inactivityDialogSession by remember { mutableIntStateOf(0) }
    var inactivityTimerSeed by remember { mutableIntStateOf(0) }

    // --- AUTO IMPRESIÓN CUANDO PAGO = PAID ---
    LaunchedEffect(paymentStatus) {
        if (paymentStatus == "PAID" && !hasTriedAutoPrint) {
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
                        Toast.makeText(
                            context,
                            "No se pudo generar el comprobante online.",
                            Toast.LENGTH_SHORT
                        ).show()
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
                        // Continuar sin detalle de items
                    }

                    // 3) armar ticket ESC/POS
                    val ticketData = TicketFormatter.TicketData(
                        orderId = orderId,
                        total = total,
                        paymentMethodDescription = "Mercado Pago - QR",
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

                    // Verificar resultados
                    val customerOk = customerPrintResult.isSuccess || !PrinterConfig.isKioskPrinterConfigured()
                    val kitchenOk = kitchenPrintResult.isSuccess || !PrinterConfig.isKitchenPrinterConfigured()

                    if (!customerOk && PrinterConfig.isKioskPrinterConfigured()) {
                        // Error de impresión cliente: mostrar mensaje específico
                        val errorMsg = customerPrintResult.toUserMessage()
                        
                        if (receiptUrl != null) {
                            receiptQrBitmap = generateQrBitmap(receiptUrl)
                            showReceiptQr = true
                            Toast.makeText(
                                context,
                                "$errorMsg\nEscaneá el QR de comprobante.",
                                Toast.LENGTH_LONG
                            ).show()
                        } else {
                            Toast.makeText(
                                context,
                                errorMsg,
                                Toast.LENGTH_LONG
                            ).show()
                        }
                        
                        // Mostrar error de cocina también si aplica
                        if (!kitchenOk) {
                            Toast.makeText(
                                context,
                                "⚠️ Cocina: ${kitchenPrintResult.toUserMessage()}",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    } else {
                        // Impresión cliente OK
                        if (!kitchenOk) {
                            Toast.makeText(
                                context,
                                "⚠️ Comanda cocina: ${kitchenPrintResult.toUserMessage()}",
                                Toast.LENGTH_LONG
                            ).show()
                        } else {
                            Toast.makeText(
                                context,
                                "✅ Comprobante impreso.",
                                Toast.LENGTH_SHORT
                            ).show()
                        }
                        onCancel()
                    }
                } finally {
                    isTryingPrint = false
                }
            }
        }
    }

    // --- GUARD DE INACTIVIDAD CON TIEMPOS DISTINTOS SEGÚN CONTEXTO ---

    LaunchedEffect(paymentStatus, showReceiptQr, inactivityTimerSeed) {
        showInactivityDialog = false
        inactivityCountdown = 0

        val isPaymentPhase = paymentStatus == null || paymentStatus == "CANCELLED"
        val isReceiptPhase = paymentStatus == "PAID" && showReceiptQr

        // Si no estamos ni en pago (QR) ni en comprobante (QR fallback), no hacemos guard
        if (!isPaymentPhase && !isReceiptPhase) {
            return@LaunchedEffect
        }

        // Timeout base según contexto:
        // - QR de pago: 2 minutos
        // - QR de comprobante (fallback impresora): 1 minuto
        val timeoutMillis = when {
            isPaymentPhase -> 120_000L  // 2 minutos
            isReceiptPhase -> 60_000L   // 1 minuto
            else -> 90_000L             // fallback defensivo, no debería entrar acá
        }

        delay(timeoutMillis)

        // Re-chequeo después de la espera, por si cambió algo en el medio
        val stillPaymentPhase = paymentStatus == null || paymentStatus == "CANCELLED"
        val stillReceiptPhase = paymentStatus == "PAID" && showReceiptQr

        if (stillPaymentPhase || stillReceiptPhase) {
            // Duración del popup según contexto
            val popupSeconds = if (stillPaymentPhase) 20 else 15

            inactivityCountdown = popupSeconds
            showInactivityDialog = true
            inactivityDialogSession++
        }
    }

    // Countdown del popup: si nadie toca → cancelar / volver al inicio
    LaunchedEffect(inactivityDialogSession) {
        if (showInactivityDialog && inactivityCountdown > 0) {
            while (inactivityCountdown > 0 && showInactivityDialog) {
                delay(1000)
                inactivityCountdown--
            }
            if (showInactivityDialog && inactivityCountdown <= 0) {
                showInactivityDialog = false
                onCancel()
            }
        }
    }

    // 🧠 Auto-"Seguir aquí" si se aprueba el pago mientras está abierto el popup en contexto QR PAGO
    LaunchedEffect(paymentStatus, showInactivityDialog, showReceiptQr) {
        val isPaymentPhase = paymentStatus == null || paymentStatus == "CANCELLED"
        // "aprobado" + popup abierto + estamos en flujo de pago (no en comprobante fallback)
        if (showInactivityDialog && paymentStatus == "PAID" && !showReceiptQr) {
            // Equivalente a que el usuario toque "Seguir aquí":
            showInactivityDialog = false
            inactivityCountdown = 0
            inactivityTimerSeed++ // rearmamos el timer para posteriores inactividades
        }
    }

    Surface(modifier = Modifier.fillMaxSize()) {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "Escaneá el código para pagar",
                    style = MaterialTheme.typography.headlineSmall,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Orden #$orderId",
                    style = MaterialTheme.typography.titleMedium
                )

                total?.let {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Total: $ $it",
                        style = MaterialTheme.typography.titleMedium
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                if (paymentStatus == "PAID") {
                    Text(
                        text = "✅ Pago aprobado.\nTu pedido está en preparación.",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF2E7D32),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                } else if (paymentStatus == "CANCELLED") {
                    Text(
                        text = "❌ Pago rechazado o cancelado.\nIntentá nuevamente el pago.",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFC62828),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(bottom = 16.dp)
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                // QR de pago (solo mientras no está PAID)
                if (paymentQrBitmap != null && paymentStatus != "PAID") {
                    Image(
                        bitmap = paymentQrBitmap.asImageBitmap(),
                        contentDescription = "QR de pago Mercado Pago",
                        modifier = Modifier
                            .size(280.dp)
                    )
                }

                // QR de comprobante online: solo si la impresión falló
                if (showReceiptQr && receiptQrBitmap != null) {
                    Spacer(modifier = Modifier.height(24.dp))
                    Text(
                        text = "No se pudo imprimir.\nEscaneá este QR para ver tu comprobante:",
                        style = MaterialTheme.typography.bodyMedium,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Image(
                        bitmap = receiptQrBitmap!!.asImageBitmap(),
                        contentDescription = "QR de comprobante",
                        modifier = Modifier.size(240.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = "Escaneá este QR con la app de Mercado Pago o tu banco.",
                    style = MaterialTheme.typography.bodyMedium,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(24.dp))
                
                // Botón cambiar método de pago (solo si no está pagado y hay callback)
                if (paymentStatus != "PAID" && onChangePaymentMethod != null) {
                    OutlinedButton(
                        onClick = onChangePaymentMethod,
                        modifier = Modifier.padding(bottom = 12.dp)
                    ) {
                        Text("Cambiar método de pago")
                    }
                }

                Button(onClick = onCancel) {
                    Text(
                        text = if (paymentStatus == "PAID") "Nuevo pedido" else "Cancelar / Volver al menú"
                    )
                }
            }

            // Popup de inactividad
            if (showInactivityDialog) {
                AlertDialog(
                    onDismissRequest = {
                        // Si toca afuera, asumimos que quiere seguir
                        showInactivityDialog = false
                        inactivityCountdown = 0
                        inactivityTimerSeed++ // reiniciamos el timer
                    },
                    title = {
                        Text(text = "¿Seguís ahí?")
                    },
                    text = {
                        Text(
                            text = if (paymentStatus == "PAID" && showReceiptQr) {
                                "Parece que ya terminaste.\n" +
                                        "Si no confirmás, volveremos al inicio en ${inactivityCountdown}s."
                            } else {
                                "Pasó un rato sin actividad.\n" +
                                        "Si no confirmás, el kiosko se reiniciará en ${inactivityCountdown}s."
                            }
                        )
                    },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                showInactivityDialog = false
                                inactivityCountdown = 0
                                inactivityTimerSeed++ // vuelve a arrancar el ciclo
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
                                onCancel()
                            }
                        ) {
                            Text("Cancelar y volver al inicio")
                        }
                    }
                )
            }
        }
    }
}

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
