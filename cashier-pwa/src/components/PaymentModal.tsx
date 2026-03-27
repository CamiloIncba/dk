import { useState, useEffect, useRef } from 'react';
import { api, type ManualPaymentReason } from '../api/client';
import type { CartItem } from '../types';
import { printTicket, type PrintData } from '../utils/printTicket';
import { ManualPaymentModal } from './ManualPaymentModal';

type PaymentMethod = 'cash' | 'terminal' | 'qr';

interface PaymentModalProps {
  isOpen: boolean;
  orderId: number;
  total: number;
  cart: CartItem[];
  onClose: () => void;
  onSuccess: () => void;
}

interface PointDevice {
  id: string;
  operating_mode: string;
  pos_id: string;
}

export function PaymentModal({
  isOpen,
  orderId,
  total,
  cart,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Terminal Point
  const [devices, setDevices] = useState<PointDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [intentId, setIntentId] = useState<string | null>(null);
  const [intentState, setIntentState] = useState<string | null>(null);
  const pollingRef = useRef<number | null>(null);
  const pointTimeoutRef = useRef<number | null>(null);
  const [pointCountdown, setPointCountdown] = useState<number>(0);
  const countdownRef = useRef<number | null>(null);
  
  // Timeout para Point en segundos (reducido porque no podemos detectar cancelación automática)
  const POINT_TIMEOUT_SECONDS = 60;

  // QR Estático
  const [qrLoading, setQrLoading] = useState(false);
  const [qrSent, setQrSent] = useState(false);
  const qrPollingRef = useRef<number | null>(null);

  // Modal de pago manual
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualPaymentContext, setManualPaymentContext] = useState<'cash' | 'qr' | null>(null);

  // Reset completo de estados cuando se abre el modal o cambia la orden
  useEffect(() => {
    if (isOpen) {
      // Resetear todo para empezar limpio
      setMethod(null);
      setLoading(false);
      setError(null);
      setSelectedDevice(null);
      setIntentId(null);
      setIntentState(null);
      setQrLoading(false);
      setQrSent(false);
      setShowManualModal(false);
      setManualPaymentContext(null);
      setShowCashConfirm(false);
      setPointCountdown(0);
      stopPolling();
      stopQrPolling();
      stopCountdown();
      // Cargar dispositivos
      loadDevices();
    }
    return () => {
      stopPolling();
      stopQrPolling();
      stopCountdown();
      // Limpiar timeout del Point si existe
      if (pointTimeoutRef.current) {
        clearTimeout(pointTimeoutRef.current);
        pointTimeoutRef.current = null;
      }
    };
  }, [isOpen, orderId]);

  const loadDevices = async () => {
    try {
      const devs = await api.getPointDevices();
      setDevices(devs);
      if (devs.length === 1) {
        setSelectedDevice(devs[0].id);
      }
    } catch {
      // Si no hay dispositivos configurados, no es error
      setDevices([]);
    }
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };
  
  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const stopQrPolling = () => {
    if (qrPollingRef.current) {
      clearInterval(qrPollingRef.current);
      qrPollingRef.current = null;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  /**
   * Imprime el ticket. Primero intenta via backend (impresión directa a impresora térmica),
   * si falla usa el método del navegador (popup + window.print).
   */
  const printAndFinish = async () => {
    // Intentar impresión directa via backend (para impresoras térmicas en Windows)
    try {
      const result = await api.printTicketDirect(orderId);
      if (result.success) {
        console.log('Ticket impreso via backend:', result.message);
        onSuccess();
        return;
      }
      console.warn('Impresión backend falló, usando navegador:', result.message);
    } catch (err) {
      console.warn('Error en impresión backend, usando navegador:', err);
    }

    // Fallback: impresión via navegador
    const printData: PrintData = {
      orderId,
      total,
      paymentMethod: method === 'cash' ? 'Efectivo' : method === 'terminal' ? 'Terminal MP' : 'QR MP',
      items: cart.map(item => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.productPrice,
        extras: item.extras.map(e => ({
          name: e.name,
          quantity: e.quantity,
          unitPrice: e.price,
        })),
      })),
    };
    printTicket(printData);
    onSuccess();
  };

  // ============================================================
  // EFECTIVO - Confirmación simple sin modal de advertencias
  // ============================================================
  const [showCashConfirm, setShowCashConfirm] = useState(false);

  const handleCashPayment = () => {
    setShowCashConfirm(true);
  };

  const handleCashConfirm = async () => {
    setShowCashConfirm(false);
    setLoading(true);
    setError(null);
    
    try {
      await api.markPaidManual(orderId, {
        reason: 'CASH',
        notes: 'Pago en efectivo confirmado por cajero',
        approvedBy: 'cajero',
        source: 'cashier-pwa',
      });
      printAndFinish();
    } catch (err) {
      setError('Error al registrar pago en efectivo');
      setLoading(false);
    }
  };

  // Handler para cuando se confirma el pago manual
  const handleManualPaymentConfirm = async (data: { reason: ManualPaymentReason; notes: string }) => {
    setShowManualModal(false);
    setLoading(true);
    setError(null);
    
    try {
      await api.markPaidManual(orderId, {
        reason: data.reason,
        notes: data.notes || undefined,
        approvedBy: 'cajero', // TODO: obtener del usuario logueado
      });
      
      // Si era QR, limpiar el QR del POS
      if (manualPaymentContext === 'qr') {
        try { await api.deleteQrStaticOrder(); } catch {}
        stopQrPolling();
      }
      
      printAndFinish();
    } catch (err) {
      setError('Error al registrar pago manual');
      setLoading(false);
    }
  };

  // ============================================================
  // TERMINAL POINT
  // ============================================================
  
  const stopPointTimeout = () => {
    if (pointTimeoutRef.current) {
      clearTimeout(pointTimeoutRef.current);
      pointTimeoutRef.current = null;
    }
  };
  
  const handleTerminalPayment = async () => {
    if (!selectedDevice) {
      setError('Seleccioná un terminal');
      return;
    }

    setLoading(true);
    setError(null);
    setIntentState(null);

    try {
      const intent = await api.createPointIntent(orderId, selectedDevice);
      setIntentId(intent.id);
      setIntentState('on_terminal');
      
      // Iniciar contador visual
      setPointCountdown(POINT_TIMEOUT_SECONDS);
      countdownRef.current = window.setInterval(() => {
        setPointCountdown((prev) => {
          if (prev <= 1) {
            stopCountdown();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Timeout de seguridad: tiempo reducido porque no podemos detectar cancelación automática
      // La API de MP Point no soporta GET para consultar estado (devuelve 405)
      pointTimeoutRef.current = window.setTimeout(() => {
        console.warn('Timeout del polling Point - cancelando operación');
        stopPolling();
        stopCountdown();
        setError('Tiempo de espera agotado. Si el cliente canceló en el terminal, presioná "Cancelar".');
        setIntentId(null);
        setIntentState(null);
        setLoading(false);
      }, POINT_TIMEOUT_SECONDS * 1000);

      // Iniciar polling para verificar estado del intent
      // NOTA: La API de MP Point devuelve 405 para GET, pero seguimos intentando
      // por si cambia en el futuro. El timeout del cliente es el backup principal.
      pollingRef.current = window.setInterval(async () => {
        try {
          // Verificar estado del intent
          const status = await api.getPointIntentStatus(selectedDevice!, intent.id);
          setIntentState(status.state);

          if (status.state === 'finished') {
            stopPolling();
            stopPointTimeout();
            stopCountdown();
            // Procesar resultado
            const result = await api.processPointPayment(orderId, selectedDevice!, intent.id);
            
            if (result.status === 'approved') {
              printAndFinish();
            } else {
              setError(`Pago rechazado: ${result.status}`);
              setLoading(false);
            }
          } else if (
            status.state === 'canceled' || 
            status.state === 'abandoned' || 
            status.state === 'expired' ||
            status.state === 'error'
          ) {
            // El intent terminó sin completarse
            stopPolling();
            stopPointTimeout();
            stopCountdown();
            setError(
              status.state === 'abandoned' 
                ? 'Operación cancelada o timeout en el terminal' 
                : status.state === 'expired'
                  ? 'La operación expiró en el terminal'
                  : 'Pago cancelado o error en terminal'
            );
            setIntentId(null);
            setIntentState(null);
            setLoading(false);
          }
        } catch (err: any) {
          // La API devuelve 405 - esto es esperado
          // Seguimos esperando el timeout o que el usuario cancele manualmente
          console.debug('Polling Point: API no soporta consulta de estado (esperado)');
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al enviar pago al terminal');
      setLoading(false);
    }
  };

  const handleCancelTerminal = async () => {
    if (selectedDevice && intentId) {
      try {
        await api.cancelPointIntent(selectedDevice, intentId);
      } catch {
        // Ignorar errores de cancelación
      }
    }
    stopPolling();
    stopPointTimeout();
    stopCountdown();
    setIntentId(null);
    setIntentState(null);
    setLoading(false);
  };

  // ============================================================
  // QR ESTÁTICO
  // ============================================================
  
  // Selecciona QR y activa automáticamente
  const selectQrAndActivate = async () => {
    setMethod('qr');
    // Activar QR inmediatamente
    setQrLoading(true);
    setError(null);

    try {
      await api.createQrStaticOrder(orderId);
      setQrSent(true);
      
      // Iniciar polling para verificar cuando el pago se confirme en MP
      qrPollingRef.current = window.setInterval(async () => {
        try {
          const result = await api.checkMpPaymentStatus(orderId);
          if (result.paid) {
            console.log('✅ Pago confirmado en MP:', result);
            stopQrPolling();
            try { await api.deleteQrStaticOrder(); } catch {}
            printAndFinish();
          }
        } catch {
          // Error de conexión, seguir intentando
        }
      }, 3000);
      
    } catch (err: any) {
      setError('Error al enviar orden al QR. Verificá la configuración.');
    } finally {
      setQrLoading(false);
    }
  };
  
  const handleQrPayment = async () => {
    setQrLoading(true);
    setError(null);

    try {
      await api.createQrStaticOrder(orderId);
      setQrSent(true);
      
      // Iniciar polling para verificar cuando el pago se confirme en MP
      // Esto consulta directamente a la API de MP, no solo la DB local
      qrPollingRef.current = window.setInterval(async () => {
        try {
          const result = await api.checkMpPaymentStatus(orderId);
          if (result.paid) {
            console.log('✅ Pago confirmado en MP:', result);
            stopQrPolling();
            // Limpiar el QR del POS
            try { await api.deleteQrStaticOrder(); } catch {}
            printAndFinish();
          }
        } catch {
          // Error de conexión, seguir intentando
        }
      }, 3000); // Verificar cada 3 segundos
      
    } catch (err: any) {
      setError('Error al enviar orden al QR. Verificá la configuración.');
    } finally {
      setQrLoading(false);
    }
  };

  const handleCancelQr = async () => {
    stopQrPolling();
    try {
      await api.deleteQrStaticOrder();
    } catch {
      // Ignorar
    }
    setQrSent(false);
  };

  // Confirmación manual cuando el cliente pagó pero el webhook no llegó
  const handleManualQrConfirm = () => {
    stopQrPolling();
    setManualPaymentContext('qr');
    setShowManualModal(true);
  };

  // ============================================================
  // RENDER
  // ============================================================
  if (!isOpen) return null;

  const getTerminalStateMessage = () => {
    switch (intentState) {
      case 'on_terminal':
        return '📱 Esperando que el cliente pase la tarjeta...';
      case 'processing':
        return '⏳ Procesando pago...';
      case 'finished':
        return '✅ Pago completado';
      case 'canceled':
        return '❌ Pago cancelado';
      case 'error':
        return '⚠️ Error en terminal';
      default:
        return 'Enviando al terminal...';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          width: '90%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px' }}>Cobrar Pedido #{orderId}</h2>
        <p style={{ margin: '0 0 16px 0', fontSize: '28px', fontWeight: 'bold', color: '#16a34a' }}>
          {formatPrice(total)}
        </p>

        {/* Detalle del pedido */}
        <div
          style={{
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            maxHeight: '180px',
            overflowY: 'auto',
          }}
        >
          <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase' }}>
            Detalle del pedido
          </p>
          {cart.map((item, idx) => {
            const itemSubtotal = item.productPrice * item.quantity;
            return (
              <div key={idx} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: idx < cart.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span>
                    <strong>{item.quantity}x</strong> {item.productName}
                  </span>
                  <span style={{ fontWeight: '500' }}>{formatPrice(itemSubtotal)}</span>
                </div>
                {item.extras.length > 0 && (
                  <div style={{ marginLeft: '16px', marginTop: '4px' }}>
                    {item.extras.map((extra, eIdx) => (
                      <div key={eIdx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6b7280' }}>
                        <span>+ {extra.quantity > 1 ? `${extra.quantity}x ` : ''}{extra.name}</span>
                        <span>{formatPrice(extra.price * extra.quantity * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        {/* Selector de método de pago */}
        {!method && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => setMethod('cash')}
              style={{
                padding: '20px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              💵 EFECTIVO
            </button>

            <button
              onClick={() => setMethod('terminal')}
              disabled={devices.length === 0}
              style={{
                padding: '20px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: devices.length > 0 ? '#3b82f6' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: devices.length > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              💳 TERMINAL
              {devices.length === 0 && <span style={{ fontSize: '12px' }}>(no configurado)</span>}
            </button>

            <button
              onClick={selectQrAndActivate}
              style={{
                padding: '20px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
              }}
            >
              📱 QR ESTÁTICO
            </button>

            <button
              onClick={onClose}
              style={{
                padding: '16px',
                fontSize: '16px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Confirmación Efectivo */}
        {method === 'cash' && !loading && !showCashConfirm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: '16px', margin: '0 0 8px 0', color: '#6b7280' }}>
                Total a cobrar:
              </p>
              <p style={{ fontSize: '32px', fontWeight: 'bold', margin: 0, color: '#16a34a' }}>
                {formatPrice(total)}
              </p>
            </div>
            <button
              onClick={handleCashPayment}
              style={{
                padding: '20px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              💵 Cobrar Efectivo
            </button>
            <button
              onClick={() => setMethod(null)}
              style={{
                padding: '16px',
                fontSize: '16px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              ← Volver
            </button>
          </div>
        )}

        {/* Confirmación final Efectivo */}
        {method === 'cash' && !loading && showCashConfirm && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ 
              textAlign: 'center', 
              padding: 20, 
              background: '#f0fdf4', 
              borderRadius: 12,
              border: '2px solid #22c55e',
              marginBottom: 8 
            }}>
              <p style={{ fontSize: '14px', margin: '0 0 8px 0', color: '#166534' }}>
                ¿Recibiste el pago en efectivo?
              </p>
              <p style={{ fontSize: '36px', fontWeight: 'bold', margin: 0, color: '#16a34a' }}>
                {formatPrice(total)}
              </p>
            </div>
            <button
              onClick={handleCashConfirm}
              style={{
                padding: '20px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              ✅ Confirmar Cobro
            </button>
            <button
              onClick={() => setShowCashConfirm(false)}
              style={{
                padding: '16px',
                fontSize: '16px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              ← Cancelar
            </button>
          </div>
        )}

        {/* Terminal Point */}
        {method === 'terminal' && !loading && !intentId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {devices.length > 1 && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Seleccionar Terminal:
                </label>
                <select
                  value={selectedDevice || ''}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '16px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                  }}
                >
                  <option value="">-- Elegir --</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      Terminal {d.id.slice(-6)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={handleTerminalPayment}
              disabled={!selectedDevice}
              style={{
                padding: '20px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: selectedDevice ? '#3b82f6' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: selectedDevice ? 'pointer' : 'not-allowed',
              }}
            >
              💳 Enviar al Terminal
            </button>
            <button
              onClick={() => setMethod(null)}
              style={{
                padding: '16px',
                fontSize: '16px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              ← Volver
            </button>
          </div>
        )}

        {/* Terminal en proceso */}
        {method === 'terminal' && intentId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
              }}
            >
              💳
            </div>
            <p style={{ fontSize: '18px', fontWeight: '500', textAlign: 'center', margin: 0 }}>
              {getTerminalStateMessage()}
            </p>
            
            {/* Contador visual */}
            {(intentState === 'on_terminal' || intentState === 'processing') && pointCountdown > 0 && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0' }}>
                  Tiempo restante:
                </p>
                <p style={{ 
                  fontSize: '32px', 
                  fontWeight: 'bold', 
                  color: pointCountdown <= 15 ? '#dc2626' : '#3b82f6', 
                  margin: 0 
                }}>
                  {Math.floor(pointCountdown / 60)}:{(pointCountdown % 60).toString().padStart(2, '0')}
                </p>
              </div>
            )}
            
            {(intentState === 'on_terminal' || intentState === 'processing') && (
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  background: '#e5e7eb',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(pointCountdown / POINT_TIMEOUT_SECONDS) * 100}%`,
                    height: '100%',
                    background: pointCountdown <= 15 ? '#dc2626' : '#3b82f6',
                    transition: 'width 1s linear',
                  }}
                />
              </div>
            )}
            
            {/* Mensaje importante */}
            <div
              style={{
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                marginTop: '8px',
              }}
            >
              <p style={{ margin: 0, fontSize: '13px', color: '#92400e' }}>
                ⚠️ Si el cliente <strong>canceló en el Point</strong> o la operación falló,<br />
                presioná <strong>"Cancelar"</strong> para liberar este pedido.
              </p>
            </div>
            
            <button
              onClick={handleCancelTerminal}
              style={{
                padding: '20px 40px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              ❌ Cancelar / El cliente canceló
            </button>
          </div>
        )}

        {/* QR Estático */}
        {method === 'qr' && !qrSent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                background: '#f3e8ff',
                padding: '16px',
                borderRadius: '12px',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>
                📱 Método QR Estático
              </p>
              <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                El cliente escanea el QR de la caja y ve el monto a pagar.
                <br />
                Cuando pague, el sistema lo detectará automáticamente.
              </p>
            </div>
            <button
              onClick={handleQrPayment}
              disabled={qrLoading}
              style={{
                padding: '20px',
                fontSize: '18px',
                fontWeight: 'bold',
                background: qrLoading ? '#d1d5db' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: qrLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {qrLoading ? 'Enviando...' : '📱 Activar QR'}
            </button>
            <button
              onClick={() => setMethod(null)}
              style={{
                padding: '16px',
                fontSize: '16px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
              }}
            >
              ← Volver
            </button>
          </div>
        )}

        {/* QR Esperando pago */}
        {method === 'qr' && qrSent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#f3e8ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
              }}
            >
              📱
            </div>
            <p style={{ fontSize: '18px', fontWeight: '500', textAlign: 'center', margin: 0 }}>
              QR listo. Esperando que el cliente pague...
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', margin: 0 }}>
              El monto de <strong>{formatPrice(total)}</strong> ya está en el QR de la caja.
              <br />
              Cuando el cliente lo escanee y pague, se confirmará automáticamente.
            </p>
            <div
              style={{
                width: '100%',
                height: '4px',
                background: '#e5e7eb',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '30%',
                  height: '100%',
                  background: '#8b5cf6',
                  animation: 'pulse 1.5s infinite',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              <button
                onClick={handleCancelQr}
                style={{
                  padding: '16px 24px',
                  fontSize: '16px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleManualQrConfirm}
                disabled={loading}
                style={{
                  padding: '16px 24px',
                  fontSize: '16px',
                  background: loading ? '#86efac' : '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: loading ? 'wait' : 'pointer',
                }}
              >
                {loading ? '⏳ Confirmando...' : '✓ Cliente Pagó'}
              </button>
            </div>
          </div>
        )}

        {/* Loading general */}
        {loading && method !== 'terminal' && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p>Procesando pago...</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: translateX(0); }
          50% { opacity: 0.5; transform: translateX(100%); }
        }
      `}</style>

      {/* Modal de Pago Manual */}
      <ManualPaymentModal
        isOpen={showManualModal}
        orderId={orderId}
        total={total}
        onConfirm={handleManualPaymentConfirm}
        onCancel={() => setShowManualModal(false)}
      />
    </div>
  );
}
