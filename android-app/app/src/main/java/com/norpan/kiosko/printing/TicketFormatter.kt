package com.norpan.kiosko.printing

import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Construye el ticket del cliente en formato ESC/POS.
 *
 * Incluye:
 * - Encabezado con nombre del local
 * - Fecha/hora
 * - N° de pedido
 * - Detalle de items con extras
 * - Total
 * - Medio de pago (texto)
 * - N° de operación MP (si lo tenemos)
 */
object TicketFormatter {

    private val dateFormatter = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())

    data class TicketExtra(
        val name: String,
        val quantity: Int,
        val unitPrice: Double
    )

    data class TicketItem(
        val productName: String,
        val quantity: Int,
        val unitPrice: Double,
        val extras: List<TicketExtra> = emptyList()
    ) {
        val lineTotal: Double
            get() {
                val productTotal = unitPrice * quantity
                val extrasTotal = extras.sumOf { it.unitPrice * it.quantity } * quantity
                return productTotal + extrasTotal
            }
    }

    data class TicketData(
        val orderId: Int,
        val total: Double?,
        val paymentMethodDescription: String,
        val paymentOperationId: String?, // ej: id de pago de Mercado Pago
        val items: List<TicketItem> = emptyList()
    )

    fun buildCustomerTicket(data: TicketData): ByteArray {
        val out = ByteArrayOutputStream()

        EscPosPrinter.init(out)

        // Encabezado - Nombre del local
        EscPosPrinter.setAlignCenter(out)
        EscPosPrinter.setBold(out, true)
        EscPosPrinter.setFontDoubleHeightWidth(out, true)
        EscPosPrinter.printLn(out, PrinterConfig.STORE_NAME)
        EscPosPrinter.setFontDoubleHeightWidth(out, false)
        EscPosPrinter.setBold(out, false)

        if (PrinterConfig.STORE_ADDRESS.isNotBlank()) {
            EscPosPrinter.printLn(out, PrinterConfig.STORE_ADDRESS)
        }

        EscPosPrinter.feedLines(out, 1)

        // Fecha y hora
        val now = Date()
        EscPosPrinter.setAlignLeft(out)
        EscPosPrinter.printLn(out, "Fecha: ${dateFormatter.format(now)}")

        EscPosPrinter.printLn(out, "================================")

        // ★ NÚMERO DE PEDIDO - GRANDE Y DESTACADO ★
        EscPosPrinter.setAlignCenter(out)
        EscPosPrinter.setBold(out, true)
        EscPosPrinter.setFontExtraLarge(out, true)
        EscPosPrinter.printLn(out, "#${data.orderId}")
        EscPosPrinter.setFontExtraLarge(out, false)
        EscPosPrinter.setDoubleHeight(out, true)
        EscPosPrinter.printLn(out, "Tu pedido")
        EscPosPrinter.setDoubleHeight(out, false)
        EscPosPrinter.setBold(out, false)
        EscPosPrinter.setAlignLeft(out)

        EscPosPrinter.printLn(out, "================================")
        EscPosPrinter.feedLines(out, 1)

        // Detalle de items
        if (data.items.isNotEmpty()) {
            for (item in data.items) {
                // Línea del producto: cantidad x nombre = precio
                val productLine = "${item.quantity}x ${item.productName}"
                val priceStr = "$ ${String.format("%.2f", item.unitPrice * item.quantity)}"
                EscPosPrinter.printLn(out, formatLineWithPrice(productLine, priceStr, 32))

                // Extras del item
                for (extra in item.extras) {
                    val extraLine = "  + ${extra.name}"
                    val extraQty = if (extra.quantity > 1) " x${extra.quantity}" else ""
                    val extraPrice = extra.unitPrice * extra.quantity * item.quantity
                    if (extraPrice > 0) {
                        EscPosPrinter.printLn(out, formatLineWithPrice("$extraLine$extraQty", "+$ ${String.format("%.2f", extraPrice)}", 32))
                    } else {
                        EscPosPrinter.printLn(out, "$extraLine$extraQty")
                    }
                }
            }
            EscPosPrinter.printLn(out, "--------------------------------")
        }

        // Total
        EscPosPrinter.setBold(out, true)
        data.total?.let {
            EscPosPrinter.printLn(out, formatLineWithPrice("TOTAL", "$ ${String.format("%.2f", it)}", 32))
        }
        EscPosPrinter.setBold(out, false)

        EscPosPrinter.printLn(out, "")
        EscPosPrinter.printLn(out, "Pago: ${data.paymentMethodDescription}")

        data.paymentOperationId?.let {
            if (it.isNotBlank()) {
                EscPosPrinter.printLn(out, "Operación MP: $it")
            }
        }

        EscPosPrinter.printLn(out, "--------------------------------")

        // Mensaje de agradecimiento
        EscPosPrinter.setAlignCenter(out)
        if (PrinterConfig.STORE_FOOTER.isNotBlank()) {
            EscPosPrinter.printLn(out, PrinterConfig.STORE_FOOTER)
        } else {
            EscPosPrinter.printLn(out, "¡Gracias!")
        }

        EscPosPrinter.feedLines(out, 4)
        EscPosPrinter.cut(out)

        return out.toByteArray()
    }

    /**
     * Formatea una línea con texto a la izquierda y precio a la derecha.
     * Ejemplo: "2x Hamburguesa........$ 1500.00"
     */
    private fun formatLineWithPrice(text: String, price: String, maxWidth: Int): String {
        val availableSpace = maxWidth - price.length - 1
        val truncatedText = if (text.length > availableSpace) {
            text.take(availableSpace - 2) + ".."
        } else {
            text
        }
        val padding = maxWidth - truncatedText.length - price.length
        return truncatedText + " ".repeat(maxOf(1, padding)) + price
    }
}
