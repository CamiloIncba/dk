package com.norpan.kiosko.settings

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.content.pm.PackageManager
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.norpan.kiosko.databinding.ActivityPrinterConfigKitchenBinding
import com.norpan.kiosko.printing.BluetoothPrinterManager
import com.norpan.kiosko.printing.EscPosPrinter
import com.norpan.kiosko.printing.PrintResult
import com.norpan.kiosko.printing.PrinterConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream

/**
 * Activity para configurar la impresora de Cocina.
 * Solo muestra la impresora de comandas (XP-58IIH BT 58mm).
 */
class KitchenPrinterConfigActivity : AppCompatActivity() {

    private lateinit var binding: ActivityPrinterConfigKitchenBinding
    private var bluetoothAdapter: BluetoothAdapter? = null
    
    private var monitorJob: Job? = null
    private var isMonitoring = false
    private val MONITOR_INTERVAL = 5000L

    companion object {
        private const val REQUEST_BLUETOOTH_PERMISSIONS = 1001
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPrinterConfigKitchenBinding.inflate(layoutInflater)
        setContentView(binding.root)

        initBluetooth()
        setupUI()
        loadCurrentConfig()
    }
    
    override fun onResume() {
        super.onResume()
        startMonitoring()
    }
    
    override fun onPause() {
        super.onPause()
        stopMonitoring()
    }

    private fun initBluetooth() {
        val bluetoothManager = getSystemService(BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = bluetoothManager?.adapter
    }

    private fun setupUI() {
        binding.btnBack.setOnClickListener { finish() }

        binding.btnKitchenSelect.setOnClickListener {
            checkBluetoothPermissionsAndShowDevices { device ->
                PrinterConfig.kitchenPrinterMac = device.address
                PrinterConfig.kitchenPrinterName = device.name ?: "Desconocida"
                loadCurrentConfig()
                Toast.makeText(this, "Impresora cocina configurada", Toast.LENGTH_SHORT).show()
            }
        }

        binding.btnKitchenTest.setOnClickListener {
            testPrinter(PrinterConfig.kitchenPrinterMac, "COCINA", 32)
        }

        binding.switchKitchenEnabled.setOnCheckedChangeListener { _, isChecked ->
            PrinterConfig.kitchenPrinterEnabled = isChecked
        }

        binding.switchAutoKitchen.setOnCheckedChangeListener { _, isChecked ->
            PrinterConfig.autoPrintKitchenTicket = isChecked
        }
    }

    private fun loadCurrentConfig() {
        val kitchenMac = PrinterConfig.kitchenPrinterMac
        val kitchenName = PrinterConfig.kitchenPrinterName

        if (kitchenMac.isNotBlank()) {
            binding.tvKitchenPrinterName.text = "Impresora: $kitchenName"
            binding.tvKitchenPrinterMac.text = "MAC: $kitchenMac"
            binding.tvKitchenStatus.text = "Verificando..."
            setIndicatorColor(binding.kitchenIndicator, 0xFF9E9E9E.toInt())
        } else {
            binding.tvKitchenPrinterName.text = "Impresora: -"
            binding.tvKitchenPrinterMac.text = "MAC: -"
            binding.tvKitchenStatus.text = "No configurada"
            binding.tvKitchenStatus.setTextColor(0xFF666666.toInt())
            setIndicatorColor(binding.kitchenIndicator, 0xFF9E9E9E.toInt())
        }

        binding.switchKitchenEnabled.isChecked = PrinterConfig.kitchenPrinterEnabled
        binding.switchAutoKitchen.isChecked = PrinterConfig.autoPrintKitchenTicket
    }

    private fun checkBluetoothPermissionsAndShowDevices(onDeviceSelected: (BluetoothDevice) -> Unit) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val permissions = arrayOf(
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            )
            
            val missingPermissions = permissions.filter {
                ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
            }

            if (missingPermissions.isNotEmpty()) {
                ActivityCompat.requestPermissions(
                    this,
                    missingPermissions.toTypedArray(),
                    REQUEST_BLUETOOTH_PERMISSIONS
                )
                return
            }
        }

