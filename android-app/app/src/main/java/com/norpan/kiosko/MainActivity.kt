package com.norpan.kiosko

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.lifecycle.lifecycleScope
import com.norpan.kiosko.data.remote.ApiClient
import com.norpan.kiosko.presentation.menu.MenuEvent
import com.norpan.kiosko.presentation.menu.MenuScreenV2
import com.norpan.kiosko.presentation.menu.MenuViewModel
import com.norpan.kiosko.settings.BackendConfigActivity
import com.norpan.kiosko.settings.KioskPrinterConfigActivity
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {

    private val menuViewModel: MenuViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Escuchar eventos del ViewModel
        lifecycleScope.launch {
            menuViewModel.events.collect { event ->
                when (event) {
                    is MenuEvent.OpenBackendSettings -> {
                        startActivity(Intent(this@MainActivity, BackendConfigActivity::class.java))
                    }
                    is MenuEvent.OpenPrinterSettings -> {
                        startActivity(Intent(this@MainActivity, KioskPrinterConfigActivity::class.java))
                    }
                }
            }
        }
        
        setContent {
            // El tema ahora se aplica dentro de MenuScreenV2
            MenuScreenV2(viewModel = menuViewModel)
        }
    }
    
    override fun onResume() {
        super.onResume()
        // Reinicializar API client por si cambió la URL
        ApiClient.reinitialize()
        // Solo refrescar menú si no hay un pedido/pago en curso
        // para evitar perder el carrito o la pantalla de QR
        menuViewModel.loadMenuIfIdle()
    }
}
