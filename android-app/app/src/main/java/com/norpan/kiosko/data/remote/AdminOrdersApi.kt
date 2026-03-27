package com.norpan.kiosko.data.remote

import com.norpan.kiosko.data.remote.dto.AdminOrderDto
import retrofit2.http.GET
import retrofit2.http.Query

/**
 * API para el panel administrativo del tótem.
 *
 * Usa el controlador Nest:
 *   GET /admin/orders/recent?limit=20
 */
interface AdminOrdersApi {

    @GET("admin/orders/recent")
    suspend fun getRecentOrders(
        @Query("limit") limit: Int = 20
    ): List<AdminOrderDto>
}
