import type { Order } from '../types';

interface OrderCardProps {
  order: Order;
  onPayCash?: () => void;
  onPayManual?: () => void;
  onRegenerateQR?: () => void;
  onStart?: () => void;
  onReady?: () => void;
  onDelivered?: () => void;
  tab: 'new' | 'pending' | 'active' | 'ready';
}

export function OrderCard({ order, onPayCash, onPayManual, onRegenerateQR, onStart: _onStart, onReady, onDelivered, tab }: OrderCardProps) {
  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(parseInt(price));
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#f59e0b'; // amber
      case 'IN_PREPARATION':
        return '#3b82f6'; // blue
      case 'READY':
        return '#22c55e'; // green
      default:
        return '#6b7280'; // gray
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'IN_PREPARATION':
        return 'En Preparación';
      case 'READY':
        return 'Listo';
      case 'DELIVERED':
        return 'Entregado';
      default:
        return status;
    }
  };

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
        backgroundColor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
          Pedido #{order.id}
        </h3>
        <span
          style={{
            backgroundColor: getStatusColor(order.kitchenStatus),
            color: '#fff',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          {getStatusLabel(order.kitchenStatus)}
        </span>
      </div>

      <p style={{ margin: '4px 0', color: '#6b7280', fontSize: '14px' }}>
        {formatTime(order.createdAt)} • {formatPrice(order.totalAmount)}
      </p>

      {/* Items - solo mostrar si tenemos items */}
      {order.items && order.items.length > 0 && (
        <div style={{ marginTop: '12px', borderTop: '1px solid #f3f4f6', paddingTop: '12px' }}>
          {order.items.map((item) => (
            <div key={item.id} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ fontWeight: '500' }}>{item.quantity}x {item.product.name}</span>
                <span style={{ color: '#6b7280' }}>{formatPrice(item.unitPrice)}</span>
              </div>
              {/* Extras del item */}
              {item.extras && item.extras.length > 0 && (
                <div style={{ 
                  marginTop: '4px', 
                  marginLeft: '16px',
                  fontSize: '12px',
                  color: '#6b7280',
                }}>
                  {item.extras.map((extra) => (
                    <div key={extra.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>+ {extra.extraOption.name}{extra.quantity > 1 ? ` x${extra.quantity}` : ''}</span>
                      {parseInt(extra.unitPrice) > 0 && (
                        <span>{formatPrice(extra.unitPrice)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Acciones según pestaña */}
      <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Pestaña Pendientes de Pago - Múltiples opciones */}
        {tab === 'pending' && (
          <>
            {/* Fila principal: Efectivo */}
            {onPayCash && (
              <button
                onClick={onPayCash}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#22c55e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
              >
                💵 Cobrar Efectivo
              </button>
            )}
            {/* Fila secundaria: QR y Validar Manual */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {onRegenerateQR && (
                <button
                  onClick={onRegenerateQR}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px',
                  }}
                >
                  📱 Generar QR
                </button>
              )}
              {onPayManual && (
                <button
                  onClick={onPayManual}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px',
                  }}
                >
                  ✅ Validar Manual
                </button>
              )}
            </div>
          </>
        )}

        {/* Pestaña Cocina */}
        {tab === 'active' && (
          <>
            {onReady && (
              <button
                onClick={onReady}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#22c55e',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                ✅ Listo
              </button>
            )}
          </>
        )}

        {/* Pestaña Listos */}
        {tab === 'ready' && onDelivered && (
          <button
            onClick={onDelivered}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#6b7280',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            📦 Entregado
          </button>
        )}
      </div>
    </div>
  );
}
