package com.norpan.kiosko.data.remote

import com.norpan.kiosko.data.remote.dto.CreateOrderRequest
import com.norpan.kiosko.data.remote.dto.CreateOrderWithExtrasRequest
import com.norpan.kiosko.data.remote.dto.OrderResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface OrdersApi {

    @POST("orders")
    suspend fun createOrder(@Body request: CreateOrderRequest): OrderResponse

    @POST("orders")
    suspend fun createOrderWithExtras(@Body request: CreateOrderWithExtrasRequest): OrderResponse

    @GET("orders/{id}")
    suspend fun getOrder(@Path("id") id: Int): OrderResponse
}
