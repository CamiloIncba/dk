package com.norpan.kiosko.kitchen.network

import com.norpan.kiosko.kitchen.model.KitchenOrderDto
import com.norpan.kiosko.kitchen.model.UpdateKitchenStatusRequest
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.Path

interface KitchenApiService {

    // Tab: EN PREPARACIÓN (o pendientes) -> backend devuelve los NO READY
    @GET("/kitchen/orders")
    suspend fun getOrders(): List<KitchenOrderDto>

    // Tab: LISTOS -> backend devuelve los READY
    @GET("/kitchen/orders/ready")
    suspend fun getReadyOrders(): List<KitchenOrderDto>

    @PATCH("/kitchen/orders/{id}/status")
    suspend fun updateKitchenStatus(
        @Path("id") orderId: Int,
        @Body body: UpdateKitchenStatusRequest
    ): KitchenOrderDto
}
