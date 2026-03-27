package com.norpan.kiosko.presentation.menu.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import coil.request.ImageRequest
import com.norpan.kiosko.data.BackendConfig
import com.norpan.kiosko.data.KioskConfig
import com.norpan.kiosko.data.remote.dto.ProductDto
import com.norpan.kiosko.presentation.menu.CartItem
import com.norpan.kiosko.ui.theme.KioskColors

/**
 * Barra de carrito horizontal en el footer estilo McDonald's.
 * Muestra los items del carrito en scroll horizontal con el total y botón de pagar.
 */
@Composable
fun CartFooterBar(
    cartItems: List<CartItem>,
    productsWithExtras: Set<Int>,
    isPlacingOrder: Boolean,
    orderError: String?,
    onRemoveItem: (String) -> Unit,
    onAddItem: (CartItem) -> Unit,
    onAddCustomizableProduct: (ProductDto) -> Unit,
    onProceedToPayment: () -> Unit,
    modifier: Modifier = Modifier
) {
    val totalItems = cartItems.sumOf { it.quantity }
    val totalAmount = cartItems.sumOf { it.itemTotal * it.quantity }
    val footerHeight = if (cartItems.isEmpty()) 100.dp else 160.dp

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .height(footerHeight),
        color = KioskColors.cartBackground,
        shadowElevation = 16.dp,
        tonalElevation = 8.dp
    ) {
        if (cartItems.isEmpty()) {
            // Footer vacío
            EmptyCartFooter()
        } else {
            // Footer con items
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                // Fila de items en scroll horizontal
                LazyRow(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(end = 16.dp)
                ) {
                    items(
                        items = cartItems,
                        key = { it.cartKey }
                    ) { item ->
                        val isCustomizable = productsWithExtras.contains(item.product.id)
                        CartItemChip(
                            item = item,
                            isCustomizable = isCustomizable,
                            onRemove = { onRemoveItem(item.cartKey) },
                            onAdd = { 
                                if (isCustomizable) {
                                    // Si es personalizable, abrir el diálogo de extras
                                    onAddCustomizableProduct(item.product)
                                } else {
                                    // Si no es personalizable, agregar directamente
                                    onAddItem(item)
                                }
                            }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Fila de total y botón de pagar
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Total
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.ShoppingCart,
                            contentDescription = null,
                            modifier = Modifier.size(24.dp),
                            tint = KioskConfig.primaryColor
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        
                        AnimatedContent(
                            targetState = totalItems,
                            transitionSpec = {
                                (slideInVertically { -it } + fadeIn()) togetherWith
                                    (slideOutVertically { it } + fadeOut())
                            },
                            label = "itemCount"
                        ) { count ->
                            Text(
                                text = "$count ${if (count == 1) "item" else "items"}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = KioskConfig.textColor.copy(alpha = 0.7f)
                            )
                        }

                        Spacer(modifier = Modifier.width(16.dp))

                        AnimatedContent(
                            targetState = totalAmount,
                            transitionSpec = {
                                (slideInVertically { -it } + fadeIn()) togetherWith
                                    (slideOutVertically { it } + fadeOut())
                            },
                            label = "totalAmount"
                        ) { amount ->
                            Text(
                                text = "Total: $ ${"%.2f".format(amount)}",
                                style = MaterialTheme.typography.titleLarge,
                                color = KioskConfig.primaryColor,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    // Botón de pagar con efecto llamativo
                    GlowingCheckoutButton(
                        text = KioskConfig.checkoutButtonText,
                        isLoading = isPlacingOrder,
                        enabled = !isPlacingOrder,
                        onClick = onProceedToPayment
                    )
                }

                // Error si existe
                orderError?.let {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.error,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }
        }
    }
}

/**
 * Botón de checkout con efecto de brillo/shimmer animado y glow pulsante.
 */
@Composable
private fun GlowingCheckoutButton(
    text: String,
    isLoading: Boolean,
    enabled: Boolean,
    onClick: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "checkoutGlow")
    
    // Animación de shimmer que recorre el botón
    val shimmerOffset by infiniteTransition.animateFloat(
        initialValue = -1f,
        targetValue = 2f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer"
    )
    
    // Animación de glow pulsante
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 0.9f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glow"
    )
    
    // Animación de escala sutil
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.02f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )
    
    val buttonColor = KioskColors.checkoutButton
    val shimmerColor = Color.White.copy(alpha = 0.4f)
    val glowColor = buttonColor.copy(alpha = glowAlpha)

    Box(
        modifier = Modifier
            .height(56.dp)
            .shadow(
                elevation = (8 + (glowAlpha * 8)).dp,
                shape = RoundedCornerShape(28.dp),
                spotColor = glowColor,
                ambientColor = glowColor
            )
    ) {
        // Glow exterior
        Box(
            modifier = Modifier
                .matchParentSize()
                .offset(y = 2.dp)
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            glowColor,
                            Color.Transparent
                        ),
                        radius = 200f
                    ),
                    shape = RoundedCornerShape(28.dp)
                )
        )
        
        // Botón principal
        Surface(
            onClick = onClick,
            enabled = enabled,
            modifier = Modifier
                .height(56.dp)
                .drawBehind {
                    // Efecto shimmer que recorre el botón
                    if (!isLoading) {
                        val shimmerWidth = size.width * 0.4f
                        val startX = shimmerOffset * size.width
                        drawRect(
                            brush = Brush.linearGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    shimmerColor,
                                    Color.Transparent
                                ),
                                start = Offset(startX - shimmerWidth, 0f),
                                end = Offset(startX + shimmerWidth, size.height)
                            )
                        )
                    }
                },
            shape = RoundedCornerShape(28.dp),
            color = if (enabled) buttonColor else buttonColor.copy(alpha = 0.5f),
            shadowElevation = 8.dp
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 32.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Procesando...",
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White
                    )
                } else {
                    // Icono de carrito
                    Icon(
                        imageVector = Icons.Default.ShoppingCart,
                        contentDescription = null,
                        modifier = Modifier.size(22.dp),
                        tint = Color.White
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = text,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color.White
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                        contentDescription = null,
                        modifier = Modifier.size(22.dp),
                        tint = Color.White
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyCartFooter() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 24.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.ShoppingCart,
            contentDescription = null,
            modifier = Modifier.size(32.dp),
            tint = KioskConfig.textColor.copy(alpha = 0.4f)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Text(
            text = KioskConfig.cartEmptyText,
            style = MaterialTheme.typography.titleMedium,
            color = KioskConfig.textColor.copy(alpha = 0.5f)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = "• Elegí productos del menú para comenzar",
            style = MaterialTheme.typography.bodyMedium,
            color = KioskConfig.textColor.copy(alpha = 0.3f)
        )
    }
}

