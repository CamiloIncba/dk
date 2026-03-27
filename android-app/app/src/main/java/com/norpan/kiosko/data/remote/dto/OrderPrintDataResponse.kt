package com.norpan.kiosko.data.remote.dto

data class OrderPrintDataResponse(
    val orderId: Int,
    val total: Double,
    val status: String,
    val createdAt: String,
    val items: List<PrintItemDto>,
    val payment: PrintPaymentDto?
)

data class PrintItemDto(
    val productName: String,
    val quantity: Int,
    val unitPrice: Double,
    val extras: List<PrintExtraDto>
)

data class PrintExtraDto(
    val name: String,
    val quantity: Int,
    val unitPrice: Double
)

data class PrintPaymentDto(
    val status: String,
    val mpPaymentId: String?,
    val paymentType: String?,
    val paymentMethod: String?
)
