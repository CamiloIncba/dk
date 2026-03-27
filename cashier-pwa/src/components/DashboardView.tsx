import { useEffect, useState } from 'react';
import { getDashboardStats } from '../api/client';
import type { DashboardStats } from '../api/client';

interface Props {
  onBack: () => void;
}

export default function DashboardView({ onBack }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
    // Auto-refresh cada 30 segundos
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getDashboardStats();
      setStats(data);
      setError('');
    } catch {
      setError('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (n: number) => `$${n.toFixed(2)}`;
  const formatPercent = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: 'Pendiente',
      PAID: 'Pagado',
      PREPARING: 'Preparando',
      READY: 'Listo',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado',
      PAYMENT_FAILED: 'Pago fallido',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: '#f59e0b',
      PAID: '#10b981',
      PREPARING: '#3b82f6',
      READY: '#8b5cf6',
      DELIVERED: '#6b7280',
      CANCELLED: '#ef4444',
      PAYMENT_FAILED: '#dc2626',
    };
    return colors[status] || '#6b7280';
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      CASH: 'Efectivo',
      MERCADO_PAGO: 'Mercado Pago',
      MANUAL: 'Manual',
      UNKNOWN: 'Sin especificar',
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={{ padding: 20 }}>
        <button onClick={onBack} style={{ marginBottom: 16, padding: '8px 16px', border: '1px solid #ddd', borderRadius: 8, background: 'white' }}>
          ← Volver
        </button>
        <p style={{ color: '#ef4444' }}>{error || 'No hay datos disponibles'}</p>
      </div>
    );
  }

  // Calcular máximo para gráficas de barras
  const maxSalesByHour = Math.max(...stats.salesByHour.map(h => h.sales), 1);
  const maxSalesByDay = Math.max(...stats.salesByDay.map(d => d.sales), 1);

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={onBack}
            style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 8, background: 'white', cursor: 'pointer' }}
          >
            ← Volver
          </button>
          <h1 style={{ margin: 0, fontSize: 24 }}>📊 Dashboard</h1>
        </div>
        <button
          onClick={fetchStats}
          style={{ padding: '8px 16px', border: '1px solid #3b82f6', borderRadius: 8, background: '#3b82f6', color: 'white', cursor: 'pointer' }}
        >
          🔄 Actualizar
        </button>
      </div>

      {/* KPIs principales */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Ventas de hoy */}
        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: 12, padding: 20, color: 'white' }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Ventas de Hoy</div>
          <div style={{ fontSize: 28, fontWeight: 'bold' }}>{formatMoney(stats.todaySales)}</div>
          <div style={{ fontSize: 13, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ 
              background: stats.salesGrowth >= 0 ? 'rgba(255,255,255,0.2)' : 'rgba(239,68,68,0.3)',
              padding: '2px 8px', 
              borderRadius: 4 
            }}>
              {formatPercent(stats.salesGrowth)}
            </span>
            <span style={{ opacity: 0.9 }}>vs ayer</span>
          </div>
        </div>

        {/* Órdenes de hoy */}
        <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: 12, padding: 20, color: 'white' }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Órdenes de Hoy</div>
          <div style={{ fontSize: 28, fontWeight: 'bold' }}>{stats.todayOrders}</div>
          <div style={{ fontSize: 13, marginTop: 8, opacity: 0.9 }}>
            Ayer: {Math.round(stats.yesterdaySales / (stats.averageTicket || 1))} órdenes
          </div>
        </div>

        {/* Ticket promedio */}
        <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', borderRadius: 12, padding: 20, color: 'white' }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Ticket Promedio</div>
          <div style={{ fontSize: 28, fontWeight: 'bold' }}>{formatMoney(stats.averageTicket)}</div>
          <div style={{ fontSize: 13, marginTop: 8, opacity: 0.9 }}>
            Por orden
          </div>
        </div>

        {/* Órdenes pendientes */}
        <div style={{ background: stats.pendingOrders > 0 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', borderRadius: 12, padding: 20, color: 'white' }}>
          <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Órdenes Pendientes</div>
          <div style={{ fontSize: 28, fontWeight: 'bold' }}>{stats.pendingOrders}</div>
          <div style={{ fontSize: 13, marginTop: 8, opacity: 0.9 }}>
            {stats.pendingOrders > 0 ? '⚠️ Requieren atención' : '✅ Todo al día'}
          </div>
        </div>
      </div>

      {/* Gráficas y listas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
        {/* Ventas de la semana */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#374151' }}>📈 Ventas de la Semana</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 150 }}>
            {stats.salesByDay.map((day, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{formatMoney(day.sales)}</div>
                <div 
                  style={{ 
                    width: '100%', 
                    background: 'linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%)',
                    borderRadius: '4px 4px 0 0',
                    height: `${(day.sales / maxSalesByDay) * 100}px`,
                    minHeight: day.sales > 0 ? 4 : 0,
                  }} 
                />
                <div style={{ fontSize: 11, color: '#374151', marginTop: 4 }}>{day.date}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ventas por hora */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#374151' }}>⏰ Ventas por Hora (24h)</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, overflowX: 'auto' }}>
            {stats.salesByHour.map((hour, i) => (
              <div 
                key={i} 
                style={{ 
                  flex: '0 0 auto',
                  width: 18,
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center' 
                }}
                title={`${hour.hour}: ${formatMoney(hour.sales)} (${hour.orders} órdenes)`}
              >
                <div 
                  style={{ 
                    width: '100%', 
                    background: hour.sales > 0 ? '#10b981' : '#e5e7eb',
                    borderRadius: '2px 2px 0 0',
                    height: `${(hour.sales / maxSalesByHour) * 80}px`,
                    minHeight: 2,
                  }} 
                />
                {i % 4 === 0 && (
                  <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>{hour.hour.split(':')[0]}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Top productos */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#374151' }}>🏆 Top Productos del Día</h3>
          {stats.topProducts.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center' }}>Sin ventas hoy</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.topProducts.map((product, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ 
                    width: 28, 
                    height: 28, 
                    borderRadius: '50%', 
                    background: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : i === 2 ? '#d97706' : '#e5e7eb',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: i < 3 ? 'white' : '#374151',
                  }}>
                    {i + 1}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, color: '#374151' }}>{product.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{product.quantity} vendidos</div>
                  </div>
                  <div style={{ fontWeight: 600, color: '#10b981' }}>{formatMoney(product.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Métodos de pago */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#374151' }}>💳 Métodos de Pago</h3>
          {stats.paymentMethods.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center' }}>Sin pagos hoy</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {stats.paymentMethods.map((pm, i) => {
                const totalPayments = stats.paymentMethods.reduce((sum, p) => sum + p.count, 0);
                const percentage = totalPayments > 0 ? (pm.count / totalPayments) * 100 : 0;
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: '#374151' }}>{getPaymentMethodLabel(pm.method)}</span>
                      <span style={{ color: '#6b7280', fontSize: 13 }}>{pm.count} ({percentage.toFixed(0)}%)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 8 }}>
                        <div style={{ 
                          width: `${percentage}%`, 
                          background: pm.method === 'CASH' ? '#10b981' : pm.method === 'MERCADO_PAGO' ? '#3b82f6' : '#8b5cf6',
                          borderRadius: 4,
                          height: '100%',
                        }} />
                      </div>
                      <span style={{ fontWeight: 600, color: '#374151', minWidth: 80, textAlign: 'right' }}>
                        {formatMoney(pm.total)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Órdenes por estado */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: '#374151' }}>📋 Órdenes por Estado (Hoy)</h3>
          {stats.ordersByStatus.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center' }}>Sin órdenes hoy</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {stats.ordersByStatus.map((item, i) => (
                <div 
                  key={i} 
                  style={{ 
                    background: getStatusColor(item.status) + '15',
                    border: `1px solid ${getStatusColor(item.status)}40`,
                    borderRadius: 8,
                    padding: '12px 16px',
                    minWidth: 100,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: getStatusColor(item.status) }}>
                    {item.count}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {getStatusLabel(item.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer con última actualización */}
      <div style={{ marginTop: 24, textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
        Última actualización: {new Date().toLocaleTimeString('es-MX')} • Actualización automática cada 30s
      </div>
    </div>
  );
}