/**
 * Chip de item del carrito para la barra horizontal.
 * Muestra imagen mini, nombre, cantidad y controles.
 */
@Composable
private fun CartItemChip(
    item: CartItem,
    isCustomizable: Boolean,
    onRemove: () -> Unit,
    onAdd: () -> Unit
) {
    Card(
        modifier = Modifier.height(80.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = KioskConfig.surfaceColor.copy(alpha = 0.8f)
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxHeight()
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Imagen del producto (pequeña)
            // Usar proxy de imágenes para dispositivos sin internet directo
            val proxiedImageUrl = BackendConfig.getProxiedImageUrl(item.product.imageUrl)
            
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(KioskConfig.primaryColor.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                if (KioskConfig.showProductImages && !proxiedImageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = ImageRequest.Builder(LocalContext.current)
                            .data(proxiedImageUrl)
                            .crossfade(true)
                            .build(),
                        contentDescription = item.product.name,
                        modifier = Modifier
                            .fillMaxHeight()
                            .clip(RoundedCornerShape(12.dp)),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Text(
                        text = item.product.name.take(2).uppercase(),
                        style = MaterialTheme.typography.titleMedium,
                        color = KioskConfig.primaryColor.copy(alpha = 0.6f)
                    )
                }
            }

            Spacer(modifier = Modifier.width(12.dp))

            // Nombre y extras
            Column(
                modifier = Modifier.width(120.dp),
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = item.product.name,
                    style = MaterialTheme.typography.bodyMedium,
                    color = KioskConfig.textColor,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                
                if (item.extras.isNotEmpty()) {
                    Text(
                        text = item.extras.joinToString(", ") { it.optionName },
                        style = MaterialTheme.typography.bodySmall,
                        color = KioskConfig.textColor.copy(alpha = 0.6f),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Text(
                    text = "$ ${"%.2f".format(item.itemTotal)}",
                    style = MaterialTheme.typography.labelMedium,
                    color = KioskColors.priceText,
                    fontWeight = FontWeight.Bold
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            // Controles de cantidad
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                // Botón quitar
                IconButton(
                    onClick = onRemove,
                    modifier = Modifier
                        .size(32.dp)
                        .background(
                            color = if (item.quantity == 1) 
                                KioskConfig.secondaryColor.copy(alpha = 0.2f)
                            else 
                                KioskConfig.surfaceColor,
                            shape = CircleShape
                        )
                ) {
                    Icon(
                        imageVector = if (item.quantity == 1) Icons.Default.Delete else Icons.Default.Remove,
                        contentDescription = if (item.quantity == 1) "Eliminar" else "Quitar",
                        modifier = Modifier.size(18.dp),
                        tint = if (item.quantity == 1) KioskConfig.secondaryColor else KioskConfig.textColor
                    )
                }

                // Cantidad
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .background(KioskConfig.primaryColor, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = item.quantity.toString(),
                        style = MaterialTheme.typography.labelLarge,
                        color = Color.Black,
                        fontWeight = FontWeight.Bold
                    )
                }

                // Botón agregar (con indicador si es personalizable)
                Box {
                    IconButton(
                        onClick = onAdd,
                        modifier = Modifier
                            .size(32.dp)
                            .background(
                                color = if (isCustomizable) 
                                    KioskConfig.primaryColor 
                                else 
                                    KioskConfig.primaryColor.copy(alpha = 0.3f),
                                shape = CircleShape
                            )
                    ) {
                        Icon(
                            imageVector = if (isCustomizable) Icons.Default.Star else Icons.Default.Add,
                            contentDescription = if (isCustomizable) "Personalizar y agregar" else "Agregar",
                            modifier = Modifier.size(18.dp),
                            tint = if (isCustomizable) Color.Black else KioskConfig.primaryColor
                        )
                    }
                }
            }
        }
    }
}
