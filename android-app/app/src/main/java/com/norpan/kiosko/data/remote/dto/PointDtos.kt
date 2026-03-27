package com.norpan.kiosko.data.remote.dto

/**
 * Dispositivo Point vinculado a la cuenta MP
 */
data class PointDeviceResponse(
    val id: String,
    val operating_mode: String? = null,
    val pos: PointPosInfo? = null
)

data class PointPosInfo(
    val id: Long? = null,
    val name: String? = null,
    val external_store_id: String? = null,
    val external_id: String? = null
)

/**
 * Request para crear intención de pago Point
 */
data class CreatePointIntentRequest(
    val orderId: Int,
    val deviceId: String,
    val description: String? = null
)

/**
 * Respuesta al crear intención de pago Point
 */
data class PointIntentResponse(
    val intentId: String,
    val deviceId: String,
    val status: String? = null,
    val amount: Double? = null,
    val message: String? = null
)

/**
 * Estado de la intención de pago Point
 */
data class PointIntentStatusResponse(
    val intentId: String,
    val state: String,
    val payment: PointPaymentInfo? = null,
    val cancellation: PointCancellationInfo? = null,
    val lastEventTimestamp: String? = null
)

data class PointPaymentInfo(
    val id: String? = null,
    val type: String? = null,
    val installments: Int? = null,
    val installments_cost: String? = null,
    val paid_amount: Double? = null
)

data class PointCancellationInfo(
    val reason: String? = null,
    val canceled_by: String? = null,
    val status: String? = null
)

/**
 * Request para procesar resultado de pago Point
 */
data class ProcessPointPaymentRequest(
    val orderId: Int,
    val deviceId: String,
    val intentId: String
)

/**
 * Respuesta de procesar pago Point
 */
data class ProcessPointPaymentResponse(
    val success: Boolean,
    val orderId: Int,
    val message: String? = null,
    val paymentId: String? = null,
    val status: String? = null
)

/**
 * Respuesta al limpiar/resetear dispositivo Point
 */
data class PointClearResponse(
    val deviceStatus: PointDeviceStatus,
    val cleanupResult: PointCleanupResult
)

data class PointDeviceStatus(
    val id: String,
    val operating_mode: String? = null,
    val status: String? = null,
    val available: Boolean = false,
    val message: String? = null
)

data class PointCleanupResult(
    val attemptedCancellation: Boolean = false,
    val success: Boolean = false,
    val message: String? = null
)
