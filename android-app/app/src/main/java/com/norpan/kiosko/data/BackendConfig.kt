package com.norpan.kiosko.data

import android.content.Context
import android.content.SharedPreferences
import java.net.URLEncoder

/**
 * Gestiona la configuración del backend (URL del servidor)
 * Almacena en SharedPreferences para persistencia
 */
object BackendConfig {

    private const val PREFS_NAME = "backend_config"
    private const val KEY_BACKEND_URL = "backend_url"
    private const val DEFAULT_URL = "http://10.0.2.2:3010" // Emulador -> localhost
    
    private var prefs: SharedPreferences? = null
    private var cachedUrl: String? = null
    
    /**
     * Inicializa el gestor. Llamar en Application.onCreate()
     */
    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        cachedUrl = prefs?.getString(KEY_BACKEND_URL, DEFAULT_URL) ?: DEFAULT_URL
    }
    
    /**
     * Obtiene la URL base del backend
     */
    fun getBaseUrl(): String {
        return cachedUrl ?: DEFAULT_URL
    }
    
    /**
     * Obtiene la URL completa con trailing slash para Retrofit
     */
    fun getBaseUrlForRetrofit(): String {
        val url = getBaseUrl()
        return if (url.endsWith("/")) url else "$url/"
    }
    
    /**
     * Convierte una URL de imagen externa a una URL del proxy local.
     * Esto permite que dispositivos sin internet carguen imágenes
     * a través del backend que sí tiene conectividad.
     * 
     * @param imageUrl URL original de la imagen (ej: https://s3.amazonaws.com/...)
     * @return URL del proxy local (ej: http://192.168.1.10:3010/images/proxy?url=...)
     */
    fun getProxiedImageUrl(imageUrl: String?): String? {
        if (imageUrl.isNullOrBlank()) return null
        
        // Si ya es una URL local (del mismo backend), no proxearla
        val baseUrl = getBaseUrl()
        if (imageUrl.startsWith(baseUrl)) return imageUrl
        
        val encodedUrl = URLEncoder.encode(imageUrl, "UTF-8")
        return "$baseUrl/images/proxy?url=$encodedUrl"
    }
    
    /**
     * Guarda una nueva URL del backend
     */
    fun setBaseUrl(url: String) {
        val cleanUrl = url.trim().removeSuffix("/")
        prefs?.edit()?.putString(KEY_BACKEND_URL, cleanUrl)?.apply()
        cachedUrl = cleanUrl
    }
    
    /**
     * Restablece a la URL por defecto
     */
    fun resetToDefault() {
        setBaseUrl(DEFAULT_URL)
    }
    
    /**
     * Obtiene la URL por defecto
     */
    fun getDefaultUrl(): String = DEFAULT_URL
}
