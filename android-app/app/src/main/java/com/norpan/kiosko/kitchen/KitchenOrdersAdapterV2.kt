package com.norpan.kiosko.kitchen

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.google.android.flexbox.FlexboxLayout
import com.norpan.kiosko.R
import com.norpan.kiosko.databinding.ItemKitchenOrderV2Binding
import com.norpan.kiosko.kitchen.model.KitchenOrderDto
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

/**
 * Adapter mejorado para la vista de cocina.
 * Muestra tarjetas grandes con items y extras bien visibles.
 * Los contadores de tiempo se actualizan cada segundo.
 */
class KitchenOrdersAdapterV2(
    private val onReady: (orderId: Int) -> Unit,
    private val onDelivered: (orderId: Int) -> Unit,
    private val onReprint: (order: KitchenOrderDto) -> Unit,
    private val isReadyColumn: Boolean = false
) : ListAdapter<KitchenOrderDto, KitchenOrdersAdapterV2.ViewHolder>(DiffCallback) {

    // Timestamp actual para calcular tiempos - se actualiza desde fuera
    var currentTimeMillis: Long = System.currentTimeMillis()
        set(value) {
            field = value
            // Notificar a todos los items que actualicen su display
            notifyItemRangeChanged(0, itemCount, PAYLOAD_TIME_UPDATE)
        }

    companion object {
        private const val PAYLOAD_TIME_UPDATE = "time_update"
    }

    object DiffCallback : DiffUtil.ItemCallback<KitchenOrderDto>() {
        override fun areItemsTheSame(a: KitchenOrderDto, b: KitchenOrderDto) = a.id == b.id
        override fun areContentsTheSame(a: KitchenOrderDto, b: KitchenOrderDto) = a == b
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemKitchenOrderV2Binding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position), isReadyColumn, onReady, onDelivered, onReprint, currentTimeMillis)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int, payloads: MutableList<Any>) {
        if (payloads.contains(PAYLOAD_TIME_UPDATE)) {
            // Solo actualizar el tiempo, no re-renderizar todo
            holder.updateTimeOnly(getItem(position).createdAt, currentTimeMillis)
        } else {
            super.onBindViewHolder(holder, position, payloads)
        }
    }

    class ViewHolder(
        private val binding: ItemKitchenOrderV2Binding
    ) : RecyclerView.ViewHolder(binding.root) {

        private val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")

        fun bind(
            order: KitchenOrderDto,
            isReadyColumn: Boolean,
            onReady: (Int) -> Unit,
            onDelivered: (Int) -> Unit,
            onReprint: (KitchenOrderDto) -> Unit,
            currentTimeMillis: Long
        ) {
            val context = binding.root.context

            // Número de orden (solo ID)
            binding.txtOrderCode.text = "#${order.id}"

            // Tiempo transcurrido (actualizado cada segundo)
            updateTimeOnly(order.createdAt, currentTimeMillis)

            // Hora de creación
            binding.txtCreatedAt.text = formatTime(order.createdAt)

            // Items del pedido
            binding.itemsContainer.removeAllViews()
            for (item in order.items) {
                val itemView = LayoutInflater.from(context)
                    .inflate(R.layout.item_order_product, binding.itemsContainer, false)

                itemView.findViewById<TextView>(R.id.txtQuantity).text = item.quantity.toString()
                itemView.findViewById<TextView>(R.id.txtProductName).text = item.product.name

                // Extras
                val extrasContainer = itemView.findViewById<FlexboxLayout>(R.id.extrasContainer)
                val extras = item.extras
                if (!extras.isNullOrEmpty()) {
                    extrasContainer.visibility = View.VISIBLE
                    extrasContainer.removeAllViews()

                    for (extra in extras) {
                        val badge = LayoutInflater.from(context)
                            .inflate(R.layout.item_extra_badge, extrasContainer, false) as TextView
                        badge.text = "+ ${extra.extraOption.name}"
                        extrasContainer.addView(badge)
                    }
                } else {
                    extrasContainer.visibility = View.GONE
                }

                binding.itemsContainer.addView(itemView)
            }

            // Botón de acción
            if (isReadyColumn) {
                binding.btnAction.text = "🎉 ENTREGADO"
                binding.btnAction.setBackgroundColor(context.getColor(android.R.color.holo_blue_dark))
                binding.btnAction.setOnClickListener { onDelivered(order.id) }
            } else {
                binding.btnAction.text = "✓ LISTO"
                binding.btnAction.setBackgroundColor(context.getColor(android.R.color.holo_green_dark))
                binding.btnAction.setOnClickListener { onReady(order.id) }
            }
            
            // Botón de reimprimir
            binding.btnReprint.setOnClickListener { onReprint(order) }
        }

        /**
         * Actualiza solo el badge de tiempo sin re-renderizar todo el item
         */
        fun updateTimeOnly(createdAt: String, currentTimeMillis: Long) {
            val timeInfo = getTimeSince(createdAt, currentTimeMillis)
            binding.txtTimeBadge.text = timeInfo.display
            binding.txtTimeBadge.setBackgroundResource(getTimeBadgeDrawable(timeInfo.minutes))
        }

        private data class TimeInfo(val minutes: Int, val seconds: Int, val display: String)

        private fun getTimeSince(dateStr: String, currentTimeMillis: Long): TimeInfo {
            return try {
                val instant = Instant.parse(dateStr)
                val diffMs = currentTimeMillis - instant.toEpochMilli()
                val totalSeconds = (diffMs / 1000).toInt().coerceAtLeast(0)
                val minutes = totalSeconds / 60
                val seconds = totalSeconds % 60

                val display = if (minutes < 60) {
                    // Formato MM:SS para menos de 1 hora
                    "${minutes}:${seconds.toString().padStart(2, '0')}"
                } else {
                    // Formato Xh Ym para más de 1 hora
                    val hours = minutes / 60
                    val mins = minutes % 60
                    "${hours}h ${mins}m"
                }

                TimeInfo(minutes, seconds, display)
            } catch (e: Exception) {
                TimeInfo(0, 0, "0:00")
            }
        }

        private fun formatTime(dateStr: String): String {
            return try {
                val instant = Instant.parse(dateStr)
                val localTime = instant.atZone(ZoneId.systemDefault()).toLocalTime()
                timeFormatter.format(localTime)
            } catch (e: Exception) {
                ""
            }
        }

        private fun getTimeBadgeDrawable(minutes: Int): Int {
            return when {
                minutes < 5 -> R.drawable.time_badge_green
                minutes < 10 -> R.drawable.time_badge_orange
                else -> R.drawable.time_badge_red
            }
        }
    }
}
