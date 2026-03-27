package com.norpan.kiosko.kitchen.model

data class KitchenOrderDto(
    val id: Int,
    val status: String,
    val kitchenStatus: String,
    val receiptCode: String?,
    val createdAt: String,
    val items: List<KitchenOrderItemDto>
)

data class KitchenOrderItemDto(
    val id: Int,
    val quantity: Int,
    val product: KitchenProductDto,
    val extras: List<KitchenOrderItemExtraDto>?
)

data class KitchenProductDto(
    val id: Int,
    val name: String
)

data class KitchenOrderItemExtraDto(
    val id: Int,
    val quantity: Int,
    val unitPrice: String,
    val extraOption: KitchenExtraOptionDto
)

data class KitchenExtraOptionDto(
    val id: Int,
    val name: String
)
