package com.norpan.kiosko.settings

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.norpan.kiosko.data.BackendConfig
import com.norpan.kiosko.data.remote.ApiClient
import com.norpan.kiosko.databinding.ActivityBackendConfigBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

/**
 * Activity para configurar la URL del servidor backend
 */
class BackendConfigActivity : AppCompatActivity() {

    private lateinit var binding: ActivityBackendConfigBinding
    private var isConnected = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBackendConfigBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupUI()
        loadCurrentConfig()
        testConnection()
    }

    private fun setupUI() {
        binding.btnTest.setOnClickListener {
            testConnection()
        }

        binding.btnSave.setOnClickListener {
            saveConfig()
        }

        binding.btnReset.setOnClickListener {
            binding.etServerUrl.setText(BackendConfig.getDefaultUrl())
            testConnection()
        }

        binding.btnBack.setOnClickListener {
            finish()
        }
    }

    private fun loadCurrentConfig() {
        binding.etServerUrl.setText(BackendConfig.getBaseUrl())
    }

    private fun testConnection() {
        val url = binding.etServerUrl.text.toString().trim()
        if (url.isEmpty()) {
            binding.tvStatus.text = "⚠️ Ingresa una URL"
            binding.tvStatus.setTextColor(getColor(android.R.color.holo_orange_dark))
            return
        }

        binding.btnTest.isEnabled = false
        binding.tvStatus.text = "🔄 Probando conexión..."
        binding.tvStatus.setTextColor(getColor(android.R.color.darker_gray))
        binding.progressBar.visibility = View.VISIBLE

        lifecycleScope.launch {
            val success = checkServerHealth(url)
            
            withContext(Dispatchers.Main) {
                binding.progressBar.visibility = View.GONE
                binding.btnTest.isEnabled = true
                isConnected = success

                if (success) {
                    binding.tvStatus.text = "✅ Conexión exitosa"
                    binding.tvStatus.setTextColor(getColor(android.R.color.holo_green_dark))
                    binding.indicatorDot.setBackgroundResource(android.R.color.holo_green_dark)
                } else {
                    binding.tvStatus.text = "❌ No se pudo conectar"
                    binding.tvStatus.setTextColor(getColor(android.R.color.holo_red_dark))
                    binding.indicatorDot.setBackgroundResource(android.R.color.holo_red_dark)
                }
            }
        }
    }

    private suspend fun checkServerHealth(baseUrl: String): Boolean {
        return withContext(Dispatchers.IO) {
            try {
                val client = OkHttpClient.Builder()
                    .connectTimeout(5, TimeUnit.SECONDS)
                    .readTimeout(5, TimeUnit.SECONDS)
                    .build()

                val url = if (baseUrl.endsWith("/")) "${baseUrl}health" else "$baseUrl/health"
                val request = Request.Builder().url(url).build()
                val response = client.newCall(request).execute()
                response.isSuccessful
            } catch (e: Exception) {
                false
            }
        }
    }

    private fun saveConfig() {
        val url = binding.etServerUrl.text.toString().trim()
        if (url.isEmpty()) {
            Toast.makeText(this, "Ingresa una URL válida", Toast.LENGTH_SHORT).show()
            return
        }

        BackendConfig.setBaseUrl(url)
        ApiClient.reinitialize()
        
        Toast.makeText(this, "✅ Configuración guardada", Toast.LENGTH_SHORT).show()
        
        // Dar resultado OK para que el caller sepa que se guardó
        setResult(RESULT_OK)
        finish()
    }
}
