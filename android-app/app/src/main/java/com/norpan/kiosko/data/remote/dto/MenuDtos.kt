package com.norpan.kiosko.data.remote.dto

data class MenuResponse(
    val categories: List<CategoryDto>
)

data class CategoryDto(
    val id: Int,
    val name: String,
    val position: Int,
    val active: Boolean,
    val products: List<ProductDto>
)

data class ProductDto(
    val id: Int,
    val name: String,
    val description: String?,
    val price: Double,
    val imageUrl: String?,
    val active: Boolean,
    val categoryId: Int
)
