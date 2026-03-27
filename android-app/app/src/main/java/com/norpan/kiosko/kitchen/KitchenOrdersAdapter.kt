package com.norpan.kiosko.kitchen

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.norpan.kiosko.databinding.ItemKitchenOrderBinding
import com.norpan.kiosko.kitchen.model.KitchenOrderDto

class KitchenOrdersAdapter(
    private val onStart: (orderId: Int) -> Unit,
    private val onReady: (orderId: Int) -> Unit,
) : ListAdapter<KitchenOrderDto, KitchenOrdersAdapter.VH>(Diff) {

    private var showActions: Boolean = true

    fun setShowActions(value: Boolean) {
        if (showActions != value) {
            showActions = value
            notifyDataSetChanged()
        }
    }

    object Diff : DiffUtil.ItemCallback<KitchenOrderDto>() {
        override fun areItemsTheSame(oldItem: KitchenOrderDto, newItem: KitchenOrderDto): Boolean =
            oldItem.id == newItem.id

        override fun areContentsTheSame(oldItem: KitchenOrderDto, newItem: KitchenOrderDto): Boolean =
            oldItem == newItem
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
        val binding = ItemKitchenOrderBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return VH(binding, onStart, onReady)
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        holder.bind(getItem(position), showActions)
    }

    class VH(
        private val binding: ItemKitchenOrderBinding,
        private val onStart: (Int) -> Unit,
        private val onReady: (Int) -> Unit,
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(order: KitchenOrderDto, showActions: Boolean) {
            // Mostrar solo ID de orden
            binding.txtOrderTitle.text = "#${order.id}"
            binding.txtKitchenStatus.text = when (order.kitchenStatus) {
                "PENDING" -> "⏳ Pendiente"
                "IN_PREPARATION" -> "🔥 En Preparación"
                "READY" -> "✅ Listo"
                else -> order.kitchenStatus
            }

            // Items con extras
            val itemsText = order.items.joinToString(separator = "\n\n") { item ->
                val productLine = "• ${item.quantity} x ${item.product.name}"
                val extrasLines = item.extras?.takeIf { it.isNotEmpty() }?.let { extras ->
                    extras.joinToString(separator = "\n") { extra ->
                        "   + ${extra.extraOption.name}${if (extra.quantity > 1) " x${extra.quantity}" else ""}"
                    }
                } ?: ""
                if (extrasLines.isNotEmpty()) "$productLine\n$extrasLines" else productLine
            }
            binding.txtItems.text = itemsText

            binding.btnStart.visibility = if (showActions) View.VISIBLE else View.GONE
            binding.btnReady.visibility = if (showActions) View.VISIBLE else View.GONE

            if (showActions) {
                binding.btnStart.setOnClickListener { onStart(order.id) }
                binding.btnReady.setOnClickListener { onReady(order.id) }
            } else {
                binding.btnStart.setOnClickListener(null)
                binding.btnReady.setOnClickListener(null)
            }
        }
    }
}
