package com.norpan.kiosko.presentation.menu.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.norpan.kiosko.data.KioskConfig
import com.norpan.kiosko.data.remote.dto.ProductDto
import com.norpan.kiosko.presentation.menu.CartItem

/**
 * Grilla de productos estilo McDonald's.
 * Muestra los productos de la categoría seleccionada en formato grid.
 */
@Composable
fun ProductsGrid(
    products: List<ProductDto>,
    cartItems: List<CartItem>,
    productsWithExtras: Set<Int>,
    isLoading: Boolean,
    onProductClick: (ProductDto) -> Unit,
    modifier: Modifier = Modifier
) {
    val gridState = rememberLazyGridState()

    // Scroll al inicio cuando cambian los productos (nueva categoría)
    LaunchedEffect(products) {
        gridState.scrollToItem(0)
    }

    Box(modifier = modifier.fillMaxSize()) {
        when {
            isLoading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = KioskConfig.primaryColor
                )
            }

            products.isEmpty() -> {
                Text(
                    text = "No hay productos en esta categoría",
                    style = MaterialTheme.typography.bodyLarge,
                    color = KioskConfig.textColor.copy(alpha = 0.5f),
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(32.dp)
                )
            }

            else -> {
                val columns = when (KioskConfig.productLayoutStyle) {
                    KioskConfig.LayoutStyle.GRID_2 -> 2
                    KioskConfig.LayoutStyle.GRID_3 -> 3
                    KioskConfig.LayoutStyle.LIST -> 1
                }

                LazyVerticalGrid(
                    columns = GridCells.Fixed(columns),
                    state = gridState,
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(
                        items = products,
                        key = { it.id }
                    ) { product ->
                        val productCartItems = cartItems.filter { it.product.id == product.id }
                        val totalQuantity = productCartItems.sumOf { it.quantity }
                        val hasExtras = productsWithExtras.contains(product.id)

                        AnimatedVisibility(
                            visible = true,
                            enter = fadeIn(
                                animationSpec = spring(stiffness = Spring.StiffnessLow)
                            ) + slideInVertically(
                                initialOffsetY = { it / 4 },
                                animationSpec = spring(stiffness = Spring.StiffnessLow)
                            ),
                            exit = fadeOut()
                        ) {
                            ProductCard(
                                product = product,
                                quantityInCart = totalQuantity,
                                hasExtras = hasExtras,
                                onAddClick = { onProductClick(product) }
                            )
                        }
                    }
                }
            }
        }
    }
}
