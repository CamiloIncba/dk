package com.norpan.kiosko

import android.app.Application
import com.norpan.kiosko.data.BackendConfig

class KioskoApplication : Application() {

    companion object {
        lateinit var instance: KioskoApplication
            private set
    }
    
    override fun onCreate() {
        super.onCreate()
        instance = this
        
        // Inicializar configuración del backend
        BackendConfig.init(this)
    }
}
