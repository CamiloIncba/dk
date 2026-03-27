package com.norpan.kiosko.presentation.menu.components

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.norpan.kiosko.data.KioskConfig

/**
 * Panel de configuración del kiosko accesible desde el menú secreto.
 * Permite personalizar todos los aspectos visuales y de comportamiento.
 */
@Composable
fun KioskConfigPanel(
    onClose: () -> Unit,
    onApply: () -> Unit // Para forzar recomposición
) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()

    AlertDialog(
        onDismissRequest = onClose,
        modifier = Modifier
            .fillMaxWidth(0.9f)
            .heightIn(max = 600.dp),
        title = {
            Text(
                text = "⚙️ Configuración del Kiosko",
                style = MaterialTheme.typography.titleLarge
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(scrollState),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // ─────────────────────────────────────────
                // PRESETS DE TEMA
                // ─────────────────────────────────────────
                SectionHeader("🎨 Tema")
                
                ThemePresets(onApply = onApply)

                Divider()

                // ─────────────────────────────────────────
                // COLORES PERSONALIZADOS
                // ─────────────────────────────────────────
                SectionHeader("🖌️ Colores")

                ColorPickerRow(
                    label = "Color primario",
                    currentColor = KioskConfig.primaryColorHex,
                    onColorChange = { 
                        KioskConfig.primaryColorHex = it
                        onApply()
                    }
                )

                ColorPickerRow(
                    label = "Color secundario",
                    currentColor = KioskConfig.secondaryColorHex,
                    onColorChange = { 
                        KioskConfig.secondaryColorHex = it
                        onApply()
                    }
                )

                ColorPickerRow(
                    label = "Fondo",
                    currentColor = KioskConfig.backgroundColorHex,
                    onColorChange = { 
                        KioskConfig.backgroundColorHex = it
                        onApply()
                    }
                )

                ColorPickerRow(
                    label = "Texto",
                    currentColor = KioskConfig.textColorHex,
                    onColorChange = { 
                        KioskConfig.textColorHex = it
                        onApply()
                    }
                )

                Divider()

                // ─────────────────────────────────────────
                // PANTALLA DE DESCANSO
                // ─────────────────────────────────────────
                SectionHeader("🖥️ Pantalla de descanso")

                ToggleRow(
                    label = "Habilitar pantalla de descanso",
                    checked = KioskConfig.attractScreenEnabled,
                    onCheckedChange = { KioskConfig.attractScreenEnabled = it }
                )

                TextFieldRow(
                    label = "Texto de bienvenida",
                    value = KioskConfig.attractScreenText,
                    onValueChange = { KioskConfig.attractScreenText = it }
                )

                TextFieldRow(
                    label = "Nombre del negocio",
                    value = KioskConfig.businessName,
                    onValueChange = { KioskConfig.businessName = it }
                )

                SliderRow(
                    label = "Intervalo slideshow (seg)",
                    value = (KioskConfig.attractScreenSlideshowInterval / 1000).toFloat(),
                    range = 2f..15f,
                    onValueChange = { KioskConfig.attractScreenSlideshowInterval = (it * 1000).toInt() }
                )

                Divider()

                // ─────────────────────────────────────────
                // DISEÑO DE PRODUCTOS
                // ─────────────────────────────────────────
                SectionHeader("📦 Diseño de productos")

                DropdownRow(
                    label = "Layout de productos",
                    options = listOf("Grilla 2 columnas", "Grilla 3 columnas", "Lista"),
                    selectedIndex = KioskConfig.productLayoutStyle.ordinal,
                    onSelected = { 
                        KioskConfig.productLayoutStyle = KioskConfig.LayoutStyle.entries[it]
                    }
                )

                ToggleRow(
                    label = "Mostrar imágenes de productos",
                    checked = KioskConfig.showProductImages,
                    onCheckedChange = { KioskConfig.showProductImages = it }
                )

                SliderRow(
                    label = "Altura de imagen (dp)",
                    value = KioskConfig.productImageHeight.toFloat(),
                    range = 100f..300f,
                    onValueChange = { KioskConfig.productImageHeight = it.toInt() }
                )

                SliderRow(
                    label = "Altura de tabs (dp)",
                    value = KioskConfig.categoryTabsHeight.toFloat(),
                    range = 50f..120f,
                    onValueChange = { KioskConfig.categoryTabsHeight = it.toInt() }
                )

                Divider()

                // ─────────────────────────────────────────
                // CARRITO
                // ─────────────────────────────────────────
                SectionHeader("🛒 Carrito")

                DropdownRow(
                    label = "Estilo de carrito",
                    options = listOf("Sidebar lateral", "Barra inferior", "Flotante"),
                    selectedIndex = KioskConfig.cartStyle.ordinal,
                    onSelected = { 
                        KioskConfig.cartStyle = KioskConfig.CartStyle.entries[it]
                    }
                )

                SliderRow(
                    label = "Ancho del sidebar (%)",
                    value = KioskConfig.cartSidebarWidthPercent * 100,
                    range = 20f..50f,
                    onValueChange = { KioskConfig.cartSidebarWidthPercent = it / 100f }
                )

                TextFieldRow(
                    label = "Texto carrito vacío",
                    value = KioskConfig.cartEmptyText,
                    onValueChange = { KioskConfig.cartEmptyText = it }
                )

                TextFieldRow(
                    label = "Texto botón pagar",
                    value = KioskConfig.checkoutButtonText,
                    onValueChange = { KioskConfig.checkoutButtonText = it }
                )

                Divider()

                // ─────────────────────────────────────────
                // INACTIVIDAD
                // ─────────────────────────────────────────
                SectionHeader("⏱️ Inactividad")

                SliderRow(
                    label = "Timeout inactividad (seg)",
                    value = KioskConfig.inactivityTimeoutSeconds.toFloat(),
                    range = 30f..300f,
                    onValueChange = { KioskConfig.inactivityTimeoutSeconds = it.toInt() }
                )

                SliderRow(
                    label = "Cuenta regresiva (seg)",
                    value = KioskConfig.inactivityCountdownSeconds.toFloat(),
                    range = 5f..60f,
                    onValueChange = { KioskConfig.inactivityCountdownSeconds = it.toInt() }
                )

                Divider()

                // ─────────────────────────────────────────
                // ANIMACIONES
                // ─────────────────────────────────────────
                SectionHeader("✨ Animaciones")

                ToggleRow(
                    label = "Habilitar animaciones",
                    checked = KioskConfig.animationsEnabled,
                    onCheckedChange = { KioskConfig.animationsEnabled = it }
                )

                SliderRow(
                    label = "Duración animaciones (ms)",
                    value = KioskConfig.animationDurationMs.toFloat(),
                    range = 100f..1000f,
                    onValueChange = { KioskConfig.animationDurationMs = it.toInt() }
                )

                Spacer(modifier = Modifier.height(8.dp))

                // Botón de reset
                Button(
                    onClick = {
                        KioskConfig.resetToDefaults()
                        onApply()
                        Toast.makeText(context, "Configuración restaurada", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.error
                    )
                ) {
                    Text("Restaurar valores por defecto")
                }
            }
        },
        confirmButton = {
            TextButton(onClick = {
                onApply()
                onClose()
            }) {
                Text("Cerrar")
            }
        }
    )
}

