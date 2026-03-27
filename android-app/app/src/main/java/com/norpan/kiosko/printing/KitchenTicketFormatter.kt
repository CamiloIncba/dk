package com.norpan.kiosko.printing

import java.io.ByteArrayOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Construye la COMANDA de cocina en formato ESC/POS.
 * 
 * Diseñada para impresoras 58mm (XP-58IIH BT) - 32 caracteres.
 * Formato simplificado: solo lo esencial para preparar el pedido.
 *
 * Incluye:
 * - Número de pedido (grande y destacado)
 * - Hora
 * - Detalle de items con extras
 * - Sin precios (no necesarios en cocina)
 */
object KitchenTicketFormatter {

    private val timeFormatter = SimpleDateFormat("HH:mm", Locale.getDefault())

    data class KitchenItem(
        val productName: String,
        val quantity: Int,
        val extras: List<String> = emptyList(), // Solo nombres de extras
        val notes: String? = null               // Notas especiales
    )

    data class KitchenTicketData(
        val orderId: Int,
        val items: List<KitchenItem> = emptyList(),
        val receiptCode: String? = null  // Ej: "A-001"
    )

    /**
     * Construye la comanda de cocina.
     * Optimizada para lectura rápida.
     */
    fun buildKitchenTicket(data: KitchenTicketData): ByteArray {
        val out = ByteArrayOutputStream()
        val width = PrinterConfig.kitchenPrinterWidth // 32 para 58mm

        EscPosPrinter.init(out)

        // ═══════════════════════════════════════════════════════════
        // ENCABEZADO - Número de pedido grande
        // ═══════════════════════════════════════════════════════════
        
        EscPosPrinter.setAlignCenter(out)
        EscPosPrinter.setBold(out, true)
        EscPosPrinter.setFontDoubleHeightWidth(out, true)
        
        // Si hay código de recibo, mostrarlo grande
        if (!data.receiptCode.isNullOrBlank()) {
            EscPosPrinter.printLn(out, data.receiptCode)
        } else {
            EscPosPrinter.printLn(out, "#${data.orderId}")
        }
        
        EscPosPrinter.setFontDoubleHeightWidth(out, false)
        EscPosPrinter.setBold(out, false)

        // Hora
        val now = Date()
        EscPosPrinter.printLn(out, timeFormatter.format(now))

        EscPosPrinter.printLn(out, "=".repeat(width))
        EscPosPrinter.feedLines(out, 1)

        // ═══════════════════════════════════════════════════════════
        // DETALLE DE ITEMS
        // ═══════════════════════════════════════════════════════════
        
        EscPosPrinter.setAlignLeft(out)

        for (item in data.items) {
            // Cantidad x Producto (en negrita, SIN ABREVIAR)
            EscPosPrinter.setBold(out, true)
            // Imprimir nombre completo del producto (puede ocupar varias líneas)
            val productLine = "${item.quantity}x ${item.productName}"
            for (line in wrapText(productLine, width)) {
                EscPosPrinter.printLn(out, line)
            }
            EscPosPrinter.setBold(out, false)

            // Extras (indentados, SIN ABREVIAR)
            for (extra in item.extras) {
                val extraLine = "  + $extra"
                for (line in wrapText(extraLine, width)) {
                    EscPosPrinter.printLn(out, line)
                }
            }

            // Notas especiales (si las hay, SIN ABREVIAR)
            if (!item.notes.isNullOrBlank()) {
                val noteLine = "  * ${item.notes}"
                for (line in wrapText(noteLine, width)) {
                    EscPosPrinter.printLn(out, line)
                }
            }

            EscPosPrinter.printLn(out, "") // Línea en blanco entre items
        }

        EscPosPrinter.printLn(out, "=".repeat(width))

        // ═══════════════════════════════════════════════════════════
        // PIE - Solo recordatorio del número
        // ═══════════════════════════════════════════════════════════
        
        EscPosPrinter.setAlignCenter(out)
        EscPosPrinter.setBold(out, true)
        
        if (!data.receiptCode.isNullOrBlank()) {
            EscPosPrinter.printLn(out, "PEDIDO ${data.receiptCode}")
        } else {
            EscPosPrinter.printLn(out, "PEDIDO #${data.orderId}")
        }
        
        EscPosPrinter.setBold(out, false)

        // Feed extra y corte
        EscPosPrinter.feedLines(out, 4)
        EscPosPrinter.cut(out)

        return out.toByteArray()
    }

    /**
     * Divide texto largo en múltiples líneas sin cortar palabras.
     * NO abrevia ni trunca el contenido.
     */
    private fun wrapText(text: String, maxWidth: Int): List<String> {
        if (text.length <= maxWidth) return listOf(text)
        
        val lines = mutableListOf<String>()
        val words = text.split(" ")
        var currentLine = StringBuilder()
        
        for (word in words) {
            if (currentLine.isEmpty()) {
                // Primera palabra de la línea
                if (word.length > maxWidth) {
                    // Palabra muy larga, forzar división por caracteres
                    var remaining = word
                    while (remaining.length > maxWidth) {
                        lines.add(remaining.take(maxWidth))
                        remaining = remaining.drop(maxWidth)
                    }
                    currentLine = StringBuilder(remaining)
                } else {
                    currentLine.append(word)
                }
            } else if (currentLine.length + 1 + word.length <= maxWidth) {
                // Cabe en la línea actual
                currentLine.append(" ").append(word)
            } else {
                // Nueva línea
                lines.add(currentLine.toString())
                if (word.length > maxWidth) {
                    var remaining = word
                    while (remaining.length > maxWidth) {
                        lines.add(remaining.take(maxWidth))
                        remaining = remaining.drop(maxWidth)
                    }
                    currentLine = StringBuilder(remaining)
                } else {
                    currentLine = StringBuilder(word)
                }
            }
        }
        
        if (currentLine.isNotEmpty()) {
            lines.add(currentLine.toString())
        }
        
        return lines
    }
}
