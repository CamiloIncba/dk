import { useState } from 'react';
import { MANUAL_PAYMENT_REASONS, type ManualPaymentReason } from '../api/client';

interface ManualPaymentModalProps {
  isOpen: boolean;
  orderId: number;
  total: number;
  onConfirm: (data: { reason: ManualPaymentReason; notes: string }) => void;
  onCancel: () => void;
}

export function ManualPaymentModal({
  isOpen,
  orderId,
  total,
  onConfirm,
  onCancel,
}: ManualPaymentModalProps) {
  const [selectedReason, setSelectedReason] = useState<ManualPaymentReason | null>(null);
  const [notes, setNotes] = useState('');
  const [step, setStep] = useState<'warning' | 'select'>('warning');

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);

  const handleConfirm = () => {
    if (!selectedReason) return;
    onConfirm({ reason: selectedReason, notes });
  };

  const resetAndClose = () => {
    setStep('warning');
    setSelectedReason(null);
    setNotes('');
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        {/* PASO 1: Advertencia */}
        {step === 'warning' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  margin: '0 auto 16px',
                }}
              >
                ⚠️
              </div>
              <h2 style={{ margin: '0 0 8px 0', fontSize: '22px', color: '#b45309' }}>
                Aprobación Manual de Pago
              </h2>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#16a34a' }}>
                Pedido #{orderId} — {formatPrice(total)}
              </p>
            </div>

            <div
              style={{
                background: '#fffbeb',
                border: '2px solid #fbbf24',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <p style={{ margin: '0 0 12px 0', fontWeight: 'bold', color: '#92400e' }}>
                📋 IMPORTANTE — LEA ANTES DE CONTINUAR:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#78350f', lineHeight: 1.6 }}>
                <li>Esta opción marca el pedido como <strong>PAGADO</strong> sin verificación automática.</li>
                <li>Deberá <strong>verificar manualmente</strong> que el dinero ingresó a su cuenta.</li>
                <li>Esta acción <strong>queda registrada para auditoría</strong> con fecha, hora y motivo.</li>
                <li>Use esta opción SOLO si está seguro de que el pago se realizó correctamente.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={resetAndClose}
                style={{
                  flex: 1,
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
              <button
                onClick={() => setStep('select')}
                style={{
                  flex: 1,
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                }}
              >
                Entiendo, Continuar →
              </button>
            </div>
          </>
        )}

        {/* PASO 2: Seleccionar razón */}
        {step === 'select' && (
          <>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
              Seleccione el Motivo del Pago Manual
            </h2>
            <p style={{ margin: '0 0 20px 0', color: '#6b7280', fontSize: '14px' }}>
              Esta información queda registrada para auditoría interna.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {(Object.entries(MANUAL_PAYMENT_REASONS) as [ManualPaymentReason, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedReason(key)}
                    style={{
                      padding: '14px 16px',
                      fontSize: '14px',
                      textAlign: 'left',
                      background: selectedReason === key ? '#dbeafe' : '#f9fafb',
                      border: selectedReason === key ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <span
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: selectedReason === key ? 'none' : '2px solid #d1d5db',
                        background: selectedReason === key ? '#3b82f6' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '12px',
                      }}
                    >
                      {selectedReason === key && '✓'}
                    </span>
                    <span style={{ flex: 1 }}>
                      {key === 'MP_VERIFIED' && '✅ '}
                      {key === 'TRANSFER' && '🏦 '}
                      {key === 'CASH' && '💵 '}
                      {key === 'OTHER_POS' && '💳 '}
                      {key === 'OTHER' && '📝 '}
                      {label}
                    </span>
                  </button>
                )
              )}
            </div>

            {selectedReason === 'OTHER' && (
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: '500',
                    fontSize: '14px',
                  }}
                >
                  Especifique el motivo: *
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describa el motivo del pago manual..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    minHeight: '80px',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep('warning')}
                style={{
                  flex: 1,
                  padding: '16px',
                  fontSize: '16px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                }}
              >
                ← Atrás
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedReason || (selectedReason === 'OTHER' && !notes.trim())}
                style={{
                  flex: 1,
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  background:
                    !selectedReason || (selectedReason === 'OTHER' && !notes.trim())
                      ? '#d1d5db'
                      : '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor:
                    !selectedReason || (selectedReason === 'OTHER' && !notes.trim())
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                ✓ Confirmar Pago Manual
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
