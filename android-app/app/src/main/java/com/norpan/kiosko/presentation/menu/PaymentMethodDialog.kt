package com.norpan.kiosko.presentation.menu

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

/**
 * Enumeración de métodos de pago disponibles
 */
enum class PaymentMethod {
    QR,      // Pago con QR de Mercado Pago
    CARD     // Pago con tarjeta en terminal Point
}

/**
 * Diálogo para seleccionar el método de pago.
 * Muestra dos opciones grandes y vistosas: QR y Débito/Tarjeta
 */
@Composable
fun PaymentMethodDialog(
    total: Double,
    onMethodSelected: (PaymentMethod) -> Unit,
    onDismiss: () -> Unit
) {
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = true,
            usePlatformDefaultWidth = false
        )
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth(0.85f)
                .wrapContentHeight(),
            shape = RoundedCornerShape(24.dp),
            color = Color(0xFF1A1A2E),
            shadowElevation = 16.dp
        ) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header con título y botón cerrar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "¿Cómo desea pagar?",
                        style = MaterialTheme.typography.headlineMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    
                    IconButton(onClick = onDismiss) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Cerrar",
                            tint = Color.White.copy(alpha = 0.7f)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Total a pagar
                Text(
                    text = "Total: $${String.format("%,.0f", total)}",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF00D4AA)
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Opciones de pago en fila
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Opción QR
                    PaymentMethodOption(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.QrCode2,
                        title = "QR",
                        subtitle = "Escanea con tu app",
                        gradientColors = listOf(
                            Color(0xFF00B4D8),
                            Color(0xFF0077B6)
                        ),
                        onClick = { onMethodSelected(PaymentMethod.QR) }
                    )

                    // Opción Tarjeta
                    PaymentMethodOption(
                        modifier = Modifier.weight(1f),
                        icon = Icons.Default.CreditCard,
                        title = "TARJETA",
                        subtitle = "Débito o Crédito",
                        gradientColors = listOf(
                            Color(0xFFE040FB),
                            Color(0xFF7C4DFF)
                        ),
                        onClick = { onMethodSelected(PaymentMethod.CARD) }
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Texto informativo
                Text(
                    text = "Seleccione su método de pago preferido",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = 0.6f),
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}

/**
 * Botón grande para seleccionar método de pago
 */
@Composable
private fun PaymentMethodOption(
    modifier: Modifier = Modifier,
    icon: ImageVector,
    title: String,
    subtitle: String,
    gradientColors: List<Color>,
    onClick: () -> Unit
) {
    Box(
        modifier = modifier
            .height(180.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(
                brush = Brush.verticalGradient(gradientColors)
            )
            .border(
                width = 2.dp,
                color = Color.White.copy(alpha = 0.3f),
                shape = RoundedCornerShape(20.dp)
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.padding(16.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = title,
                modifier = Modifier.size(64.dp),
                tint = Color.White
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Text(
                text = title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.85f),
                textAlign = TextAlign.Center
            )
        }
    }
}
