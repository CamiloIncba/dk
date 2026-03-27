package com.norpan.kiosko.kitchen

import android.content.Intent
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.norpan.kiosko.R
import com.norpan.kiosko.databinding.ActivityKitchenV2Binding
import com.norpan.kiosko.settings.BackendConfigActivity
import com.norpan.kiosko.settings.KitchenPrinterConfigActivity
import kotlinx.coroutines.launch

/**
 * Activity de cocina mejorada con:
 * - Vista de dos columnas (En Preparación | Listos)
 * - Tarjetas grandes con extras visibles
 * - Modo fullscreen/inmersivo
 * - Auto-refresh cada 5 segundos
 * - Configuración de servidor
 * - Sonido y vibración al recibir nuevo pedido
 */
class KitchenMainActivityV2 : AppCompatActivity() {

    private lateinit var binding: ActivityKitchenV2Binding
    private val viewModel: KitchenViewModel by viewModels()

    private lateinit var activeAdapter: KitchenOrdersAdapterV2
    private lateinit var readyAdapter: KitchenOrdersAdapterV2
    
    private var mediaPlayer: MediaPlayer? = null
    private var soundEnabled = true
    
    // Launcher para BackendConfigActivity
    private val configLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            // URL cambió, forzar refresh
            viewModel.reinitializeIfNeeded()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Mantener pantalla encendida
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        binding = ActivityKitchenV2Binding.inflate(layoutInflater)
        setContentView(binding.root)

        setupFullscreen()
        setupSound()
        setupAdapters()
        setupObservers()

        binding.btnRefresh.setOnClickListener {
            viewModel.refreshAll()
        }
        
        binding.btnSettings.setOnClickListener {
            val intent = Intent(this, BackendConfigActivity::class.java)
            configLauncher.launch(intent)
        }
        
        binding.btnPrinter.setOnClickListener {
            startActivity(Intent(this, KitchenPrinterConfigActivity::class.java))
        }

