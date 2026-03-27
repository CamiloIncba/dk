package com.norpan.kiosko.data.remote

import com.norpan.kiosko.data.remote.dto.CreateMpQrRequest
import com.norpan.kiosko.data.remote.dto.CreatePointIntentRequest
import com.norpan.kiosko.data.remote.dto.KioskPaymentStatusResponse
import com.norpan.kiosko.data.remote.dto.KioskPosQrResponse
import com.norpan.kiosko.data.remote.dto.KioskQrResponse
import com.norpan.kiosko.data.remote.dto.MpQrResponse
import com.norpan.kiosko.data.remote.dto.PointClearResponse
import com.norpan.kiosko.data.remote.dto.PointDeviceResponse
import com.norpan.kiosko.data.remote.dto.PointIntentResponse
import com.norpan.kiosko.data.remote.dto.PointIntentStatusResponse
import com.norpan.kiosko.data.remote.dto.ProcessPointPaymentRequest
import com.norpan.kiosko.data.remote.dto.ProcessPointPaymentResponse
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface PaymentsApi {

    // QR Dinámico (Checkout Pro) - legacy
    @POST("payments/mp/qr")
    suspend fun createMpQr(@Body request: CreateMpQrRequest): MpQrResponse

    // ============================================================
    // QR Kiosko (autoservicio) - POS dedicado con QR estático
    // ============================================================

    /**
     * Monta una orden en el QR estático del Kiosko.
     * El cliente escanea el QR físico del kiosko y paga.
     */
    @POST("payments/mp/kiosk/order")
    suspend fun createKioskOrder(@Body request: CreateMpQrRequest): KioskQrResponse

    /**
     * Limpia la orden del QR del Kiosko (para cancelar)
     */
    @DELETE("payments/mp/kiosk/order")
    suspend fun deleteKioskOrder(): Map<String, Boolean>

    /**
     * Obtiene el QR del POS del Kiosko para imprimir una sola vez.
     */
    @GET("payments/mp/kiosk/qr")
    suspend fun getKioskQr(): KioskPosQrResponse

    /**
     * Verifica el estado del pago para el Kiosko.
     * Más optimizado que check-payment genérico.
     */
    @GET("payments/mp/kiosk/check/{orderId}")
    suspend fun checkKioskPayment(@Path("orderId") orderId: Int): KioskPaymentStatusResponse

    // ============================================================
    // Terminal Point (cobro con tarjeta de débito/crédito)
    // ============================================================

    /**
     * Lista dispositivos Point vinculados a la cuenta
     */
    @GET("payments/mp/point/devices")
    suspend fun getPointDevices(): List<PointDeviceResponse>

    /**
     * Crea intención de pago en terminal Point
     */
    @POST("payments/mp/point/intent")
    suspend fun createPointIntent(@Body request: CreatePointIntentRequest): PointIntentResponse

    /**
     * Consulta estado de intención Point
     */
    @GET("payments/mp/point/intent/{deviceId}/{intentId}")
    suspend fun getPointIntentStatus(
        @Path("deviceId") deviceId: String,
        @Path("intentId") intentId: String
    ): PointIntentStatusResponse

    /**
     * Procesa resultado del pago Point y actualiza la orden
     */
    @POST("payments/mp/point/process")
    suspend fun processPointPayment(@Body request: ProcessPointPaymentRequest): ProcessPointPaymentResponse

    /**
     * Cancela intención de pago en terminal Point
     */
    @DELETE("payments/mp/point/intent/{deviceId}/{intentId}")
    suspend fun cancelPointIntent(
        @Path("deviceId") deviceId: String,
        @Path("intentId") intentId: String
    ): Map<String, Boolean>

    /**
     * Limpia/resetea el dispositivo Point cancelando cualquier intent activo.
     * Útil para sincronizar kiosko cuando el Point quedó en estado inconsistente.
     */
    @POST("payments/mp/point/clear/{deviceId}")
    suspend fun clearPointDevice(
        @Path("deviceId") deviceId: String
    ): PointClearResponse
}
