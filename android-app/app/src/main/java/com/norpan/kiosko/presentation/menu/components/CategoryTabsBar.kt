package com.norpan.kiosko.presentation.menu.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Fastfood
import androidx.compose.material.icons.filled.LocalCafe
import androidx.compose.material.icons.filled.LocalDrink
import androidx.compose.material.icons.filled.LunchDining
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.BakeryDining
import androidx.compose.material.icons.filled.Cake
import androidx.compose.material.icons.filled.Cookie
import androidx.compose.material.icons.filled.EmojiFoodBeverage
import androidx.compose.material.icons.filled.Icecream
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.norpan.kiosko.data.KioskConfig
import com.norpan.kiosko.data.remote.dto.CategoryDto
import com.norpan.kiosko.ui.theme.KioskColors
import kotlinx.coroutines.launch

/**
 * Barra de navegación horizontal de categorías estilo McDonald's.
 * Tabs grandes con íconos y texto.
 */
@Composable
fun CategoryTabsBar(
    categories: List<CategoryDto>,
    selectedCategoryId: Int?,
    onCategorySelected: (CategoryDto) -> Unit,
    modifier: Modifier = Modifier
) {
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val tabHeight = KioskConfig.categoryTabsHeight.dp

    // Scroll automático al seleccionar una categoría
    LaunchedEffect(selectedCategoryId) {
        val index = categories.indexOfFirst { it.id == selectedCategoryId }
        if (index >= 0) {
            scope.launch {
                listState.animateScrollToItem(index)
            }
        }
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.background)
    ) {
        LazyRow(
            state = listState,
            modifier = Modifier
                .fillMaxWidth()
                .height(tabHeight + 16.dp),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            itemsIndexed(categories) { index, category ->
                val isSelected = category.id == selectedCategoryId

                CategoryTab(
                    category = category,
                    isSelected = isSelected,
                    onClick = { onCategorySelected(category) },
                    tabHeight = tabHeight
                )
            }
        }

        // Línea divisoria inferior
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .height(1.dp)
                .background(KioskConfig.primaryColor.copy(alpha = 0.3f))
        )
    }
}

@Composable
private fun CategoryTab(
    category: CategoryDto,
    isSelected: Boolean,
    onClick: () -> Unit,
    tabHeight: androidx.compose.ui.unit.Dp
) {
    val backgroundColor by animateColorAsState(
        targetValue = if (isSelected) KioskConfig.primaryColor else KioskColors.categoryUnselected,
        animationSpec = spring(stiffness = Spring.StiffnessMedium),
        label = "tabBg"
    )
    val textColor by animateColorAsState(
        targetValue = if (isSelected) Color.Black else KioskConfig.textColor,
        animationSpec = spring(stiffness = Spring.StiffnessMedium),
        label = "tabText"
    )
    val borderWidth by animateDpAsState(
        targetValue = if (isSelected) 0.dp else 2.dp,
        animationSpec = spring(stiffness = Spring.StiffnessMedium),
        label = "borderWidth"
    )

    Box(
        modifier = Modifier
            .height(tabHeight)
            .clip(RoundedCornerShape(16.dp))
            .background(backgroundColor)
            .then(
                if (!isSelected) {
                    Modifier.border(
                        width = borderWidth,
                        color = KioskConfig.primaryColor.copy(alpha = 0.5f),
                        shape = RoundedCornerShape(16.dp)
                    )
                } else Modifier
            )
            .clickable { onClick() }
            .padding(horizontal = 24.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            Icon(
                imageVector = getCategoryIcon(category.name),
                contentDescription = category.name,
                modifier = Modifier.size(28.dp),
                tint = textColor
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = category.name.uppercase(),
                style = MaterialTheme.typography.labelLarge,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                color = textColor,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

/**
 * Mapea nombres de categoría a íconos de Material.
 */
private fun getCategoryIcon(categoryName: String): ImageVector {
    val nameLower = categoryName.lowercase()
    return when {
        nameLower.contains("bebida") || nameLower.contains("drink") -> Icons.Default.LocalDrink
        nameLower.contains("café") || nameLower.contains("coffee") || nameLower.contains("cafe") -> Icons.Default.LocalCafe
        nameLower.contains("burger") || nameLower.contains("hambur") -> Icons.Default.LunchDining
        nameLower.contains("postre") || nameLower.contains("dessert") -> Icons.Default.Cake
        nameLower.contains("helado") || nameLower.contains("ice") -> Icons.Default.Icecream
        nameLower.contains("panadería") || nameLower.contains("bakery") || nameLower.contains("pan") -> Icons.Default.BakeryDining
        nameLower.contains("galleta") || nameLower.contains("cookie") -> Icons.Default.Cookie
        nameLower.contains("snack") || nameLower.contains("entrada") -> Icons.Default.Fastfood
        nameLower.contains("combo") || nameLower.contains("menú") || nameLower.contains("menu") -> Icons.Default.Restaurant
        nameLower.contains("té") || nameLower.contains("tea") || nameLower.contains("infusion") -> Icons.Default.EmojiFoodBeverage
        else -> Icons.Default.Restaurant
    }
}