        showPairedDevicesDialog(onDeviceSelected)
    }

    @SuppressLint("MissingPermission")
    private fun showPairedDevicesDialog(onDeviceSelected: (BluetoothDevice) -> Unit) {
        val adapter = bluetoothAdapter ?: run {
            Toast.makeText(this, "Bluetooth no disponible", Toast.LENGTH_SHORT).show()
            return
        }

        if (!adapter.isEnabled) {
            Toast.makeText(this, "Activa Bluetooth primero", Toast.LENGTH_SHORT).show()
            return
        }

        val pairedDevices = try {
            adapter.bondedDevices?.toList() ?: emptyList()
        } catch (e: SecurityException) {
            Toast.makeText(this, "Sin permiso para acceder a dispositivos Bluetooth", Toast.LENGTH_SHORT).show()
            return
        }

        if (pairedDevices.isEmpty()) {
            AlertDialog.Builder(this)
                .setTitle("Sin dispositivos")
                .setMessage("No hay impresoras vinculadas.\n\nVe a Ajustes > Bluetooth y vincula tu impresora primero.")
                .setPositiveButton("OK", null)
                .show()
            return
        }

        val deviceNames = pairedDevices.map { device ->
            val name = try { device.name } catch (e: SecurityException) { null }
            "${name ?: "Desconocido"}\n${device.address}"
        }.toTypedArray()

        AlertDialog.Builder(this)
            .setTitle("Seleccionar impresora")
            .setItems(deviceNames) { _, which ->
                onDeviceSelected(pairedDevices[which])
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        
        if (requestCode == REQUEST_BLUETOOTH_PERMISSIONS) {
            if (grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
                Toast.makeText(this, "Permisos concedidos. Toca de nuevo para seleccionar.", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "Se necesitan permisos Bluetooth", Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun testPrinter(macAddress: String, printerName: String, width: Int) {
        if (macAddress.isBlank()) {
            Toast.makeText(this, "Primero selecciona una impresora", Toast.LENGTH_SHORT).show()
            return
        }

        Toast.makeText(this, "Imprimiendo prueba...", Toast.LENGTH_SHORT).show()

        lifecycleScope.launch {
            val testBytes = buildTestTicket(printerName, width)
            val printResult = BluetoothPrinterManager.printToMacWithResult(testBytes, macAddress)

            withContext(Dispatchers.Main) {
                if (printResult.isSuccess) {
                    Toast.makeText(
                        this@KitchenPrinterConfigActivity,
                        "✅ Impresión exitosa",
                        Toast.LENGTH_SHORT
                    ).show()
                } else {
                    showPrinterErrorDialog(printerName, printResult)
                }
            }
        }
    }

    private fun showPrinterErrorDialog(printerName: String, result: PrintResult) {
        val (title, message, icon) = when (result) {
            is PrintResult.NoPaper -> Triple(
                "Sin papel",
                "La impresora no tiene papel.\n\n" +
                "📋 Solución:\n" +
                "1. Abre la tapa de la impresora\n" +
                "2. Coloca un rollo de papel térmico\n" +
                "3. Cierra la tapa\n" +
                "4. Vuelve a intentar",
                "🧻"
            )
            is PrintResult.CoverOpen -> Triple(
                "Tapa abierta",
                "La tapa de la impresora está abierta.\n\n" +
                "📋 Solución:\n" +
                "1. Verifica que el papel esté bien colocado\n" +
                "2. Cierra la tapa firmemente\n" +
                "3. Vuelve a intentar",
                "📭"
            )
            is PrintResult.ConnectionFailed -> Triple(
                "Error de conexión",
                "No se pudo conectar a la impresora.\n\n" +
                "📋 Posibles causas:\n" +
                "• La impresora está apagada\n" +
                "• Está fuera de rango Bluetooth\n" +
                "• Otro dispositivo está conectado\n\n" +
                "Intenta apagar y encender la impresora.",
                "📡"
            )
            is PrintResult.BluetoothOff -> Triple(
                "Bluetooth apagado",
                "El Bluetooth del dispositivo está apagado.\n\nActívalo desde Ajustes.",
                "📴"
            )
            else -> Triple(
                "Error",
                "Ocurrió un error: ${result.toUserMessage()}",
                "❌"
            )
        }

        AlertDialog.Builder(this)
            .setTitle("$icon $title")
            .setMessage(message)
            .setPositiveButton("Entendido", null)
            .setNeutralButton("Reintentar") { _, _ ->
                testPrinter(PrinterConfig.kitchenPrinterMac, "COCINA", 32)
            }
            .show()
    }

    private fun buildTestTicket(printerName: String, width: Int): ByteArray {
        val out = ByteArrayOutputStream()

        EscPosPrinter.init(out)
        EscPosPrinter.setAlignCenter(out)
        EscPosPrinter.setBold(out, true)
        EscPosPrinter.setFontDoubleHeightWidth(out, true)
        EscPosPrinter.printLn(out, "TEST $printerName")
        EscPosPrinter.setFontDoubleHeightWidth(out, false)
        EscPosPrinter.setBold(out, false)
        EscPosPrinter.printLn(out, "")
        EscPosPrinter.printLn(out, "=".repeat(width))
        EscPosPrinter.printLn(out, "")
        EscPosPrinter.printLn(out, "Si ves esto, la")
        EscPosPrinter.printLn(out, "impresora funciona OK!")
        EscPosPrinter.printLn(out, "")
        EscPosPrinter.printLn(out, "=".repeat(width))
        EscPosPrinter.feedLines(out, 4)
        EscPosPrinter.cut(out)

        return out.toByteArray()
    }

    private fun startMonitoring() {
        if (isMonitoring) return
        isMonitoring = true

        monitorJob = lifecycleScope.launch {
            checkPrinterStatus()

            while (isActive) {
                delay(MONITOR_INTERVAL)
                if (isActive) {
                    checkPrinterStatus()
                }
            }
        }
    }

    private fun stopMonitoring() {
        isMonitoring = false
        monitorJob?.cancel()
        monitorJob = null
    }

    private suspend fun checkPrinterStatus() {
        val kitchenMac = PrinterConfig.kitchenPrinterMac
        if (kitchenMac.isNotBlank()) {
            val kitchenResult = BluetoothPrinterManager.diagnose(kitchenMac)
            withContext(Dispatchers.Main) {
                updateIndicator(
                    indicator = binding.kitchenIndicator,
                    statusText = binding.tvKitchenStatus,
                    result = kitchenResult
                )
            }
        }
    }

    private fun updateIndicator(
        indicator: android.view.View,
        statusText: android.widget.TextView,
        result: PrintResult
    ) {
        val (color, statusMessage) = when (result) {
            is PrintResult.Success -> Pair(0xFF4CAF50.toInt(), "✅ Lista")
            is PrintResult.NoPaper -> Pair(0xFFFF9800.toInt(), "🧻 Sin papel")
            is PrintResult.CoverOpen -> Pair(0xFFFF9800.toInt(), "📭 Tapa abierta")
            is PrintResult.ConnectionFailed -> Pair(0xFFF44336.toInt(), "❌ Sin conexión")
            is PrintResult.BluetoothOff -> Pair(0xFF9E9E9E.toInt(), "📴 BT apagado")
            is PrintResult.PrinterOffline -> Pair(0xFFF44336.toInt(), "💤 Offline")
            else -> Pair(0xFF9E9E9E.toInt(), "? Desconocido")
        }

        setIndicatorColor(indicator, color)
        statusText.text = statusMessage
        
        statusText.setTextColor(
            when (result) {
                is PrintResult.Success -> 0xFF4CAF50.toInt()
                is PrintResult.NoPaper, is PrintResult.CoverOpen -> 0xFFFF9800.toInt()
                is PrintResult.ConnectionFailed, is PrintResult.PrinterOffline -> 0xFFF44336.toInt()
                else -> 0xFF666666.toInt()
            }
        )
    }

    private fun setIndicatorColor(indicator: android.view.View, color: Int) {
        val drawable = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(color)
        }
        indicator.background = drawable
    }
}
