import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Order } from '../types';

interface AuditViewProps {
  onBack: () => void;
}

interface StatusLog {
  id: number;
  fieldChanged: string;
  previousValue: string;
  newValue: string;
  changedBy?: string;
  source: string;
  notes?: string;
  createdAt: string;
}

interface AuditOrder extends Order {
  items: Array<{
    id: number;
    quantity: number;
    unitPrice: number;
    product: { name: string };
    extras: Array<{
      unitPrice: number;
      quantity: number;
      extraOption: { name: string };
    }>;
  }>;
  payments: Array<{
    id: number;
    mpPaymentId: string;
    status: string;
    paymentType?: string;
    paymentMethod?: string;
    transactionAmount?: number;
    isManual: boolean;
    manualReason?: string;
    manualApprovedBy?: string;
    createdAt: string;
  }>;
  statusLogs: StatusLog[];
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  status: string;
  paymentMethod: string;
  search: string;
}

export function AuditView({ onBack }: AuditViewProps) {
  const [orders, setOrders] = useState<AuditOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const limit = 15;

  // Filtros
  const [filters, setFilters] = useState<Filters>({
    dateFrom: '',
    dateTo: '',
    status: '',
    paymentMethod: '',
    search: '',
  });

  const fetchOrders = async (newOffset = 0, currentFilters = filters) => {
    setLoading(true);
    setError(null);
    try {
      const apiFilters = {
        dateFrom: currentFilters.dateFrom || undefined,
        dateTo: currentFilters.dateTo || undefined,
        status: currentFilters.status || undefined,
        paymentMethod: currentFilters.paymentMethod || undefined,
        search: currentFilters.search || undefined,
      };
      const result = await api.getOrdersForAudit(limit, newOffset, apiFilters);
      setOrders(result.orders as AuditOrder[]);
      setTotal(result.total);
      setOffset(newOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleSearch = () => {
    setOffset(0);
    fetchOrders(0, filters);
  };

  const clearFilters = () => {
    const emptyFilters = { dateFrom: '', dateTo: '', status: '', paymentMethod: '', search: '' };
    setFilters(emptyFilters);
    setOffset(0);
    fetchOrders(0, emptyFilters);
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.status || filters.paymentMethod || filters.search;

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    if (status === 'PAID') return '#22c55e';
    if (status === 'PENDING') return '#f59e0b';
    if (status === 'CANCELLED' || status === 'PAYMENT_FAILED') return '#ef4444';
    return '#6b7280';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PAID: 'Pagado',
      PENDING: 'Pendiente',
      CANCELLED: 'Cancelado',
      PAYMENT_FAILED: 'Fallo pago',
    };
    return labels[status] || status;
  };

  const getKitchenLabel = (status: string) => {
    const labels: Record<string, string> = {
      PENDING: '⏳ Espera',
      IN_PREPARATION: '🔥 Preparando',
      READY: '✅ Listo',
      DELIVERED: '📦 Entregado',
      CANCELLED: '❌ Cancelado',
    };
    return labels[status] || status;
  };

  // Traduce cualquier estado (status o kitchenStatus) a español
  const translateStatus = (value: string) => {
    const translations: Record<string, string> = {
      // OrderStatus
      PENDING: 'Pendiente',
      PAID: 'Pagado',
      PAYMENT_FAILED: 'Fallo Pago',
      CANCELLED: 'Cancelado',
      // KitchenStatus
      IN_PREPARATION: 'En Preparación',
      READY: 'Listo',
      DELIVERED: 'Entregado',
    };
    return translations[value] || value;
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'kitchen-app': '👨‍🍳 App Cocina',
      'cashier-pwa': '🧾 Caja PWA',
      'android-kiosk': '📱 Kiosko Android',
      'mp-point-terminal': '💳 Terminal Point',
      'mp-qr-webhook': '📲 QR MP (Webhook)',
      'mp-qr-poll': '📲 QR MP (Polling)',
      'backend-auto': '🖥️ Backend Auto',
    };
    return labels[source] || source;
  };

  const getSourceColor = (source: string) => {
    if (source.includes('kitchen')) return '#f97316';
    if (source.includes('cashier')) return '#8b5cf6';
    if (source.includes('android')) return '#10b981';
    if (source.includes('mp-')) return '#3b82f6';
    return '#6b7280';
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{
            padding: '8px 16px',
            border: '1px solid #ddd',
            borderRadius: 8,
            background: 'white',
            cursor: 'pointer',
          }}
        >
          ← Volver
        </button>
        <h2 style={{ margin: 0, fontSize: 18 }}>📋 Auditoría de Pedidos</h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            border: '1px solid #3b82f6',
            borderRadius: 8,
            background: showFilters ? '#3b82f6' : 'white',
            color: showFilters ? 'white' : '#3b82f6',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          🔍 Filtros {hasActiveFilters && '●'}
        </button>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div style={{
          padding: 16,
          background: '#f3f4f6',
          borderRadius: 12,
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Buscar (ID/Ticket)</label>
              <input
                type="text"
                placeholder="ID o código..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
              />
            </div>
            <div style={{ flex: '1 1 130px' }}>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Desde</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
              />
            </div>
            <div style={{ flex: '1 1 130px' }}>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Hasta</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
              />
            </div>
            <div style={{ flex: '1 1 130px' }}>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Estado</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
              >
                <option value="">Todos</option>
                <option value="PAID">Pagado</option>
                <option value="PENDING">Pendiente</option>
                <option value="CANCELLED">Cancelado</option>
                <option value="PAYMENT_FAILED">Fallo Pago</option>
              </select>
            </div>
            <div style={{ flex: '1 1 130px' }}>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Método Pago</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6 }}
              >
                <option value="">Todos</option>
                <option value="cash">Efectivo</option>
                <option value="mercadopago">Mercado Pago</option>
                <option value="manual">Manual (Otros)</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleSearch}
              style={{
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Buscar
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{
                  padding: '10px 20px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      )}

      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
        {total} pedidos encontrados{hasActiveFilters && ' (con filtros)'}
      </p>

      {loading && <p style={{ textAlign: 'center', padding: 20 }}>Cargando...</p>}
      {error && (
        <div style={{ padding: 12, background: '#fee2e2', color: '#dc2626', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {!loading && orders.length === 0 && (
        <p style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          No hay pedidos que coincidan con los filtros.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {orders.map((order) => {
          const isExpanded = expandedOrder === order.id;
          const hasManualPayment = order.payments.some((p) => p.isManual);

          return (
            <div
              key={order.id}
              style={{
                background: 'white',
                border: hasManualPayment ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              {/* Cabecera del pedido */}
              <div
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                style={{
                  padding: 16,
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: isExpanded ? '#f9fafb' : 'white',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, fontWeight: 'bold' }}>#{order.id}</span>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: getStatusColor(order.status),
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 'bold',
                    }}
                  >
                    {getStatusLabel(order.status)}
                  </span>
                  {hasManualPayment && (
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: '#fbbf24',
                        color: '#78350f',
                        fontSize: 11,
                        fontWeight: 'bold',
                      }}
                    >
                      ⚠️ MANUAL
                    </span>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', color: '#16a34a' }}>
                    {formatPrice(order.totalAmount)}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>
                    {formatDate(order.createdAt)}
                  </div>
                </div>
              </div>

              {/* Detalle expandido */}
              {isExpanded && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid #e5e7eb' }}>
                  {/* Estado cocina */}
                  <div style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ color: '#6b7280', fontSize: 13 }}>Estado cocina: </span>
                    <strong>{getKitchenLabel(order.kitchenStatus)}</strong>
                  </div>

                  {/* Items */}
                  <div style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>📦 Items:</div>
                    {order.items.map((item) => (
                      <div key={item.id} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span>
                            <strong>{item.quantity}x</strong> {item.product.name}
                          </span>
                          <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                        </div>
                        {item.extras.map((e, idx) => (
                          <div
                            key={idx}
                            style={{
                              marginLeft: 16,
                              fontSize: 12,
                              color: '#6b7280',
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            <span>+ {e.extraOption.name}</span>
                            <span>{formatPrice(e.unitPrice * e.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Pagos */}
                  {order.payments.length > 0 && (
                    <div style={{ padding: '12px 0' }}>
                      <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>💳 Pagos:</div>
                      {order.payments.map((payment) => (
                        <div
                          key={payment.id}
                          style={{
                            padding: 10,
                            background: payment.isManual ? '#fffbeb' : '#f9fafb',
                            borderRadius: 8,
                            marginBottom: 8,
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span>
                              <strong>{payment.status === 'manual_approved' ? 'PAGO MANUAL' : payment.status.toUpperCase()}</strong>
                            </span>
                            <span style={{ fontWeight: 'bold' }}>
                              {payment.transactionAmount ? formatPrice(payment.transactionAmount) : '-'}
                            </span>
                          </div>
                          <div style={{ color: '#6b7280' }}>
                            {payment.paymentType && <span>Tipo: {payment.paymentType} • </span>}
                            {payment.paymentMethod && <span>Método: {payment.paymentMethod} • </span>}
                            <span>{formatDate(payment.createdAt)}</span>
                          </div>
                          {payment.isManual && (
                            <div style={{ marginTop: 6, color: '#92400e' }}>
                              <strong>Motivo:</strong> {payment.manualReason}
                              {payment.manualApprovedBy && <> • Por: {payment.manualApprovedBy}</>}
                            </div>
                          )}
                          <div style={{ marginTop: 4, color: '#9ca3af', fontSize: 10 }}>
                            ID: {payment.mpPaymentId}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Historial de cambios de estado */}
                  {order.statusLogs && order.statusLogs.length > 0 && (
                    <div style={{ padding: '12px 0', borderTop: '1px solid #f3f4f6' }}>
                      <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 8 }}>📜 Historial de cambios:</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {order.statusLogs.map((log) => (
                          <div
                            key={log.id}
                            style={{
                              padding: 8,
                              background: '#f8fafc',
                              borderRadius: 6,
                              borderLeft: `3px solid ${getSourceColor(log.source)}`,
                              fontSize: 12,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>
                                <strong>{log.fieldChanged === 'status' ? '📋' : '🍳'}</strong>{' '}
                                {translateStatus(log.previousValue)} → <strong>{translateStatus(log.newValue)}</strong>
                              </span>
                              <span
                                style={{
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: getSourceColor(log.source),
                                  color: 'white',
                                  fontSize: 10,
                                  fontWeight: 'bold',
                                }}
                              >
                                {getSourceLabel(log.source)}
                              </span>
                            </div>
                            <div style={{ color: '#6b7280', marginTop: 4, fontSize: 11 }}>
                              {formatDate(log.createdAt)}
                              {log.changedBy && <> • Por: {log.changedBy}</>}
                              {log.notes && <> • {log.notes}</>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Paginación */}
      {total > limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
          <button
            onClick={() => fetchOrders(offset - limit, filters)}
            disabled={offset === 0}
            style={{
              padding: '10px 20px',
              border: '1px solid #ddd',
              borderRadius: 8,
              background: offset === 0 ? '#f3f4f6' : 'white',
              cursor: offset === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            ← Anterior
          </button>
          <span style={{ padding: '10px', color: '#6b7280', fontSize: 13 }}>
            {offset + 1}-{Math.min(offset + limit, total)} de {total}
          </span>
          <button
            onClick={() => fetchOrders(offset + limit, filters)}
            disabled={offset + limit >= total}
            style={{
              padding: '10px 20px',
              border: '1px solid #ddd',
              borderRadius: 8,
              background: offset + limit >= total ? '#f3f4f6' : 'white',
              cursor: offset + limit >= total ? 'not-allowed' : 'pointer',
            }}
          >
            Siguiente →
          </button>
        </div>
      )}

      <button
        onClick={() => fetchOrders(0)}
        style={{
          width: '100%',
          padding: 12,
          marginTop: 16,
          border: '1px solid #ddd',
          borderRadius: 8,
          background: '#f9fafb',
          cursor: 'pointer',
        }}
      >
        🔄 Actualizar
      </button>
    </div>
  );
}
