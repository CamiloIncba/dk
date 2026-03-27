package com.norpan.kiosko.presentation.menu.components

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
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
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Divider
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.norpan.kiosko.data.KioskConfig
import com.norpan.kiosko.presentation.menu.CartItem
import com.norpan.kiosko.ui.theme.KioskColors

/**
 * Sidebar de carrito estilo McDonald's.
 * Siempre visible en el costado derecho.
 */
@Composable
fun CartSidebar(
    cartItems: List<CartItem>,
    isPlacingOrder: Boolean,
    orderError: String?,
    onRemoveItem: (String) -> Unit,
    onAddItem: (CartItem) -> Unit,
    onProceedToPayment: () -> Unit,
    modifier: Modifier = Modifier
) {
    val totalItems = cartItems.sumOf { it.quantity }
    val totalAmount = cartItems.sumOf { it.itemTotal * it.quantity }

    Surface(
        modifier = modifier
            .fillMaxHeight()
            .background(KioskColors.cartBackground),
        color = KioskColors.cartBackground,
        shadowElevation = 8.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp)
        ) {
            // Header del carrito
            CartHeader(totalItems = totalItems)

            Spacer(modifier = Modifier.height(16.dp))

            // Lista de items o mensaje de vacío
            if (cartItems.isEmpty()) {
                EmptyCartMessage(
                    modifier = Modifier.weight(1f)
                )
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(vertical = 8.dp)
                ) {
                    items(
                        items = cartItems,
                        key = { it.cartKey }
                    ) { item ->
                        CartItemCard(
                            item = item,
                            onRemove = { onRemoveItem(item.cartKey) },
                            onAdd = { onAddItem(item) }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Total y botón de pago
            if (cartItems.isNotEmpty()) {
                Divider(color = KioskConfig.primaryColor.copy(alpha = 0.3f))
                Spacer(modifier = Modifier.height(16.dp))

                CartTotal(totalAmount = totalAmount)

                Spacer(modifier = Modifier.height(16.dp))

                CheckoutButton(
                    enabled = !isPlacingOrder,
                    isLoading = isPlacingOrder,
                    onClick = onProceedToPayment
                )

                // Error si existe
                orderError?.let {
                    Spacer(modifier = Modifier.height(8.dp))
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

@Composable
private fun CartHeader(totalItems: Int) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.ShoppingCart,
                contentDescription = null,
                modifier = Modifier.size(28.dp),
                tint = KioskConfig.primaryColor
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "Tu pedido",
                style = MaterialTheme.typography.titleLarge,
                color = KioskConfig.textColor
            )
        }

        // Badge de cantidad
        AnimatedVisibility(
            visible = totalItems > 0,
            enter = scaleIn() + fadeIn(),
            exit = scaleOut() + fadeOut()
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .background(KioskConfig.primaryColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                AnimatedContent(
                    targetState = totalItems,
                    transitionSpec = {
                        (slideInVertically { -it } + fadeIn()) togetherWith
                            (slideOutVertically { it } + fadeOut())
                    },
                    label = "itemCount"
                ) { count ->
                    Text(
                        text = count.toString(),
                        style = MaterialTheme.typography.labelLarge,
                        color = Color.Black,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
private fun EmptyCartMessage(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = Icons.Default.ShoppingCart,
            contentDescription = null,
            modifier = Modifier.size(80.dp),
            tint = KioskConfig.textColor.copy(alpha = 0.3f)
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = KioskConfig.cartEmptyText,
            style = MaterialTheme.typography.bodyLarge,
            color = KioskConfig.textColor.copy(alpha = 0.5f),
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Elegí productos del menú para comenzar",
            style = MaterialTheme.typography.bodyMedium,
            color = KioskConfig.textColor.copy(alpha = 0.3f),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun CartItemCard(
    item: CartItem,
    onRemove: () -> Unit,
    onAdd: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = KioskConfig.surfaceColor.copy(alpha = 0.5f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Info del producto
            Column(
                modifier = Modifier.weight(1f)
            ) {
                Text(
                    text = item.product.name,
                    style = MaterialTheme.typography.bodyLarge,
                    color = KioskConfig.textColor,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
                
                // Extras si los hay
                if (item.extras.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = item.extras.joinToString(", ") { it.optionName },
                        style = MaterialTheme.typography.bodySmall,
                        color = KioskConfig.textColor.copy(alpha = 0.6f),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Spacer(modifier = Modifier.height(4.dp))
                
                Text(
                    text = "$ ${"%.2f".format(item.itemTotal * item.quantity)}",
                    style = MaterialTheme.typography.titleSmall,
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
                IconButton(
                    onClick = onRemove,
                    modifier = Modifier
                        .size(36.dp)
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
                        modifier = Modifier.size(20.dp),
                        tint = if (item.quantity == 1) KioskConfig.secondaryColor else KioskConfig.textColor
                    )
                }

                Text(
                    text = item.quantity.toString(),
                    style = MaterialTheme.typography.titleSmall,
                    color = KioskConfig.textColor,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.width(28.dp),
                    textAlign = TextAlign.Center
                )

                IconButton(
                    onClick = onAdd,
                    modifier = Modifier
                        .size(36.dp)
                        .background(
                            color = KioskConfig.primaryColor.copy(alpha = 0.2f),
                            shape = CircleShape
                        )
                ) {
                    Icon(
                        imageVector = Icons.Default.Add,
                        contentDescription = "Agregar",
                        modifier = Modifier.size(20.dp),
                        tint = KioskConfig.primaryColor
                    )
                }
            }
        }
    }
}

@Composable
private fun CartTotal(totalAmount: Double) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "Total",
            style = MaterialTheme.typography.titleLarge,
            color = KioskConfig.textColor
        )
        
        AnimatedContent(
            targetState = totalAmount,
            transitionSpec = {
                (slideInVertically { -it } + fadeIn()) togetherWith
                    (slideOutVertically { it } + fadeOut())
            },
            label = "totalAmount"
        ) { amount ->
            Text(
                text = "$ ${"%.2f".format(amount)}",
                style = MaterialTheme.typography.headlineMedium,
                color = KioskConfig.primaryColor,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun CheckoutButton(
    enabled: Boolean,
    isLoading: Boolean,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier
            .fillMaxWidth()
            .height(64.dp),
        shape = RoundedCornerShape(16.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = KioskColors.checkoutButton,
            contentColor = Color.White,
            disabledContainerColor = KioskColors.checkoutButton.copy(alpha = 0.5f)
        )
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                modifier = Modifier.size(24.dp),
                color = Color.White,
                strokeWidth = 2.dp
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = "Procesando...",
                style = MaterialTheme.typography.titleSmall
            )
        } else {
            Text(
                text = KioskConfig.checkoutButtonText,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
