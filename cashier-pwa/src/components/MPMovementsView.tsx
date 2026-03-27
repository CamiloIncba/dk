import { useState, useEffect } from 'react';
import { api, type MPMovement, type MpPaymentGeneral } from '../api/client';

interface MPMovementsViewProps {
  onBack: () => void;
}

type TabType = 'linked' | 'all';

export function MPMovementsView({ onBack }: MPMovementsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('linked');
  
  // Movimientos vinculados
  const [movements, setMovements] = useState<MPMovement[]>([]);
  const [loadingLinked, setLoadingLinked] = useState(true);
  const [totalLinked, setTotalLinked] = useState(0);
  const [offsetLinked, setOffsetLinked] = useState(0);
  
  // Todos los pagos MP
  const [allPayments, setAllPayments] = useState<MpPaymentGeneral[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [totalAll, setTotalAll] = useState(0);
  const [offsetAll, setOffsetAll] = useState(0);
  
  const [error, setError] = useState<string | null>(null);
  const limit = 20;

  const fetchLinkedMovements = async (newOffset = 0) => {
    setLoadingLinked(true);
    setError(null);
    try {
      const result = await api.getMPMovements(limit, newOffset);
      setMovements(result.payments);
      setTotalLinked(result.total);
      setOffsetLinked(newOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando movimientos');
    } finally {
      setLoadingLinked(false);
    }
  };

  const fetchAllPayments = async (newOffset = 0) => {
    setLoadingAll(true);
    setError(null);
    try {
      const result = await api.searchAllMpPayments(limit, newOffset);
      setAllPayments(result.payments);
      setTotalAll(result.total);
      setOffsetAll(newOffset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando pagos de MP');
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    fetchLinkedMovements();
  }, []);

  useEffect(() => {
    if (activeTab === 'all' && allPayments.length === 0) {
      fetchAllPayments();
    }
  }, [activeTab]);

  const formatPrice = (price: number | null | undefined) => {
    if (price == null) return '-';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    if (status === 'approved' || status === 'manual_approved') return '#22c55e';
    if (status === 'rejected' || status === 'cancelled') return '#ef4444';
    if (status === 'pending' || status === 'in_process') return '#f59e0b';
    return '#6b7280';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      approved: 'Aprobado',
      manual_approved: 'Manual',
      rejected: 'Rechazado',
      cancelled: 'Cancelado',
      pending: 'Pendiente',
      in_process: 'Procesando',
    };
    return labels[status] || status;
  };

  const loading = activeTab === 'linked' ? loadingLinked : loadingAll;
  const total = activeTab === 'linked' ? totalLinked : totalAll;
  const offset = activeTab === 'linked' ? offsetLinked : offsetAll;
  const fetchFn = activeTab === 'linked' ? fetchLinkedMovements : fetchAllPayments;

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
        <h2 style={{ margin: 0, fontSize: 18 }}>💳 Movimientos Mercado Pago</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setActiveTab('linked')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 'bold',
            backgroundColor: activeTab === 'linked' ? '#3b82f6' : '#e5e7eb',
            color: activeTab === 'linked' ? '#fff' : '#374151',
          }}
        >
          📋 Vinculados ({totalLinked})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 'bold',
            backgroundColor: activeTab === 'all' ? '#8b5cf6' : '#e5e7eb',
            color: activeTab === 'all' ? '#fff' : '#374151',
          }}
        >
          🌐 Todos MP
        </button>
      </div>

      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
        {activeTab === 'linked' 
          ? 'Pagos registrados y vinculados a pedidos del sistema.'
          : 'Todos los pagos recibidos en Mercado Pago (incluyendo sin orden).'
        }
      </p>

      {loading && <p style={{ textAlign: 'center', padding: 20 }}>Cargando...</p>}
      {error && (
        <div style={{ padding: 12, background: '#fee2e2', color: '#dc2626', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Lista de movimientos vinculados */}
      {activeTab === 'linked' && !loadingLinked && movements.length === 0 && (
        <p style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          No hay movimientos registrados.
        </p>
      )}

      {activeTab === 'linked' && !loadingLinked && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {movements.map((m) => (
            <div
              key={m.id}
              style={{
                padding: 16,
                background: 'white',
                border: m.isManual ? '2px solid #f59e0b' : '1px solid #e5e7eb',
                borderRadius: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: getStatusColor(m.status),
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 'bold',
                      marginRight: 8,
                    }}
                  >
                    {getStatusLabel(m.status)}
                  </span>
                  {m.isManual && (
                    <span
                      style={{
                        display: 'inline-block',
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
                <span style={{ fontSize: 18, fontWeight: 'bold', color: '#16a34a' }}>
                  {formatPrice(m.transactionAmount)}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                <div>
                  <span style={{ color: '#6b7280' }}>Origen:</span>{' '}
                  <strong>{m.origin}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>Fecha:</span>{' '}
                  <strong>{formatDate(m.createdAt)}</strong>
                </div>
                {m.paymentMethod && (
                  <div>
                    <span style={{ color: '#6b7280' }}>Método:</span>{' '}
                    <strong>{m.paymentMethod}</strong>
                  </div>
                )}
                {m.order && (
                  <div>
                    <span style={{ color: '#6b7280' }}>Pedido:</span>{' '}
                    <strong>#{m.order.id}</strong>
                  </div>
                )}
              </div>

              {m.isManual && m.manualReason && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 10,
                    background: '#fffbeb',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                >
                  <strong>Motivo manual:</strong> {m.manualReason}
                  {m.manualApprovedBy && <> • Aprobado por: {m.manualApprovedBy}</>}
                  {m.manualNotes && (
                    <div style={{ marginTop: 4, color: '#78350f' }}>
                      Notas: {m.manualNotes}
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
                ID: {m.mpPaymentId}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista de todos los pagos MP */}
      {activeTab === 'all' && !loadingAll && allPayments.length === 0 && (
        <p style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          No se encontraron pagos en Mercado Pago.
        </p>
      )}

      {activeTab === 'all' && !loadingAll && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {allPayments.map((p) => (
            <div
              key={p.id}
              style={{
                padding: 16,
                background: 'white',
                border: p.isLinked ? '1px solid #e5e7eb' : '2px dashed #f59e0b',
                borderRadius: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      background: getStatusColor(p.status),
                      color: 'white',
                      fontSize: 11,
                      fontWeight: 'bold',
                      marginRight: 8,
                    }}
                  >
                    {getStatusLabel(p.status)}
                  </span>
                  {!p.isLinked && (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: '#fbbf24',
                        color: '#78350f',
                        fontSize: 11,
                        fontWeight: 'bold',
                      }}
                    >
                      ⚠️ SIN ORDEN
                    </span>
                  )}
                  {p.isLinked && (
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: '#22c55e',
                        color: 'white',
                        fontSize: 11,
                        fontWeight: 'bold',
                      }}
                    >
                      ✓ VINCULADO
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 18, fontWeight: 'bold', color: '#16a34a' }}>
                  {formatPrice(p.amount)}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                <div>
                  <span style={{ color: '#6b7280' }}>Origen:</span>{' '}
                  <strong>{p.pointOfInteraction || 'Desconocido'}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280' }}>Fecha:</span>{' '}
                  <strong>{formatDate(p.dateCreated)}</strong>
                </div>
                {p.paymentMethod && (
                  <div>
                    <span style={{ color: '#6b7280' }}>Método:</span>{' '}
                    <strong>{p.paymentMethod}</strong>
                  </div>
                )}
                {p.linkedOrder && (
                  <div>
                    <span style={{ color: '#6b7280' }}>Pedido:</span>{' '}
                    <strong>#{p.linkedOrder.id}</strong>
                  </div>
                )}
                {p.payerEmail && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: '#6b7280' }}>Email:</span>{' '}
                    <strong>{p.payerEmail}</strong>
                  </div>
                )}
              </div>

              {p.description && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>
                  📝 {p.description}
                </div>
              )}

              <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>
                ID MP: {p.id} {p.externalReference && `• Ref: ${p.externalReference}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginación */}
      {total > limit && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
          <button
            onClick={() => fetchFn(offset - limit)}
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
            onClick={() => fetchFn(offset + limit)}
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
        onClick={() => fetchFn(0)}
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
