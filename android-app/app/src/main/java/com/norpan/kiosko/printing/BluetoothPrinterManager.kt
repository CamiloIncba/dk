package com.norpan.kiosko.printing

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothSocket
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.io.IOException
import java.io.InputStream
import java.util.UUID

/**
 * Resultado de una operación de impresión con detalle del error.
 */
sealed class PrintResult {
    object Success : PrintResult()
    object NotConfigured : PrintResult()
    object BluetoothOff : PrintResult()
    object BluetoothUnavailable : PrintResult()
    object ConnectionFailed : PrintResult()
    object PermissionDenied : PrintResult()
    object Timeout : PrintResult()
    
    // Errores específicos de la impresora (detectados vía DLE EOT)
    object NoPaper : PrintResult()
    object CoverOpen : PrintResult()
    object PaperJam : PrintResult()
    object CutterError : PrintResult()
    object PrinterOffline : PrintResult()
    object UnknownPrinterError : PrintResult()
    
    data class OtherError(val message: String) : PrintResult()
    
    val isSuccess: Boolean get() = this is Success
    
    fun toUserMessage(): String = when (this) {
        is Success -> "Impresión exitosa"
        is NotConfigured -> "Impresora no configurada"
        is BluetoothOff -> "Bluetooth apagado"
        is BluetoothUnavailable -> "Bluetooth no disponible"
        is ConnectionFailed -> "No se pudo conectar a la impresora"
        is PermissionDenied -> "Permiso de Bluetooth denegado"
        is Timeout -> "Tiempo de espera agotado"
        is NoPaper -> "⚠️ SIN PAPEL - Cargá papel térmico"
        is CoverOpen -> "⚠️ TAPA ABIERTA - Cerrá la tapa de la impresora"
        is PaperJam -> "⚠️ ATASCO DE PAPEL - Revisá la impresora"
        is CutterError -> "⚠️ ERROR DE CUCHILLA - Revisá el cortador"
        is PrinterOffline -> "Impresora offline o apagada"
        is UnknownPrinterError -> "Error desconocido en la impresora"
        is OtherError -> "Error: $message"
    }
}

/**
 * Se encarga de conectarse a la impresora Bluetooth (SPP) y enviar los bytes ESC/POS.
 * Detecta errores específicos de la impresora (sin papel, tapa abierta, atasco).
 *
 * Uso:
 *   val result = BluetoothPrinterManager.print(bytes)
 *   if (!result.isSuccess) showError(result.toUserMessage())
 */
object BluetoothPrinterManager {

    // UUID estándar para SPP (Serial Port Profile)
    private val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    // Comandos ESC/POS para consultar estado
    private val DLE_EOT_PRINTER = byteArrayOf(0x10, 0x04, 0x01)  // Estado general
    private val DLE_EOT_OFFLINE = byteArrayOf(0x10, 0x04, 0x02)  // Causa offline
    private val DLE_EOT_ERROR = byteArrayOf(0x10, 0x04, 0x03)    // Errores
    private val DLE_EOT_PAPER = byteArrayOf(0x10, 0x04, 0x04)    // Estado del papel

    // Configuración de reintentos
    private const val MAX_RETRIES = 2
    private const val RETRY_DELAY_MS = 1000L
    private const val STATUS_READ_TIMEOUT_MS = 500L

    /**
     * Imprime en la impresora KIOSKO (ticket cliente).
     * Retorna PrintResult con detalle del resultado.
     */
    suspend fun print(data: ByteArray): Boolean {
        if (!PrinterConfig.kioskPrinterEnabled) return false
        return printToMac(data, PrinterConfig.PRINTER_MAC_ADDRESS)
    }

    /**
     * Imprime en la impresora COCINA (comandas).
     * Retorna PrintResult con detalle del resultado.
     */
    suspend fun printToKitchen(data: ByteArray): Boolean {
        if (!PrinterConfig.kitchenPrinterEnabled) return false
        return printToMac(data, PrinterConfig.kitchenPrinterMac)
    }