@Composable
private fun SectionHeader(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.Bold,
        modifier = Modifier.padding(top = 8.dp)
    )
}

@Composable
private fun ThemePresets(onApply: () -> Unit) {
    val context = LocalContext.current
    
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        ThemePresetButton(
            name = "McDonald's",
            primaryColor = "#FFC72C",
            secondaryColor = "#DA291C",
            onClick = {
                KioskConfig.applyMcDonaldsTheme()
                onApply()
                Toast.makeText(context, "Tema McDonald's aplicado", Toast.LENGTH_SHORT).show()
            }
        )
        ThemePresetButton(
            name = "Burger King",
            primaryColor = "#FF8732",
            secondaryColor = "#D62300",
            onClick = {
                KioskConfig.applyBurgerKingTheme()
                onApply()
                Toast.makeText(context, "Tema Burger King aplicado", Toast.LENGTH_SHORT).show()
            }
        )
        ThemePresetButton(
            name = "Claro",
            primaryColor = "#2196F3",
            secondaryColor = "#1976D2",
            onClick = {
                KioskConfig.applyLightTheme()
                onApply()
                Toast.makeText(context, "Tema claro aplicado", Toast.LENGTH_SHORT).show()
            }
        )
        ThemePresetButton(
            name = "Panadería",
            primaryColor = "#8B4513",
            secondaryColor = "#D2691E",
            onClick = {
                KioskConfig.applyBakeryTheme()
                onApply()
                Toast.makeText(context, "Tema Panadería aplicado", Toast.LENGTH_SHORT).show()
            }
        )
    }
}

