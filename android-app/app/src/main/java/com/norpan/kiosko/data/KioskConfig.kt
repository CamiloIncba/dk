package com.norpan.kiosko.data

import android.content.Context
import android.content.SharedPreferences
import androidx.compose.ui.graphics.Color
import androidx.core.content.edit
import com.norpan.kiosko.KioskoApplication

/**
 * Configuración centralizada del kiosko.
 * Todo es persistido en SharedPreferences y modificable desde el menú secreto.
 */
object KioskConfig {

    private const val PREFS_NAME = "kiosk_config"

    private val prefs: SharedPreferences by lazy {
        KioskoApplication.instance.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    // ─────────────────────────────────────────────────────────────
    // ATTRACT SCREEN (Pantalla de descanso)
    // ─────────────────────────────────────────────────────────────
    
    var attractScreenEnabled: Boolean
        get() = prefs.getBoolean("attract_screen_enabled", true)
        set(value) = prefs.edit { putBoolean("attract_screen_enabled", value) }

    var attractScreenVideoUrl: String
        get() = prefs.getString("attract_video_url", "") ?: ""
        set(value) = prefs.edit { putString("attract_video_url", value) }

    var attractScreenImageUrls: List<String>
        get() = prefs.getString("attract_image_urls", "")?.split(",")?.filter { it.isNotBlank() } ?: emptyList()
        set(value) = prefs.edit { putString("attract_image_urls", value.joinToString(",")) }

    var attractScreenText: String
        get() = prefs.getString("attract_text", "TOCÁ PARA COMENZAR TU PEDIDO") ?: "TOCÁ PARA COMENZAR TU PEDIDO"
        set(value) = prefs.edit { putString("attract_text", value) }

    var attractScreenSlideshowInterval: Int
        get() = prefs.getInt("attract_slideshow_interval", 5000) // ms
        set(value) = prefs.edit { putInt("attract_slideshow_interval", value) }

    // ─────────────────────────────────────────────────────────────
    // COLORES Y TEMA
    // ─────────────────────────────────────────────────────────────

    var primaryColorHex: String
        get() = prefs.getString("primary_color", "#FFC72C") ?: "#FFC72C" // Amarillo McDonald's
        set(value) = prefs.edit { putString("primary_color", value) }

    var secondaryColorHex: String
        get() = prefs.getString("secondary_color", "#DA291C") ?: "#DA291C" // Rojo McDonald's
        set(value) = prefs.edit { putString("secondary_color", value) }

    var backgroundColorHex: String
        get() = prefs.getString("background_color", "#1A1A1A") ?: "#1A1A1A" // Fondo oscuro
        set(value) = prefs.edit { putString("background_color", value) }

    var surfaceColorHex: String
        get() = prefs.getString("surface_color", "#2D2D2D") ?: "#2D2D2D"
        set(value) = prefs.edit { putString("surface_color", value) }

    var textColorHex: String
        get() = prefs.getString("text_color", "#FFFFFF") ?: "#FFFFFF"
        set(value) = prefs.edit { putString("text_color", value) }

    var accentColorHex: String
        get() = prefs.getString("accent_color", "#4CAF50") ?: "#4CAF50" // Verde para CTA
        set(value) = prefs.edit { putString("accent_color", value) }

    // ─────────────────────────────────────────────────────────────
    // LAYOUT Y DISEÑO
    // ─────────────────────────────────────────────────────────────

    enum class LayoutStyle { GRID_2, GRID_3, LIST }
    
    var productLayoutStyle: LayoutStyle
        get() = LayoutStyle.entries.getOrNull(prefs.getInt("product_layout", 0)) ?: LayoutStyle.GRID_2
        set(value) = prefs.edit { putInt("product_layout", value.ordinal) }

    enum class CartStyle { SIDEBAR, BOTTOM_BAR, FLOATING }

    var cartStyle: CartStyle
        get() = CartStyle.entries.getOrNull(prefs.getInt("cart_style", 0)) ?: CartStyle.SIDEBAR
        set(value) = prefs.edit { putInt("cart_style", value.ordinal) }

    var cartSidebarWidthPercent: Float
        get() = prefs.getFloat("cart_sidebar_width", 0.30f) // 30% del ancho
        set(value) = prefs.edit { putFloat("cart_sidebar_width", value.coerceIn(0.2f, 0.5f)) }

    var showProductImages: Boolean
        get() = prefs.getBoolean("show_product_images", true)
        set(value) = prefs.edit { putBoolean("show_product_images", value) }

    var productImageHeight: Int
        get() = prefs.getInt("product_image_height", 180) // dp
        set(value) = prefs.edit { putInt("product_image_height", value.coerceIn(80, 300)) }

    var categoryTabsHeight: Int
        get() = prefs.getInt("category_tabs_height", 80) // dp
        set(value) = prefs.edit { putInt("category_tabs_height", value.coerceIn(50, 120)) }

    // ─────────────────────────────────────────────────────────────
    // ANIMACIONES
    // ─────────────────────────────────────────────────────────────

    var animationsEnabled: Boolean
        get() = prefs.getBoolean("animations_enabled", true)
        set(value) = prefs.edit { putBoolean("animations_enabled", value) }

    var animationDurationMs: Int
        get() = prefs.getInt("animation_duration", 300)
        set(value) = prefs.edit { putInt("animation_duration", value.coerceIn(100, 1000)) }

    // ─────────────────────────────────────────────────────────────
    // TEXTOS PERSONALIZABLES
    // ─────────────────────────────────────────────────────────────

    var businessName: String
        get() = prefs.getString("business_name", "Mi Negocio") ?: "Mi Negocio"
        set(value) = prefs.edit { putString("business_name", value) }

    var headerTitle: String
        get() = prefs.getString("header_title", "¿Qué vas a pedir hoy?") ?: "¿Qué vas a pedir hoy?"
        set(value) = prefs.edit { putString("header_title", value) }

    var cartEmptyText: String
        get() = prefs.getString("cart_empty_text", "Tu pedido está vacío") ?: "Tu pedido está vacío"
        set(value) = prefs.edit { putString("cart_empty_text", value) }

    var checkoutButtonText: String
        get() = prefs.getString("checkout_button_text", "PAGAR") ?: "PAGAR"
        set(value) = prefs.edit { putString("checkout_button_text", value) }

    // ─────────────────────────────────────────────────────────────
    // INACTIVIDAD
    // ─────────────────────────────────────────────────────────────

    var inactivityTimeoutSeconds: Int
        get() = prefs.getInt("inactivity_timeout", 90)
        set(value) = prefs.edit { putInt("inactivity_timeout", value.coerceIn(30, 300)) }

    var inactivityCountdownSeconds: Int
        get() = prefs.getInt("inactivity_countdown", 15)
        set(value) = prefs.edit { putInt("inactivity_countdown", value.coerceIn(5, 60)) }

    // ─────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────

    fun parseColor(hex: String): Color {
        return try {
            Color(android.graphics.Color.parseColor(hex))
        } catch (e: Exception) {
            Color.White
        }
    }

    val primaryColor: Color get() = parseColor(primaryColorHex)
    val secondaryColor: Color get() = parseColor(secondaryColorHex)
    val backgroundColor: Color get() = parseColor(backgroundColorHex)
    val surfaceColor: Color get() = parseColor(surfaceColorHex)
    val textColor: Color get() = parseColor(textColorHex)
    val accentColor: Color get() = parseColor(accentColorHex)

    /**
     * Restaura todos los valores a sus defaults.
     */
    fun resetToDefaults() {
        prefs.edit { clear() }
    }

    /**
     * Presets de tema
     */
    fun applyMcDonaldsTheme() {
        primaryColorHex = "#FFC72C"
        secondaryColorHex = "#DA291C"
        backgroundColorHex = "#1A1A1A"
        surfaceColorHex = "#2D2D2D"
        textColorHex = "#FFFFFF"
        accentColorHex = "#27AE60"
    }

    fun applyBurgerKingTheme() {
        primaryColorHex = "#FF8732"
        secondaryColorHex = "#D62300"
        backgroundColorHex = "#502314"
        surfaceColorHex = "#3D1A0F"
        textColorHex = "#FFFFFF"
        accentColorHex = "#F5EBDC"
    }

    fun applyLightTheme() {
        primaryColorHex = "#2196F3"
        secondaryColorHex = "#1976D2"
        backgroundColorHex = "#FAFAFA"
        surfaceColorHex = "#FFFFFF"
        textColorHex = "#212121"
        accentColorHex = "#4CAF50"
    }

    fun applyBakeryTheme() {
        primaryColorHex = "#8B4513"
        secondaryColorHex = "#D2691E"
        backgroundColorHex = "#FFF8DC"
        surfaceColorHex = "#FFFFFF"
        textColorHex = "#3E2723"
        accentColorHex = "#4CAF50"
    }
}