    /**
     * Versión detallada que retorna PrintResult.
     */
    suspend fun printWithResult(data: ByteArray): PrintResult {
        if (!PrinterConfig.kioskPrinterEnabled) return PrintResult.NotConfigured
        return printToMacWithResult(data, PrinterConfig.PRINTER_MAC_ADDRESS)
    }

    suspend fun printToKitchenWithResult(data: ByteArray): PrintResult {
        if (!PrinterConfig.kitchenPrinterEnabled) return PrintResult.NotConfigured
        return printToMacWithResult(data, PrinterConfig.kitchenPrinterMac)
    }

    /**
     * Imprime a una MAC específica (compatibilidad).
     */
    suspend fun printToMac(data: ByteArray, mac: String): Boolean {
        return printToMacWithResult(data, mac).isSuccess
    }

    /**
     * Imprime a una MAC específica con reintentos y detección de errores.
     */
    suspend fun printToMacWithResult(
        data: ByteArray, 
        mac: String,
        retries: Int = MAX_RETRIES
    ): PrintResult = withContext(Dispatchers.IO) {
        
        if (mac.isBlank()) {
            return@withContext PrintResult.NotConfigured
        }

        val adapter = BluetoothAdapter.getDefaultAdapter()
            ?: return@withContext PrintResult.BluetoothUnavailable

        if (!adapter.isEnabled) {
            return@withContext PrintResult.BluetoothOff
        }

        var lastResult: PrintResult = PrintResult.ConnectionFailed
        
        // Intentar con reintentos
        repeat(retries + 1) { attempt ->
            if (attempt > 0) {
                delay(RETRY_DELAY_MS)
            }
            
            lastResult = attemptPrint(adapter, mac, data)
            
            if (lastResult.isSuccess) {
                return@withContext PrintResult.Success
            }
            
            // Si es un error de impresora (papel, tapa), no reintentar
            // porque el usuario debe intervenir
            if (lastResult is PrintResult.NoPaper ||
                lastResult is PrintResult.CoverOpen ||
                lastResult is PrintResult.PaperJam ||
                lastResult is PrintResult.CutterError) {
                return@withContext lastResult
            }
        }
        
        lastResult
    }

    /**
     * Intenta imprimir una vez y detecta errores.
     */
    private suspend fun attemptPrint(
        adapter: BluetoothAdapter,
        mac: String,
        data: ByteArray
    ): PrintResult {
        var socket: BluetoothSocket? = null

        try {
            val device = adapter.getRemoteDevice(mac)
            adapter.cancelDiscovery()

            socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
            socket.connect()

            val outStream = socket.outputStream
            val inStream = socket.inputStream

            // Nota: Desactivamos checkPrinterStatus() porque muchas impresoras
            // térmicas económicas (como POS-80, XP-58) no soportan correctamente
            // los comandos DLE EOT y devuelven valores incorrectos que causan
            // falsos positivos de error.
            // 
            // Si la impresora tiene un problema real (sin papel, tapa abierta),
            // simplemente no imprimirá y el usuario lo notará visualmente.
            
            // TODO: En el futuro, hacer esto configurable por impresora
            // val printerStatus = checkPrinterStatus(outStream, inStream)
            // if (printerStatus != PrintResult.Success) {
            //     return printerStatus
            // }

            // 2) Enviar datos de impresión
            outStream.write(data)
            outStream.flush()

            // 3) Pequeña pausa para que la impresora procese
            delay(200)

            // Verificación post-impresión desactivada por la misma razón
            // val postStatus = checkPrinterStatus(outStream, inStream)
            // if (postStatus is PrintResult.NoPaper || 
            //     postStatus is PrintResult.PaperJam) {
            //     return postStatus
            // }

            return PrintResult.Success

        } catch (e: SecurityException) {
            e.printStackTrace()
            return PrintResult.PermissionDenied
        } catch (e: IOException) {
            e.printStackTrace()
            return PrintResult.ConnectionFailed
        } catch (e: Exception) {
            e.printStackTrace()
            return PrintResult.OtherError(e.message ?: "Error desconocido")
        } finally {
            try {
                socket?.close()
            } catch (_: Exception) {}
        }
    }