@Composable
private fun ThemePresetButton(
    name: String,
    primaryColor: String,
    secondaryColor: String,
    onClick: () -> Unit
) {
    val primary = try { Color(android.graphics.Color.parseColor(primaryColor)) } catch (e: Exception) { Color.Gray }
    val secondary = try { Color(android.graphics.Color.parseColor(secondaryColor)) } catch (e: Exception) { Color.Gray }

    Card(
        modifier = Modifier
            .clickable { onClick() },
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant
        )
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(primary)
                )
                Box(
                    modifier = Modifier
                        .size(24.dp)
                        .clip(CircleShape)
                        .background(secondary)
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = name,
                style = MaterialTheme.typography.labelMedium
            )
        }
    }
}

@Composable
private fun ToggleRow(
    label: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f)
        )
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = MaterialTheme.colorScheme.primary,
                checkedTrackColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)
            )
        )
    }
}

@Composable
private fun TextFieldRow(
    label: String,
    value: String,
    onValueChange: (String) -> Unit
) {
    // Estado local para manejar la edición del texto
    var textValue by remember(value) { mutableStateOf(value) }
    
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(4.dp))
        OutlinedTextField(
            value = textValue,
            onValueChange = { newValue ->
                textValue = newValue
                onValueChange(newValue)
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true
        )
    }
}

@Composable
private fun SliderRow(
    label: String,
    value: Float,
    range: ClosedFloatingPointRange<Float>,
    onValueChange: (Float) -> Unit
) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = value.toInt().toString(),
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold
            )
        }
        Slider(
            value = value,
            onValueChange = onValueChange,
            valueRange = range
        )
    }
}

@Composable
private fun DropdownRow(
    label: String,
    options: List<String>,
    selectedIndex: Int,
    onSelected: (Int) -> Unit
) {
    var expanded by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(4.dp))
        Box {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = true },
                shape = RoundedCornerShape(8.dp)
            ) {
                Text(
                    text = options.getOrElse(selectedIndex) { options.firstOrNull() ?: "" },
                    modifier = Modifier.padding(12.dp),
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            DropdownMenu(
                expanded = expanded,
                onDismissRequest = { expanded = false }
            ) {
                options.forEachIndexed { index, option ->
                    DropdownMenuItem(
                        text = { Text(option) },
                        onClick = {
                            onSelected(index)
                            expanded = false
                        },
                        trailingIcon = if (index == selectedIndex) {
                            { Icon(Icons.Default.Check, contentDescription = null) }
                        } else null
                    )
                }
            }
        }
    }
}

@Composable
private fun ColorPickerRow(
    label: String,
    currentColor: String,
    onColorChange: (String) -> Unit
) {
    val color = try { Color(android.graphics.Color.parseColor(currentColor)) } catch (e: Exception) { Color.Gray }
    var showPicker by remember { mutableStateOf(false) }

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.weight(1f)
        )
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = currentColor,
                style = MaterialTheme.typography.labelMedium
            )
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(color)
                    .border(2.dp, Color.White, CircleShape)
                    .clickable { showPicker = true }
            )
        }
    }

    if (showPicker) {
        ColorPickerDialog(
            currentColor = currentColor,
            onColorSelected = { 
                onColorChange(it)
                showPicker = false
            },
            onDismiss = { showPicker = false }
        )
    }
}

@Composable
private fun ColorPickerDialog(
    currentColor: String,
    onColorSelected: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val presetColors = listOf(
        "#FFC72C", "#DA291C", "#FF8732", "#D62300",
        "#2196F3", "#1976D2", "#4CAF50", "#27AE60",
        "#8B4513", "#D2691E", "#9C27B0", "#673AB7",
        "#1A1A1A", "#2D2D2D", "#FFFFFF", "#FAFAFA",
        "#F5EBDC", "#FFF8DC", "#3E2723", "#212121"
    )

    var customColor by remember { mutableStateOf(currentColor) }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Elegir color") },
        text = {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    presetColors.chunked(5).forEach { row ->
                        Column(
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            row.forEach { hex ->
                                val c = try { Color(android.graphics.Color.parseColor(hex)) } catch (e: Exception) { Color.Gray }
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(CircleShape)
                                        .background(c)
                                        .border(
                                            width = if (hex == customColor) 3.dp else 1.dp,
                                            color = if (hex == customColor) MaterialTheme.colorScheme.primary else Color.White,
                                            shape = CircleShape
                                        )
                                        .clickable { customColor = hex }
                                )
                            }
                        }
                    }
                }
                
                Spacer(modifier = Modifier.height(16.dp))
                
                OutlinedTextField(
                    value = customColor,
                    onValueChange = { 
                        if (it.startsWith("#") && it.length <= 7) {
                            customColor = it
                        }
                    },
                    label = { Text("Color HEX") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onColorSelected(customColor) }) {
                Text("Aplicar")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar")
            }
        }
    )
}
