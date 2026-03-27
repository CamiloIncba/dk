package com.norpan.kiosko.printing

import java.io.ByteArrayOutputStream
import java.nio.charset.Charset

/**
 * Utilidades básicas para generar comandos ESC/POS.
 * Pensado para impresoras térmicas 58mm y 80mm.
 * 
 * Usa Code Page 850 (PC850 Multilingual) para soporte de
 * caracteres latinos (á, é, í, ó, ú, ñ, etc.)
 */
object EscPosPrinter {

    // Code Page 850 (PC850) - Multilingual Latin I
    // Soporta: áéíóúñÁÉÍÓÚÑüÜ¿¡ etc.
    private val charset: Charset = Charset.forName("CP850")

    // Comandos base ESC/POS
    private val ESC = 0x1B.toByte()
    private val GS = 0x1D.toByte()

    fun init(out: ByteArrayOutputStream) {
        out.write(byteArrayOf(ESC, 0x40)) // ESC @ (initialize printer)
        // Seleccionar Code Page 850 (PC850 Multilingual)
        // ESC t n donde n=2 es PC850 en la mayoría de impresoras
        out.write(byteArrayOf(ESC, 0x74, 0x02))
    }

    fun setAlignLeft(out: ByteArrayOutputStream) {
        out.write(byteArrayOf(ESC, 0x61, 0x00))
    }

    fun setAlignCenter(out: ByteArrayOutputStream) {
        out.write(byteArrayOf(ESC, 0x61, 0x01))
    }

    fun setAlignRight(out: ByteArrayOutputStream) {
        out.write(byteArrayOf(ESC, 0x61, 0x02))
    }

    fun setBold(out: ByteArrayOutputStream, enabled: Boolean) {
        out.write(byteArrayOf(ESC, 0x45, if (enabled) 0x01 else 0x00))
    }

    /**
     * Activa/desactiva doble altura y doble ancho.
     * @param doubleHeight true para doble altura
     * @param doubleWidth true para doble ancho (default: igual que altura)
     */
    fun setFontDoubleHeightWidth(out: ByteArrayOutputStream, enabled: Boolean) {
        // GS ! n - Bits: 0-2=ancho, 4-6=altura
        // 0x00 = normal, 0x11 = doble alto y ancho, 0x10 = solo doble alto
        out.write(byteArrayOf(GS, 0x21, if (enabled) 0x11 else 0x00))
    }

    /**
     * Solo doble altura (sin doble ancho)
     */
    fun setDoubleHeight(out: ByteArrayOutputStream, enabled: Boolean) {
        out.write(byteArrayOf(GS, 0x21, if (enabled) 0x10 else 0x00))
    }

    /**
     * Tamaño de fuente extra grande (4x alto, 2x ancho)
     * Útil para números de pedido
     */
    fun setFontExtraLarge(out: ByteArrayOutputStream, enabled: Boolean) {
        // GS ! n - n = (altura-1) * 16 + (ancho-1)
        // altura 4, ancho 2 = 3*16 + 1 = 0x31
        out.write(byteArrayOf(GS, 0x21, if (enabled) 0x31 else 0x00))
    }

    fun printText(out: ByteArrayOutputStream, text: String) {
        out.write(text.toByteArray(charset))
    }

    fun printLn(out: ByteArrayOutputStream, text: String = "") {
        printText(out, text)
        out.write(byteArrayOf(0x0A))
    }

    fun feedLines(out: ByteArrayOutputStream, lines: Int = 1) {
        repeat(lines) { out.write(byteArrayOf(0x0A)) }
    }

    fun cut(out: ByteArrayOutputStream) {
        // Corte parcial (no todas las impresoras lo soportan, pero la mayoría sí)
        out.write(byteArrayOf(GS, 0x56, 0x01))
    }
}