    /**
     * Consulta el estado de la impresora usando comandos DLE EOT.
     * Retorna Success si está lista, o el error específico.
     * 
     * Nota: No todas las impresoras soportan DLE EOT correctamente.
     * Muchas impresoras chinas económicas no responden o responden
     * valores no estándar. Si no podemos confirmar un error claro,
     * asumimos que está OK y dejamos que falle al imprimir.
     */
    private suspend fun checkPrinterStatus(
        out: java.io.OutputStream,
        input: InputStream
    ): PrintResult {
        try {
            // Limpiar buffer de entrada
            while (input.available() > 0) {
                input.read()
            }

            // Consultar estado del papel (más importante)
            out.write(DLE_EOT_PAPER)
            out.flush()

            val paperStatus = readStatusByte(input)
            if (paperStatus != null) {
                val status = paperStatus.toInt() and 0xFF  // Convertir a unsigned
                // Según ESC/POS estándar, bits 5-6 indican sin papel
                // Pero solo fallar si es claramente 0x60 o más
                // Algunos valores comunes: 0x12, 0x00 = OK
                if (status == 0x60 || status == 0x72 || status == 0x7E) {
                    return PrintResult.NoPaper
                }
            }

            // Consultar errores generales
            out.write(DLE_EOT_ERROR)
            out.flush()

            val errorStatus = readStatusByte(input)
            if (errorStatus != null) {
                val status = errorStatus.toInt() and 0xFF
                // Bit 3: Error de cuchilla autocutter (0x08)
                // Solo si está claramente seteado y otros bits indican error
                if ((status and 0x08) != 0 && (status and 0x40) != 0) {
                    return PrintResult.CutterError
                }
            }

            // Consultar estado offline
            out.write(DLE_EOT_OFFLINE)
            out.flush()

            val offlineStatus = readStatusByte(input)
            if (offlineStatus != null) {
                val status = offlineStatus.toInt() and 0xFF
                // Bit 2: Tapa abierta - pero verificar que sea claro
                // Valores como 0x04, 0x14, 0x34 indican tapa abierta
                if ((status and 0x04) != 0 && status != 0x12) {
                    return PrintResult.CoverOpen
                }
            }

            return PrintResult.Success

        } catch (e: Exception) {
            // Si falla la consulta de estado, asumimos OK
            // y dejamos que falle al imprimir si hay problema real
            return PrintResult.Success
        }
    }

    /**
     * Lee un byte de estado con timeout.
     * Retorna null si no hay respuesta (impresora no soporta DLE EOT).
     */
    private suspend fun readStatusByte(input: InputStream): Byte? {
        return withTimeoutOrNull(STATUS_READ_TIMEOUT_MS) {
            var waited = 0L
            while (input.available() == 0 && waited < STATUS_READ_TIMEOUT_MS) {
                delay(50)
                waited += 50
            }
            if (input.available() > 0) {
                input.read().toByte()
            } else {
                null
            }
        }
    }

    /**
     * Diagnóstico completo de la impresora.
     * Útil para la pantalla de configuración.
     */
    suspend fun diagnose(mac: String): PrintResult = withContext(Dispatchers.IO) {
        if (mac.isBlank()) {
            return@withContext PrintResult.NotConfigured
        }

        val adapter = BluetoothAdapter.getDefaultAdapter()
            ?: return@withContext PrintResult.BluetoothUnavailable

        if (!adapter.isEnabled) {
            return@withContext PrintResult.BluetoothOff
        }

        var socket: BluetoothSocket? = null

        try {
            val device = adapter.getRemoteDevice(mac)
            adapter.cancelDiscovery()

            socket = device.createRfcommSocketToServiceRecord(SPP_UUID)
            socket.connect()

            val status = checkPrinterStatus(socket.outputStream, socket.inputStream)
            status

        } catch (e: SecurityException) {
            PrintResult.PermissionDenied
        } catch (e: IOException) {
            PrintResult.ConnectionFailed
        } catch (e: Exception) {
            PrintResult.OtherError(e.message ?: "Error desconocido")
        } finally {
            try {
                socket?.close()
            } catch (_: Exception) {}
        }
    }
}
