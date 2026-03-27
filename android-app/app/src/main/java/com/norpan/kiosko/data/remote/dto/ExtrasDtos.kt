package com.norpan.kiosko.data.remote.dto

/**
 * Opción de extra (ej: "Mayonesa", "Queso", "Tocino")
 */
data class ExtraOptionDto(
    val id: Int,
    val name: String,
    val price: Double,
    val imageUrl: String?,
    val active: Boolean,
    val position: Int,
    val groupId: Int
)

/**
 * Grupo de extras (ej: "Aderezos", "Ingredientes extra")
 */
data class ExtraGroupDto(
    val id: Int,
    val name: String,
    val description: String?,
    val minSelections: Int,
    val maxSelections: Int?,
    val active: Boolean,
    val position: Int,
    val options: List<ExtraOptionDto>
)

/**
 * Opción personalizada para un producto específico
 * (permite override de precio o restringir opciones)
 */
data class ProductCustomOptionDto(
    val id: Int,
    val productExtraGroupId: Int,
    val optionId: Int,
    val priceOverride: Double?, // null = precio default, 0 = gratis
    val option: ExtraOptionDto
)

/**
 * Grupo de extras vinculado a un producto específico
 */
data class ProductExtraGroupDto(
    val id: Int,
    val productId: Int,
    val groupId: Int,
    val position: Int,
    val maxSelections: Int?, // Override de maxSelections para este producto
    val group: ExtraGroupDto,
    val customOptions: List<ProductCustomOptionDto>? // Si vacío, usa todas las del grupo
)

/**
 * Extra seleccionado para enviar al crear orden
 */
data class OrderItemExtraRequest(
    val optionId: Int,
    val quantity: Int = 1
)

/**
 * Item de orden con extras
 */
data class OrderItemWithExtrasRequest(
    val productId: Int,
    val quantity: Int,
    val extras: List<OrderItemExtraRequest>?
)

/**
 * Request para crear orden con extras
 */
data class CreateOrderWithExtrasRequest(
    val items: List<OrderItemWithExtrasRequest>,
    val note: String? = null
)
