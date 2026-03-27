package com.norpan.kiosko.presentation.menu

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.norpan.kiosko.data.remote.dto.ExtraOptionDto
import com.norpan.kiosko.data.remote.dto.ProductDto
import com.norpan.kiosko.data.remote.dto.ProductExtraGroupDto

// Colores específicos para el diálogo con fondo blanco
private val DialogTextPrimary = Color(0xFF1A1A1A)
private val DialogTextSecondary = Color(0xFF666666)
private val DialogAccentColor = Color(0xFF388E3C)
private val DialogErrorColor = Color(0xFFD32F2F)
private val DialogBorderColor = Color(0xFFBDBDBD)
private val DialogBackgroundSelected = Color(0xFFE8F5E9)

@Composable
fun ExtrasSelectionDialog(
    product: ProductDto,
    extraGroups: List<ProductExtraGroupDto>,
    isLoading: Boolean,
    onConfirm: (List<SelectedExtra>) -> Unit,
    onDismiss: () -> Unit
) {
    // Estado de selecciones: groupId -> (optionId -> quantity)
    var selections by remember { mutableStateOf<Map<Int, Map<Int, Int>>>(emptyMap()) }

    // Inicializar selecciones vacías
    LaunchedEffect(extraGroups) {
        val initial = extraGroups.associate { group ->
            group.groupId to emptyMap<Int, Int>()
        }
        selections = initial
    }

    // Obtener opciones disponibles para un grupo
    fun getAvailableOptions(group: ProductExtraGroupDto): List<Pair<ExtraOptionDto, Double>> {
        return if (!group.customOptions.isNullOrEmpty()) {
            // Usar opciones personalizadas
            group.customOptions.map { co ->
                val finalPrice = co.priceOverride ?: co.option.price
                co.option to finalPrice
            }
        } else {
            // Usar todas las opciones del grupo
            group.group.options.filter { it.active }.map { it to it.price }
        }
    }

    // Obtener máximo de selecciones para un grupo
    fun getMaxSelections(group: ProductExtraGroupDto): Int {
        return group.maxSelections 
            ?: group.group.maxSelections 
            ?: 999
    }

    // Total seleccionado en un grupo
    fun getTotalSelected(groupId: Int): Int {
        return selections[groupId]?.values?.sum() ?: 0
    }

    // Toggle opción
    fun toggleOption(groupId: Int, optionId: Int, maxSel: Int) {
        val groupSel = selections[groupId]?.toMutableMap() ?: mutableMapOf()
        val current = groupSel[optionId] ?: 0
        val totalSelected = getTotalSelected(groupId)

        if (current > 0) {
            groupSel.remove(optionId)
        } else if (totalSelected < maxSel) {
            groupSel[optionId] = 1
        }

        selections = selections + (groupId to groupSel)
    }

    // Validar mínimos
    fun isValid(): Boolean {
        for (group in extraGroups) {
            val min = group.group.minSelections
            val selected = getTotalSelected(group.groupId)
            if (selected < min) return false
        }
        return true
    }

    // Calcular total de extras
    fun getExtrasTotal(): Double {
        var total = 0.0
        for (group in extraGroups) {
            val options = getAvailableOptions(group)
            val groupSel = selections[group.groupId] ?: emptyMap()
            for ((optionId, qty) in groupSel) {
                val opt = options.find { it.first.id == optionId }
                if (opt != null) {
                    total += opt.second * qty
                }
            }
        }
        return total
    }

    // Construir lista de extras seleccionados
    fun buildSelectedExtras(): List<SelectedExtra> {
        val result = mutableListOf<SelectedExtra>()
        for (group in extraGroups) {
            val options = getAvailableOptions(group)
            val groupSel = selections[group.groupId] ?: emptyMap()
            for ((optionId, qty) in groupSel) {
                if (qty > 0) {
                    val opt = options.find { it.first.id == optionId }
                    if (opt != null) {
                        result.add(
                            SelectedExtra(
                                optionId = optionId,
                                optionName = opt.first.name,
                                price = opt.second,
                                quantity = qty
                            )
                        )
                    }
                }
            }
        }
        return result
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = true,
            usePlatformDefaultWidth = false
        )
    ) {
        Card(
            modifier = Modifier
                .fillMaxWidth(0.9f)
                .fillMaxHeight(0.85f),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White)
        ) {
            Column(
                modifier = Modifier.fillMaxSize()
            ) {
                // Header
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF5F5F5))
                        .padding(20.dp)
                ) {
                    Text(
                        text = product.name,
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = DialogTextPrimary
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Personalizá tu pedido",
                        style = MaterialTheme.typography.bodyMedium,
                        color = DialogTextSecondary
                    )
                }

                // Content
                if (isLoading) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                } else if (extraGroups.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("No hay extras disponibles")
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        items(extraGroups) { group ->
                            val options = getAvailableOptions(group)
                            val maxSel = getMaxSelections(group)
                            val minSel = group.group.minSelections
                            val totalSelected = getTotalSelected(group.groupId)

                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 24.dp)
                            ) {
                                // Título del grupo
                                Text(
                                    text = group.group.name,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = DialogTextPrimary
                                )
                                
                                // Info de selección
                                Row(
                                    modifier = Modifier.padding(vertical = 4.dp),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    if (minSel > 0) {
                                        Text(
                                            text = "Mínimo $minSel",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = if (totalSelected < minSel) 
                                                DialogErrorColor 
                                            else 
                                                DialogTextSecondary
                                        )
                                    }
                                    if (maxSel < 999) {
                                        Text(
                                            text = "Máximo $maxSel",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = DialogTextSecondary
                                        )
                                    }
                                    Text(
                                        text = "$totalSelected seleccionados",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = if (totalSelected < minSel) 
                                            DialogErrorColor 
                                        else 
                                            DialogAccentColor,
                                        fontWeight = FontWeight.Medium
                                    )
                                }

                                Spacer(modifier = Modifier.height(8.dp))

                                // Opciones
                                options.forEach { (option, price) ->
                                    val isSelected = (selections[group.groupId]?.get(option.id) ?: 0) > 0
                                    val canSelect = isSelected || totalSelected < maxSel

                                    OptionItem(
                                        name = option.name,
                                        price = price,
                                        isSelected = isSelected,
                                        enabled = canSelect || isSelected,
                                        onClick = { toggleOption(group.groupId, option.id, maxSel) }
                                    )
                                    
                                    Spacer(modifier = Modifier.height(8.dp))
                                }
                            }
                        }
                    }
                }

                // Footer
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF5F5F5))
                        .padding(16.dp)
                ) {
                    // Totales
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Producto:",
                            style = MaterialTheme.typography.bodyMedium,
                            color = DialogTextSecondary
                        )
                        Text(
                            text = "$ ${product.price}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = DialogTextPrimary
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Extras:",
                            style = MaterialTheme.typography.bodyMedium,
                            color = DialogTextSecondary
                        )
                        Text(
                            text = "$ ${getExtrasTotal()}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = DialogTextPrimary
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Divider(color = DialogBorderColor)
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Total:",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = DialogTextPrimary
                        )
                        Text(
                            text = "$ ${product.price + getExtrasTotal()}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = DialogAccentColor
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Botones
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        OutlinedButton(
                            onClick = onDismiss,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Cancelar")
                        }
                        Button(
                            onClick = { onConfirm(buildSelectedExtras()) },
                            enabled = isValid(),
                            modifier = Modifier.weight(2f)
                        ) {
                            Text("Agregar al pedido")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OptionItem(
    name: String,
    price: Double,
    isSelected: Boolean,
    enabled: Boolean,
    onClick: () -> Unit
) {
    val borderColor = when {
        isSelected -> DialogAccentColor
        else -> DialogBorderColor.copy(alpha = 0.5f)
    }
    val backgroundColor = when {
        isSelected -> DialogBackgroundSelected
        else -> Color.Transparent
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .border(2.dp, borderColor, RoundedCornerShape(12.dp))
            .background(backgroundColor)
            .clickable(enabled = enabled) { onClick() }
            .padding(14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Checkbox visual
            Box(
                modifier = Modifier
                    .size(24.dp)
                    .clip(CircleShape)
                    .background(
                        if (isSelected) DialogAccentColor 
                        else Color.Transparent
                    )
                    .border(
                        2.dp,
                        if (isSelected) DialogAccentColor 
                        else DialogBorderColor,
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                if (isSelected) {
                    Icon(
                        Icons.Default.Check,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp)
                    )
                }
            }

            Text(
                text = name,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                color = if (enabled) 
                    DialogTextPrimary 
                else 
                    DialogTextPrimary.copy(alpha = 0.5f)
            )
        }

        Text(
            text = if (price > 0) "+$ $price" else "Gratis",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
            color = if (price == 0.0) 
                DialogAccentColor 
            else 
                DialogTextSecondary
        )
    }
}
