package com.norpan.kiosko.data.remote.dto

/**
 * Ítem que se envía al backend para crear una orden.
 */
data class OrderItemRequest(
    val productId: Int,
    val quantity: Int
)

/**
 * Request para crear una orden.
 */
data class CreateOrderRequest(
    val items: List<OrderItemRequest>,
    val note: String? = null
)

/**
 * Producto embebido dentro de un ítem de orden.
 *
 * Viene del include:
 *   items: { include: { product: true } }
 * en OrdersService.getOrderById / listRecentOrders.
 */
data class OrderProductResponse(
    val id: Int,
    val name: String
    // si en el futuro necesitás más campos (price, sku, etc), se suman acá.
)

/**
 * Ítem de una orden tal como lo devuelve el backend.
 */
data class OrderItemResponse(
    val id: Int,
    val productId: Int,
    val quantity: Int,
    val unitPrice: Double?, // Prisma Decimal → JSON → Double/String
    val product: OrderProductResponse?
)

/**
 * Respuesta general de orden.
 *
 * La usamos tanto para:
 * - crear orden (POST /orders)
 * - obtener una orden (GET /orders/{id})
 * - eventualmente listados de órdenes
 *
 * IMPORTANTE:
 * - En otros lugares (ej. polling de pago) sólo usamos id/status.
 * - Los demás campos son opcionales para no romper nada.
 */
data class OrderResponse(
    val id: Int,
    val status: String,
    val totalAmount: Double? = null,
    val note: String? = null,
    val createdAt: String? = null,
    val items: List<OrderItemResponse>? = null
)

/**
 * Request para crear el QR de Mercado Pago para una orden.
 */
data class CreateMpQrRequest(
    val orderId: Int
)

/**
 * Respuesta simplificada del endpoint /payments/mp/qr
 */
data class MpQrResponse(
    val preferenceId: String,
    val initPoint: String,
    val sandboxInitPoint: String?,
    val externalReference: String
)

/**
 * Respuesta del endpoint /payments/mp/kiosk/order
 * QR estático del kiosko
 */
data class KioskQrResponse(
    val success: Boolean,
    val qrData: String? = null,
    val inStoreOrderId: String? = null,
    val message: String? = null
)

/**
 * Respuesta del endpoint /payments/mp/kiosk/check/:orderId
 * Verificación de estado de pago del kiosko
 */
data class KioskPaymentStatusResponse(
    val paid: Boolean,
    val paymentId: String? = null,
    val status: String,
    val shouldRetry: Boolean
)

/**
 * Respuesta del endpoint /payments/mp/kiosk/qr
 * QR del POS para imprimir
 */
data class KioskPosQrResponse(
    val qrData: String,
    val posId: String
)