        viewModel.refreshAll()
    }
    
    private fun setupSound() {
        try {
            // Usar sonido de notificación del sistema
            val notification = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            mediaPlayer = MediaPlayer.create(this, notification)
        } catch (e: Exception) {
            // Ignorar si no hay sonido disponible
        }
    }
    
    private fun playNotificationSound() {
        if (!soundEnabled) return
        
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.stop()
                    it.prepare()
                }
                it.start()
            }
            
            // Vibrar
            vibrate()
        } catch (e: Exception) {
            // Ignorar errores
        }
    }
    
    private fun vibrate() {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(VIBRATOR_MANAGER_SERVICE) as VibratorManager
                val vibrator = vibratorManager.defaultVibrator
                vibrator.vibrate(VibrationEffect.createOneShot(500, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(500, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(500)
                }
            }
        } catch (e: Exception) {
            // Ignorar si no hay vibrador
        }
    }

    private fun setupFullscreen() {
        // Modo inmersivo - oculta barras de sistema
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val controller = WindowInsetsControllerCompat(window, binding.root)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior = 
            WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }

    private fun setupAdapters() {
        // Adapter para columna "En Preparación"
        activeAdapter = KitchenOrdersAdapterV2(
            onReady = { orderId -> viewModel.setKitchenStatus(orderId, "READY") },
            onDelivered = { orderId -> viewModel.setKitchenStatus(orderId, "DELIVERED") },
            onReprint = { order -> showReprintConfirmation(order) },
            isReadyColumn = false
        )

        // Adapter para columna "Listos"
        readyAdapter = KitchenOrdersAdapterV2(
            onReady = { orderId -> viewModel.setKitchenStatus(orderId, "READY") },
            onDelivered = { orderId -> viewModel.setKitchenStatus(orderId, "DELIVERED") },
            onReprint = { order -> showReprintConfirmation(order) },
            isReadyColumn = true
        )

        binding.recyclerActive.apply {
            layoutManager = LinearLayoutManager(this@KitchenMainActivityV2)
            adapter = activeAdapter
        }

        binding.recyclerReady.apply {
            layoutManager = LinearLayoutManager(this@KitchenMainActivityV2)
            adapter = readyAdapter
        }
    }
    
    private fun showReprintConfirmation(order: com.norpan.kiosko.kitchen.model.KitchenOrderDto) {
        androidx.appcompat.app.AlertDialog.Builder(this)
            .setTitle("🖨️ Reimprimir comanda")
            .setMessage("¿Reimprimir comanda del pedido #${order.id}?")
            .setPositiveButton("Imprimir") { _, _ ->
                viewModel.printOrder(order, isAutomatic = false)
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun setupObservers() {
        // Pedidos activos (EN PREPARACIÓN + PENDING)
        lifecycleScope.launch {
            viewModel.orders.collect { orders ->
                activeAdapter.submitList(orders)
                binding.badgeActive.text = orders.size.toString()
                updateCounters()
            }
        }

        // Pedidos listos
        lifecycleScope.launch {
            viewModel.readyOrders.collect { orders ->
                readyAdapter.submitList(orders)
                binding.badgeReady.text = orders.size.toString()
                updateCounters()
            }
        }

        // Errores
        lifecycleScope.launch {
            viewModel.error.collect { error ->
                if (error != null) {
                    binding.errorText.text = error
                    binding.errorText.visibility = View.VISIBLE
                } else {
                    binding.errorText.visibility = View.GONE
                }
            }
        }
        
        // Estado de conexión
        lifecycleScope.launch {
            viewModel.isConnected.collect { connected ->
                updateConnectionIndicator(connected)
            }
        }
        
        // Timestamp para contadores precisos - actualiza cada segundo
        lifecycleScope.launch {
            viewModel.currentTimeMillis.collect { timeMillis ->
                activeAdapter.currentTimeMillis = timeMillis
                readyAdapter.currentTimeMillis = timeMillis
            }
        }
        
        // Evento de nuevo pedido - reproducir sonido y vibrar
        lifecycleScope.launch {
            viewModel.newOrderEvent.collect { orderId ->
                playNotificationSound()
                Toast.makeText(
                    this@KitchenMainActivityV2,
                    "🔔 Nuevo pedido #$orderId",
                    Toast.LENGTH_SHORT
                ).show()
            }
        }
        
        // Eventos de impresión
        lifecycleScope.launch {
            viewModel.printEvent.collect { event ->
                when (event) {
                    is PrintEvent.Success -> {
                        val msg = if (event.isAutomatic) {
                            "🖨️ Comanda #${event.orderId} impresa"
                        } else {
                            "✅ Comanda #${event.orderId} reimpresa"
                        }
                        Toast.makeText(this@KitchenMainActivityV2, msg, Toast.LENGTH_SHORT).show()
                    }
                    is PrintEvent.Error -> {
                        Toast.makeText(
                            this@KitchenMainActivityV2,
                            "❌ Error imprimiendo #${event.orderId}: ${event.message}",
                            Toast.LENGTH_LONG
                        ).show()
                    }
                }
            }
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        mediaPlayer?.release()
        mediaPlayer = null
    }
    
    private fun updateConnectionIndicator(connected: Boolean) {
        if (connected) {
            binding.connectionStatus.text = "Conectado"
            binding.connectionDot.backgroundTintList = 
                ContextCompat.getColorStateList(this, android.R.color.holo_green_light)
            binding.connectionIndicator.setBackgroundResource(R.drawable.badge_green)
        } else {
            binding.connectionStatus.text = "Sin conexión"
            binding.connectionDot.backgroundTintList = 
                ContextCompat.getColorStateList(this, android.R.color.holo_red_light)
            binding.connectionIndicator.setBackgroundResource(R.drawable.badge_orange)
        }
    }

    private fun updateCounters() {
        val activeCount = viewModel.orders.value.size
        val readyCount = viewModel.readyOrders.value.size
        binding.countActive.text = "Activos: $activeCount"
        binding.countReady.text = "Listos: $readyCount"
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            setupFullscreen()
        }
    }
}
