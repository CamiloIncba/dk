package com.norpan.kiosko.data.remote

import com.norpan.kiosko.data.BackendConfig
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

object ApiClient {

    // Cliente HTTP sin autenticación (para endpoints públicos)
    private fun createPublicRetrofit(): Retrofit = Retrofit.Builder()
        .baseUrl(BackendConfig.getBaseUrlForRetrofit())
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    // Cliente HTTP con API Key (para endpoints protegidos)
    private val authenticatedClient = OkHttpClient.Builder()
        .addInterceptor(ApiKeyInterceptor())
        .build()

    private fun createAuthenticatedRetrofit(): Retrofit = Retrofit.Builder()
        .baseUrl(BackendConfig.getBaseUrlForRetrofit())
        .client(authenticatedClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    // Variables que se reinicializan cuando cambia la URL
    private var _menuApi: MenuApi? = null
    private var _ordersApi: OrdersApi? = null
    private var _paymentsApi: PaymentsApi? = null
    private var _receiptsApi: ReceiptsApi? = null
    private var _adminOrdersApi: AdminOrdersApi? = null
    private var currentBaseUrl: String = ""

    private fun ensureInitialized() {
        val newUrl = BackendConfig.getBaseUrlForRetrofit()
        if (currentBaseUrl != newUrl) {
            // URL cambió, reinicializar todos los clientes
            val publicRetrofit = createPublicRetrofit()
            val authenticatedRetrofit = createAuthenticatedRetrofit()
            
            _menuApi = publicRetrofit.create(MenuApi::class.java)
            _ordersApi = publicRetrofit.create(OrdersApi::class.java)
            _paymentsApi = publicRetrofit.create(PaymentsApi::class.java)
            _receiptsApi = publicRetrofit.create(ReceiptsApi::class.java)
            _adminOrdersApi = authenticatedRetrofit.create(AdminOrdersApi::class.java)
            
            currentBaseUrl = newUrl
        }
    }

    // APIs públicas (no requieren API Key)
    val menuApi: MenuApi
        get() {
            ensureInitialized()
            return _menuApi!!
        }
    
    val ordersApi: OrdersApi
        get() {
            ensureInitialized()
            return _ordersApi!!
        }
    
    val paymentsApi: PaymentsApi
        get() {
            ensureInitialized()
            return _paymentsApi!!
        }
    
    val receiptsApi: ReceiptsApi
        get() {
            ensureInitialized()
            return _receiptsApi!!
        }

    // APIs protegidas (requieren API Key)
    val adminOrdersApi: AdminOrdersApi
        get() {
            ensureInitialized()
            return _adminOrdersApi!!
        }
    
    /**
     * Fuerza la reinicialización de todos los clientes API
     * Llamar después de cambiar BackendConfig.setBaseUrl()
     */
    fun reinitialize() {
        currentBaseUrl = "" // Forzar reinicialización en próximo acceso
    }
}
