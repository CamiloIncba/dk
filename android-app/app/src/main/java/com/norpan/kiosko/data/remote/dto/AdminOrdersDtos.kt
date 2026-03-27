package com.norpan.kiosko.data.remote.dto

/**
 * DTO simplificado para el panel administrativo del tótem.
 *
 * Viene del endpoint backend:
 *   GET /admin/orders/recent
 *
 * Ojo: totalAmount se modela como String porque en el backend es un Decimal
 * y normalmente viaja como string en JSON. Lo parseamos a Double del lado
 * de la app sólo cuando lo necesitamos.
 */
data class AdminOrderDto(
    val id: Int,
    val status: String,
    val createdAt: String,
    val totalAmount: String,
    val receiptCode: String?
)
