package com.norpan.kiosko.presentation.menu.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Card
import androidx.compose.ui.zIndex
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import android.util.Log
import coil.compose.AsyncImage
import coil.compose.AsyncImagePainter
import coil.request.ImageRequest
import com.norpan.kiosko.data.BackendConfig
import com.norpan.kiosko.data.KioskConfig
import com.norpan.kiosko.data.remote.dto.ProductDto
import com.norpan.kiosko.ui.theme.KioskColors

/**
 * Card de producto estilo McDonald's.
 * Foto grande, nombre destacado, precio visible, botón de agregar.
 * El manejo de cantidades se hace exclusivamente desde el carrito.
 */
@Composable
fun ProductCard(
    product: ProductDto,
    quantityInCart: Int,
    hasExtras: Boolean,
    onAddClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.95f else 1f,
        animationSpec = spring(stiffness = Spring.StiffnessMedium),
        label = "cardScale"
    )

    val imageHeight = KioskConfig.productImageHeight.dp

    Card(
        modifier = modifier
            .fillMaxWidth()
            .scale(scale)
            .shadow(
                elevation = if (quantityInCart > 0) 8.dp else 4.dp,
                shape = RoundedCornerShape(20.dp),
                spotColor = if (quantityInCart > 0) KioskConfig.primaryColor else Color.Black
            ),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = KioskColors.cardBackground
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(
                    interactionSource = interactionSource,
                    indication = null
                ) {
                    onAddClick()
                }
        ) {
            Column {
                // Imagen del producto
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(imageHeight)
                        .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                ) {
                    // Usar proxy de imágenes para dispositivos sin internet directo
                    val proxiedImageUrl = BackendConfig.getProxiedImageUrl(product.imageUrl)
                    
                    if (KioskConfig.showProductImages && !proxiedImageUrl.isNullOrBlank()) {
                        var imageState by remember { mutableStateOf<AsyncImagePainter.State?>(null) }
                        
                        AsyncImage(
                            model = ImageRequest.Builder(LocalContext.current)
                                .data(proxiedImageUrl)
                                .crossfade(true)
                                .build(),
                            contentDescription = product.name,
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop,
                            onState = { state ->
                                imageState = state
                                when (state) {
                                    is AsyncImagePainter.State.Error -> {
                                        Log.e("ProductCard", "Error loading image: $proxiedImageUrl, error: ${state.result.throwable}")
                                    }
                                    is AsyncImagePainter.State.Success -> {
                                        Log.d("ProductCard", "Image loaded successfully: $proxiedImageUrl")
                                    }
                                    else -> {}
                                }
                            }
                        )
                        
                        // Mostrar icono de error si falló
                        if (imageState is AsyncImagePainter.State.Error) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(Color.Red.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "❌",
                                    style = MaterialTheme.typography.displayMedium
                                )
                            }
                        }
                    } else {
                        // Placeholder con gradiente
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(
                                            KioskConfig.primaryColor.copy(alpha = 0.3f),
                                            KioskConfig.surfaceColor
                                        )
                                    )
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = product.name.take(2).uppercase(),
                                style = MaterialTheme.typography.displayMedium,
                                color = KioskConfig.primaryColor.copy(alpha = 0.5f)
                            )
                        }
                    }

                    // Badge de "Personalizable"
                    if (hasExtras) {
                        Surface(
                            modifier = Modifier
                                .align(Alignment.TopStart)
                                .padding(8.dp),
                            shape = RoundedCornerShape(8.dp),
                            color = KioskConfig.primaryColor
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Star,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp),
                                    tint = Color.Black
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "Personalizable",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.Black
                                )
                            }
                        }
                    }

                    // Gradiente inferior para legibilidad
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .height(40.dp)
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color.Transparent,
                                        KioskColors.cardBackground.copy(alpha = 0.8f)
                                    )
                                )
                            )
                    )
                }

                // Contenido: nombre, descripción, precio
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Text(
                        text = product.name,
                        style = MaterialTheme.typography.headlineMedium,
                        color = KioskConfig.textColor,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )

                    if (!product.description.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = product.description,
                            style = MaterialTheme.typography.bodyMedium,
                            color = KioskConfig.textColor.copy(alpha = 0.7f),
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Fila de precio y botón agregar
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Precio
                        Text(
                            text = "$ ${product.price}",
                            style = MaterialTheme.typography.titleMedium,
                            color = KioskColors.priceText,
                            fontWeight = FontWeight.Bold
                        )

                        // Botón de agregar
                        AddToCartButton(onClick = onAddClick)
                    }
                }
            }

            // Badge de cantidad en esquina
            if (quantityInCart > 0) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .offset(x = 8.dp, y = (-8).dp)
                        .zIndex(10f) // Asegurar que esté por encima de todo
                        .size(36.dp)
                        .background(KioskColors.quantityBadge, CircleShape)
                        .border(2.dp, Color.White, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = quantityInCart.toString(),
                        style = MaterialTheme.typography.labelLarge,
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
private fun AddToCartButton(
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = Modifier.size(48.dp),
        shape = CircleShape,
        color = KioskColors.addToCartButton,
        shadowElevation = 4.dp
    ) {
        Box(
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.Add,
                contentDescription = "Agregar al carrito",
                tint = Color.White,
                modifier = Modifier.size(28.dp)
            )
        }
    }
}
