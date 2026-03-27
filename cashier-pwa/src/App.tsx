import { useState, useEffect, useCallback } from 'react';
import { api, type ManualPaymentReason } from './api/client';
import { OrderCard } from './components/OrderCard';
import { NewOrder } from './components/NewOrder';
import { ProductManager } from './components/ProductManager';
import { ExtrasManager } from './components/ExtrasManager';
import { KitchenView } from './components/KitchenView';
import { AuditView } from './components/AuditView';
import { MPMovementsView } from './components/MPMovementsView';
import { CashClosingView } from './components/CashClosingView';
import DashboardView from './components/DashboardView';
import SystemConfigView from './components/SystemConfigView';
import { BackendConfigModal } from './components/BackendConfigModal';
import { ManualPaymentModal } from './components/ManualPaymentModal';
import { QRModal } from './components/QRModal';
import { useBackendConfig } from './hooks/useBackendConfig';
import type { Order } from './types';

type Tab = 'new' | 'pending' | 'active' | 'ready' | 'settings';
type SettingsView = 'menu' | 'products' | 'extras' | 'kitchen' | 'audit' | 'mp-movements' | 'cash-closing' | 'dashboard' | 'system-config';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('new');
  const [settingsView, setSettingsView] = useState<SettingsView>('menu');
  const [showKitchenFullscreen, setShowKitchenFullscreen] = useState(false);
  const [showBackendConfig, setShowBackendConfig] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { status } = useBackendConfig();
  
  // Modales de pago
  const [qrModalOrder, setQrModalOrder] = useState<Order | null>(null);
  const [manualPaymentOrder, setManualPaymentOrder] = useState<Order | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const [recent, active, ready] = await Promise.all([
        api.getRecentOrders(50),
        api.getActiveOrders(),
        api.getReadyOrders(),
      ]);
      // Filtrar pedidos pendientes de pago (PENDING)
      const pending = recent.filter((o: Order) => o.status === 'PENDING');
      setPendingOrders(pending);
      setActiveOrders(active);
      setReadyOrders(ready);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    // Polling cada 10 segundos
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handlePayCash = async (orderId: number) => {
    try {
      await api.markPaidCash(orderId);
      fetchOrders();
    } catch (err) {
      alert('Error al marcar como pagado');
    }
  };

  const handleGenerateQR = (order: Order) => {
    setQrModalOrder(order);
  };

  const handlePayManual = (order: Order) => {
    setManualPaymentOrder(order);
  };

  const handleManualPaymentConfirm = async (data: { reason: ManualPaymentReason; notes: string }) => {
    if (!manualPaymentOrder) return;
    try {
      await api.markPaidManual(manualPaymentOrder.id, {
        reason: data.reason,
        approvedBy: 'Cajero',
        notes: data.notes || undefined,
      });
      setManualPaymentOrder(null);
      fetchOrders();
    } catch (err) {
      alert('Error al procesar pago manual');
    }
  };

  const handleStart = async (orderId: number) => {
    try {
      await api.updateKitchenStatus(orderId, 'IN_PREPARATION');
      fetchOrders();
    } catch (err) {
      alert('Error al cambiar estado');
    }
  };

  const handleReady = async (orderId: number) => {
    try {
      await api.updateKitchenStatus(orderId, 'READY');
      fetchOrders();
    } catch (err) {
      alert('Error al cambiar estado');
    }
  };

  const handleDelivered = async (orderId: number) => {
    try {
      await api.updateKitchenStatus(orderId, 'DELIVERED');
      fetchOrders();
    } catch (err) {
      alert('Error al cambiar estado');
    }
  };

  const orders = activeTab === 'pending' ? pendingOrders : activeTab === 'active' ? activeOrders : readyOrders;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '16px', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: '0', fontSize: '20px' }}>🧾 Casa Rica - Caja</h1>
        {/* Indicador de conexión */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '16px',
          fontSize: '12px',
          backgroundColor: status.connected ? '#dcfce7' : '#fee2e2',
          color: status.connected ? '#166534' : '#991b1b',
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: status.connected ? '#22c55e' : '#ef4444',
          }} />
          {status.connected ? 'Conectado' : 'Sin conexión'}
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('new')}
          style={{
            flex: 1,
            padding: '14px 8px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            backgroundColor: activeTab === 'new' ? '#8b5cf6' : '#e5e7eb',
            color: activeTab === 'new' ? '#fff' : '#374151',
          }}
        >
          ➕ Nuevo
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          style={{
            flex: 1,
            padding: '14px 8px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            backgroundColor: activeTab === 'pending' ? '#f59e0b' : '#e5e7eb',
            color: activeTab === 'pending' ? '#fff' : '#374151',
          }}
        >
          💵 {pendingOrders.length}
        </button>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            flex: 1,
            padding: '14px 8px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            backgroundColor: activeTab === 'active' ? '#3b82f6' : '#e5e7eb',
            color: activeTab === 'active' ? '#fff' : '#374151',
          }}
        >
          🔥 {activeOrders.length}
        </button>
        <button
          onClick={() => setActiveTab('ready')}
          style={{
            flex: 1,
            padding: '14px 8px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            backgroundColor: activeTab === 'ready' ? '#22c55e' : '#e5e7eb',
            color: activeTab === 'ready' ? '#fff' : '#374151',
          }}
        >
          ✅ {readyOrders.length}
        </button>
        <button
          onClick={() => { setActiveTab('settings'); setSettingsView('menu'); }}
          style={{
            flex: 1,
            padding: '14px 8px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            backgroundColor: activeTab === 'settings' ? '#6366f1' : '#e5e7eb',
            color: activeTab === 'settings' ? '#fff' : '#374151',
          }}
        >
          ⚙️
        </button>
      </div>

      {/* Contenido según pestaña */}
      {activeTab === 'new' ? (
        <NewOrder onOrderCreated={fetchOrders} />
      ) : activeTab === 'settings' ? (
        settingsView === 'menu' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>⚙️ Configuración</h2>
            <button
              onClick={() => setSettingsView('products')}
              style={{
                padding: 20,
                border: '1px solid #ddd',
                borderRadius: 12,
                background: 'white',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>📦</span>
              <div>
                <strong style={{ fontSize: 16 }}>Productos</strong>
                <p style={{ margin: 0, color: '#666', fontSize: 13 }}>Gestionar productos y categorías</p>
              </div>
            </button>
            <button
              onClick={() => setSettingsView('extras')}
              style={{
                padding: 20,
                border: '1px solid #ddd',
                borderRadius: 12,
                background: 'white',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>🧩</span>
              <div>
                <strong style={{ fontSize: 16 }}>Extras / Ingredientes</strong>
                <p style={{ margin: 0, color: '#666', fontSize: 13 }}>Aderezos, ingredientes adicionales</p>
              </div>
            </button>
            <button
              onClick={() => setShowKitchenFullscreen(true)}
              style={{
                padding: 20,
                border: '2px solid #f59e0b',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>🍳</span>
              <div>
                <strong style={{ fontSize: 16 }}>Vista de Cocina</strong>
                <p style={{ margin: 0, color: '#666', fontSize: 13 }}>Pantalla grande para cocineros</p>
              </div>
            </button>

            <div style={{ borderTop: '1px solid #e5e7eb', margin: '12px 0', paddingTop: 12 }}>
              <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: 13, fontWeight: 'bold' }}>📊 Auditoría</p>
            </div>

            <button
              onClick={() => setSettingsView('dashboard')}
              style={{
                padding: 20,
                border: '2px solid #8b5cf6',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>📊</span>
              <div>
                <strong style={{ fontSize: 16 }}>Dashboard</strong>
                <p style={{ margin: 0, color: '#666', fontSize: 13 }}>Estadísticas en tiempo real</p>
              </div>
            </button>

            <button
              onClick={() => setSettingsView('cash-closing')}
              style={{
                padding: 20,
                border: '2px solid #16a34a',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>🧾</span>
              <div>
                <strong style={{ fontSize: 16 }}>Cierre de Caja</strong>
                <p style={{ margin: 0, color: '#666', fontSize: 13 }}>Resumen de ventas y exportar PDF</p>
              </div>
            </button>

            <button
              onClick={() => setSettingsView('audit')}
              style={{
                padding: 20,
                border: '1px solid #ddd',
                borderRadius: 12,
                background: 'white',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>📋</span>
              <div>
                <strong style={{ fontSize: 16 }}>Auditoría de Pedidos</strong>
                <p style={{ margin: 0, color: '#666', fontSize: 13 }}>Ver historial completo con detalles</p>
              </div>
            </button>

            <button
              onClick={() => setSettingsView('mp-movements')}
              style={{
                padding: 20,
                border: '1px solid #3b82f6',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>💳</span>
              <div>
                <strong style={{ fontSize: 16 }}>Movimientos Mercado Pago</strong>
                <p style={{ margin: 0, color: '#666', fontSize: 13 }}>Ver pagos recibidos y su origen</p>
              </div>
            </button>

            <div style={{ borderTop: '1px solid #e5e7eb', margin: '12px 0', paddingTop: 12 }}>
              <p style={{ margin: '0 0 12px', color: '#6b7280', fontSize: 13, fontWeight: 'bold' }}>🔧 Sistema</p>
            </div>

            <button
              onClick={() => setSettingsView('system-config')}
              style={{
                padding: 20,
                border: '2px solid #6366f1',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>⚙️</span>
              <div>
                <strong style={{ fontSize: 16 }}>Configuración del Sistema</strong>
                <p style={{ margin: 0, color: '#666', fontSize: 13 }}>Datos del negocio, impuestos, MP</p>
              </div>
            </button>

            <button
              onClick={() => setShowBackendConfig(true)}
              style={{
                padding: 20,
                border: '1px solid #6b7280',
                borderRadius: 12,
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 28 }}>🖥️</span>
              <div>
                <strong style={{ fontSize: 16 }}>Configuración del Servidor</strong>
                <p style={{ margin: 0, color: '#666', fontSize: 13 }}>
                  Configurar URL del backend
                  <span style={{
                    marginLeft: 8,
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 11,
                    backgroundColor: status.connected ? '#dcfce7' : '#fee2e2',
                    color: status.connected ? '#166534' : '#991b1b',
                  }}>
                    {status.connected ? '● Conectado' : '○ Sin conexión'}
                  </span>
                </p>
              </div>
            </button>
          </div>
        ) : settingsView === 'products' ? (
          <ProductManager onBack={() => setSettingsView('menu')} />
        ) : settingsView === 'extras' ? (
          <ExtrasManager onBack={() => setSettingsView('menu')} />
        ) : settingsView === 'cash-closing' ? (
          <CashClosingView onBack={() => setSettingsView('menu')} />
        ) : settingsView === 'audit' ? (
          <AuditView onBack={() => setSettingsView('menu')} />
        ) : settingsView === 'mp-movements' ? (
          <MPMovementsView onBack={() => setSettingsView('menu')} />
        ) : settingsView === 'dashboard' ? (
          <DashboardView onBack={() => setSettingsView('menu')} />
        ) : settingsView === 'system-config' ? (
          <SystemConfigView onBack={() => setSettingsView('menu')} />
        ) : null
      ) : (
        <>
          {/* Refresh button */}
          <button
            onClick={fetchOrders}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#f9fafb',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {loading ? 'Cargando...' : '🔄 Actualizar'}
          </button>

          {/* Error */}
          {error && (
            <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '8px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {/* Orders list */}
          {orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              {activeTab === 'pending' ? 'No hay pedidos pendientes de pago' : 
               activeTab === 'active' ? 'No hay pedidos en preparación' : 'No hay pedidos listos'}
            </div>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onPayCash={() => handlePayCash(order.id)}
                onRegenerateQR={() => handleGenerateQR(order)}
                onPayManual={() => handlePayManual(order)}
                onStart={() => handleStart(order.id)}
                onReady={() => handleReady(order.id)}
                onDelivered={() => handleDelivered(order.id)}
                tab={activeTab}
              />
            ))
          )}
        </>
      )}

      {/* Kitchen View Fullscreen Overlay */}
      {showKitchenFullscreen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }}>
          <KitchenView onBack={() => setShowKitchenFullscreen(false)} />
        </div>
      )}

      {/* Backend Config Modal */}
      <BackendConfigModal
        isOpen={showBackendConfig}
        onClose={() => setShowBackendConfig(false)}
      />

      {/* QR Modal para regenerar QR */}
      {qrModalOrder && (
        <QRModal
          order={qrModalOrder}
          onClose={() => setQrModalOrder(null)}
          onPaid={() => {
            setQrModalOrder(null);
            fetchOrders();
          }}
        />
      )}

      {/* Manual Payment Modal */}
      {manualPaymentOrder && (
        <ManualPaymentModal
          isOpen={true}
          orderId={manualPaymentOrder.id}
          total={parseInt(manualPaymentOrder.totalAmount)}
          onConfirm={handleManualPaymentConfirm}
          onCancel={() => setManualPaymentOrder(null)}
        />
      )}
    </div>
  );
}

export default App;