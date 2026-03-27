package com.norpan.kiosko.data.remote

import com.norpan.kiosko.data.remote.dto.MenuResponse
import com.norpan.kiosko.data.remote.dto.ProductExtraGroupDto
import retrofit2.http.GET
import retrofit2.http.Path

interface MenuApi {

    @GET("menu")
    suspend fun getMenu(): MenuResponse

    @GET("menu/products/{productId}/extras")
    suspend fun getProductExtras(@Path("productId") productId: Int): List<ProductExtraGroupDto>
}
