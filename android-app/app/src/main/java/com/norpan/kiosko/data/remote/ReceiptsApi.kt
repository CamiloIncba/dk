package com.norpan.kiosko.data.remote

import com.norpan.kiosko.data.remote.dto.OrderPrintDataResponse
import com.norpan.kiosko.data.remote.dto.ReceiptResponse
import retrofit2.http.GET
import retrofit2.http.Path

interface ReceiptsApi {
    @GET("receipts/order/{id}")
    suspend fun getReceiptForOrder(@Path("id") orderId: Int): ReceiptResponse

    @GET("receipts/order/{id}/print-data")
    suspend fun getOrderPrintData(@Path("id") orderId: Int): OrderPrintDataResponse
}
