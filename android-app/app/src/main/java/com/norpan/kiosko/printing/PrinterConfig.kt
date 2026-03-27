package com.norpan.kiosko.printing

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import com.norpan.kiosko.KioskoApplication

/**
 * Configuración dinámica de impresoras.
 * Soporta 2 impresoras:
 * - KIOSKO (POS80-CX): Ticket completo para el cliente
 * - COCINA (XP-58IIH BT): Comanda simplificada para cocina
 * 
 * Las MACs se guardan en SharedPreferences y se configuran desde la pantalla de ajustes.
 */
object PrinterConfig {

    private const val PREFS_NAME = "printer_config"
    
    private val prefs: SharedPreferences by lazy {
        KioskoApplication.instance.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    // ─────────────────────────────────────────────────────────────
    // DATOS DEL NEGOCIO (para tickets)
    // ─────────────────────────────────────────────────────────────

    var STORE_NAME: String
        get() = prefs.getString("store_name", "CASA RICA - Comida Rápida") ?: "CASA RICA - Comida Rápida"
        set(value) = prefs.edit { putString("store_name", value) }

    var STORE_ADDRESS: String
        get() = prefs.getString("store_address", "Tucumán 74 - Jesús María, Córdoba") ?: "Tucumán 74 - Jesús María, Córdoba"
        set(value) = prefs.edit { putString("store_address", value) }

    var STORE_FOOTER: String
        get() = prefs.getString("store_footer", "¡Gracias por tu compra!") ?: "¡Gracias por tu compra!"
        set(value) = prefs.edit { putString("store_footer", value) }

    // ─────────────────────────────────────────────────────────────
    // IMPRESORA KIOSKO (Ticket Cliente - POS80-CX 80mm)
    // ─────────────────────────────────────────────────────────────

    var PRINTER_MAC_ADDRESS: String
        get() = prefs.getString("kiosk_printer_mac", "") ?: ""
        set(value) = prefs.edit { putString("kiosk_printer_mac", value) }

    var kioskPrinterName: String
        get() = prefs.getString("kiosk_printer_name", "") ?: ""
        set(value) = prefs.edit { putString("kiosk_printer_name", value) }

    var kioskPrinterEnabled: Boolean
        get() = prefs.getBoolean("kiosk_printer_enabled", true)
        set(value) = prefs.edit { putBoolean("kiosk_printer_enabled", value) }

    // Ancho de papel (caracteres por línea)
    // POS80-CX (80mm) = 48 caracteres
    var kioskPrinterWidth: Int
        get() = prefs.getInt("kiosk_printer_width", 48)
        set(value) = prefs.edit { putInt("kiosk_printer_width", value) }

    // ─────────────────────────────────────────────────────────────
    // IMPRESORA COCINA (Comanda - XP-58IIH BT 58mm)
    // ─────────────────────────────────────────────────────────────

    var kitchenPrinterMac: String
        get() = prefs.getString("kitchen_printer_mac", "") ?: ""
        set(value) = prefs.edit { putString("kitchen_printer_mac", value) }

    var kitchenPrinterName: String
        get() = prefs.getString("kitchen_printer_name", "") ?: ""
        set(value) = prefs.edit { putString("kitchen_printer_name", value) }

    var kitchenPrinterEnabled: Boolean
        get() = prefs.getBoolean("kitchen_printer_enabled", true)
        set(value) = prefs.edit { putBoolean("kitchen_printer_enabled", value) }

    // XP-58IIH BT (58mm) = 32 caracteres
    var kitchenPrinterWidth: Int
        get() = prefs.getInt("kitchen_printer_width", 32)
        set(value) = prefs.edit { putInt("kitchen_printer_width", value) }

    // ─────────────────────────────────────────────────────────────
    // OPCIONES DE IMPRESIÓN
    // ─────────────────────────────────────────────────────────────

    // Auto-imprimir comanda a cocina cuando se confirma pedido
    var autoPrintKitchenTicket: Boolean
        get() = prefs.getBoolean("auto_print_kitchen", true)
        set(value) = prefs.edit { putBoolean("auto_print_kitchen", value) }

    // Auto-imprimir ticket cliente cuando se confirma pago
    var autoPrintCustomerTicket: Boolean
        get() = prefs.getBoolean("auto_print_customer", true)
        set(value) = prefs.edit { putBoolean("auto_print_customer", value) }

    // ─────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────

    fun isKioskPrinterConfigured(): Boolean = PRINTER_MAC_ADDRESS.isNotBlank()
    
    fun isKitchenPrinterConfigured(): Boolean = kitchenPrinterMac.isNotBlank()

    fun resetToDefaults() {
        prefs.edit { clear() }
    }
}
