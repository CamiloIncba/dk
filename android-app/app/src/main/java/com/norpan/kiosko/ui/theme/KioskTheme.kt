package com.norpan.kiosko.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import com.norpan.kiosko.data.KioskConfig

/**
 * Tema dinámico del kiosko que usa los colores de KioskConfig.
 * Permite cambiar colores en tiempo real desde el menú secreto.
 */
@Composable
fun KioskTheme(
    content: @Composable () -> Unit
) {
    // Leemos los colores de KioskConfig
    val primary = remember { KioskConfig.primaryColor }
    val secondary = remember { KioskConfig.secondaryColor }
    val background = remember { KioskConfig.backgroundColor }
    val surface = remember { KioskConfig.surfaceColor }
    val onBackground = remember { KioskConfig.textColor }
    val accent = remember { KioskConfig.accentColor }

    val colorScheme = darkColorScheme(
        primary = primary,
        onPrimary = calculateOnColor(primary),
        secondary = secondary,
        onSecondary = calculateOnColor(secondary),
        tertiary = accent,
        onTertiary = calculateOnColor(accent),
        background = background,
        onBackground = onBackground,
        surface = surface,
        onSurface = onBackground,
        surfaceVariant = surface.copy(alpha = 0.8f),
        onSurfaceVariant = onBackground.copy(alpha = 0.8f),
        error = Color(0xFFCF6679),
        onError = Color.Black
    )

    MaterialTheme(
        colorScheme = colorScheme,
        typography = KioskTypography,
        content = content
    )
}

/**
 * Calcula el color "on" (texto sobre un fondo) basado en luminancia.
 */
private fun calculateOnColor(background: Color): Color {
    val luminance = 0.299 * background.red + 0.587 * background.green + 0.114 * background.blue
    return if (luminance > 0.5) Color.Black else Color.White
}

/**
 * Colores adicionales para el kiosko (fuera del ColorScheme de Material).
 */
object KioskColors {
    val cardBackground: Color get() = KioskConfig.surfaceColor
    val cardBorder: Color get() = KioskConfig.primaryColor.copy(alpha = 0.3f)
    val priceText: Color get() = KioskConfig.primaryColor
    val addToCartButton: Color get() = KioskConfig.accentColor
    val categorySelected: Color get() = KioskConfig.primaryColor
    val categoryUnselected: Color get() = KioskConfig.surfaceColor.copy(alpha = 0.6f)
    val cartBackground: Color get() = KioskConfig.surfaceColor
    val checkoutButton: Color get() = KioskConfig.accentColor
    val quantityBadge: Color get() = KioskConfig.secondaryColor
    val attractOverlay: Color get() = Color.Black.copy(alpha = 0.4f)
}
