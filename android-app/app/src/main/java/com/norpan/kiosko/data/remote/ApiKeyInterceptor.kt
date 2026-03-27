package com.norpan.kiosko.data.remote

import okhttp3.Interceptor
import okhttp3.Response

/**
 * Interceptor que agrega el header X-API-KEY a requests que lo requieran.
 * Usado para endpoints protegidos como /admin/orders.
 */
class ApiKeyInterceptor : Interceptor {

    companion object {
        // En producción, esto debería venir de BuildConfig o configuración segura
        private const val API_KEY = "kiosko-norpan-2025-secret"
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        val requestWithApiKey = originalRequest.newBuilder()
            .addHeader("X-API-KEY", API_KEY)
            .build()

        return chain.proceed(requestWithApiKey)
    }
}
