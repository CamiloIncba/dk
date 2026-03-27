package com.norpan.kiosko.kitchen

import android.os.Bundle
import android.view.View
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.tabs.TabLayout
import com.norpan.kiosko.databinding.ActivityKitchenBinding
import kotlinx.coroutines.launch

class KitchenMainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityKitchenBinding
    private val viewModel: KitchenViewModel by viewModels()

    private lateinit var adapter: KitchenOrdersAdapter

    private enum class KitchenTab { PENDING, READY }
    private var activeTab: KitchenTab = KitchenTab.PENDING

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        binding = ActivityKitchenBinding.inflate(layoutInflater)
        setContentView(binding.root)

        adapter = KitchenOrdersAdapter(
            onStart = { orderId -> viewModel.setKitchenStatus(orderId, "IN_PREPARATION") },
            onReady = { orderId -> viewModel.setKitchenStatus(orderId, "READY") }
        )

        binding.ordersRecycler.layoutManager = LinearLayoutManager(this)
        binding.ordersRecycler.adapter = adapter

        setupTabs()

        binding.btnRefresh.setOnClickListener {
            viewModel.refreshAll()
        }

        observeOrders()
        observeReadyOrders()
        observeError()

        // primer refresh
        viewModel.refreshAll()
    }

    private fun setupTabs() {
        // Requiere que activity_kitchen.xml tenga un TabLayout con id "tabs"
        binding.tabs.removeAllTabs()
        binding.tabs.addTab(binding.tabs.newTab().setText("EN PREPARACIÓN"))
        binding.tabs.addTab(binding.tabs.newTab().setText("LISTOS"))

        binding.tabs.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab) {
                activeTab = if (tab.position == 1) KitchenTab.READY else KitchenTab.PENDING
                renderForActiveTab()
            }

            override fun onTabUnselected(tab: TabLayout.Tab) {}
            override fun onTabReselected(tab: TabLayout.Tab) {}
        })

        // default
        binding.tabs.getTabAt(0)?.select()
        renderForActiveTab()
    }

    private fun observeOrders() {
        lifecycleScope.launch {
            viewModel.orders.collect {
                if (activeTab == KitchenTab.PENDING) renderForActiveTab()
            }
        }
    }

    private fun observeReadyOrders() {
        lifecycleScope.launch {
            viewModel.readyOrders.collect {
                if (activeTab == KitchenTab.READY) renderForActiveTab()
            }
        }
    }

    private fun renderForActiveTab() {
        val list = when (activeTab) {
            KitchenTab.PENDING -> viewModel.orders.value
            KitchenTab.READY -> viewModel.readyOrders.value
        }

        // En "LISTOS" ocultamos acciones
        adapter.setShowActions(activeTab == KitchenTab.PENDING)
        adapter.submitList(list)

        val empty = list.isEmpty()
        binding.emptyText.visibility = if (empty) View.VISIBLE else View.GONE
        binding.ordersRecycler.visibility = if (empty) View.GONE else View.VISIBLE

        binding.emptyText.text = if (activeTab == KitchenTab.READY) {
            "No hay pedidos listos"
        } else {
            "No hay pedidos"
        }
    }

    private fun observeError() {
        lifecycleScope.launch {
            viewModel.error.collect { msg ->
                binding.errorText.text = msg ?: ""
                binding.errorText.visibility = if (msg == null) View.GONE else View.VISIBLE
            }
        }
    }
}
