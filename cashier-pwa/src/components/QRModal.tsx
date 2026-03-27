import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Order } from '../types';

interface QRModalProps {
  order: Order;
  onClose: () => void;
  onPaid: () => void;
}

export function QRModal({ order, onClose, onPaid }: QRModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(parseInt(price));
  };

  // Generar QR al abrir
  useEffect(() => {
    generateQR();
  }, []);

  // Polling para verificar si el pago fue completado
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(async () => {
      try {
        const orders = await api.getRecentOrders(10);
        const updatedOrder = orders.find((o: Order) => o.id === order.id);
        if (updatedOrder && updatedOrder.status === 'PAID') {
          setPolling(false);
          onPaid();
        }
      } catch (err) {
        // Ignorar errores de polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [polling, order.id, onPaid]);

  const generateQR = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.createQrStaticOrder(order.id);
      setQrData(result.qrData);
      setPolling(true); // Iniciar polling para detectar pago
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generando QR');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentManually = async () => {
    setCheckingPayment(true);
    try {
      const result = await api.checkMpPaymentStatus(order.id);
      if (result.paid) {
        onPaid();
      } else {
        setError('El pago aún no se ha recibido. Intente nuevamente.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error verificando pago');
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleCancel = async () => {
    try {
      await api.deleteQrStaticOrder();
    } catch (err) {
      // Ignorar error al limpiar
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h2 style={{ margin: '0 0 8px', fontSize: '24px' }}>
          📱 Pago con QR
        </h2>
        <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '14px' }}>
          Pedido #{order.id} • {formatPrice(order.totalAmount)}
        </p>

        {loading && (
          <div style={{ padding: '40px', color: '#6b7280' }}>
            Generando código QR...
          </div>
        )}

        {error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {qrData && !loading && (
          <>
            {/* QR Code como imagen usando Google Charts API */}
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f9fafb',
                borderRadius: '12px',
                marginBottom: '16px',
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`}
                alt="QR de pago"
                style={{ width: '250px', height: '250px' }}
              />
            </div>

            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>
              {polling ? '⏳ Esperando pago...' : 'Escanee el QR con Mercado Pago'}
            </p>

            {/* Botón para verificar manualmente */}
            <button
              onClick={checkPaymentManually}
              disabled={checkingPayment}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: checkingPayment ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                marginBottom: '8px',
                opacity: checkingPayment ? 0.7 : 1,
              }}
            >
              {checkingPayment ? 'Verificando...' : '🔍 Verificar Pago'}
            </button>
          </>
        )}

        {/* Botón para regenerar QR si hay error */}
        {error && (
          <button
            onClick={generateQR}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#22c55e',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginBottom: '8px',
            }}
          >
            🔄 Reintentar
          </button>
        )}

        {/* Botón cancelar */}
        <button
          onClick={handleCancel}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#6b7280',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          ❌ Cancelar
        </button>
      </div>
    </div>
  );
}
