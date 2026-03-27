import { useState, useEffect } from 'react';
import { api, type CashClosingSummary } from '../api/client';

interface CashClosingViewProps {
  onBack: () => void;
}

export function CashClosingView({ onBack }: CashClosingViewProps) {
  const [summary, setSummary] = useState<CashClosingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [showDetails, setShowDetails] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getCashClosingSummary(dateFrom, dateTo);
      setSummary(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando resumen');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      PAID: 'Pagado',
      PENDING: 'Pendiente',
      CANCELLED: 'Cancelado',
      PAYMENT_FAILED: 'Pago Fallido',
    };
    return labels[status] || status;
  };

  // Generar PDF
  const generatePDF = () => {
    if (!summary) return;

    // Crear contenido HTML para el PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Cierre de Caja</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
          h1 { text-align: center; color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h2 { color: #555; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .header-info { text-align: center; margin-bottom: 20px; color: #666; }
          .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .summary-card { background: #f5f5f5; padding: 15px; border-radius: 8px; }
          .summary-card h3 { margin: 0 0 10px 0; color: #333; font-size: 14px; }
          .summary-card .value { font-size: 24px; font-weight: bold; color: #16a34a; }
          .summary-card .sub { color: #666; font-size: 12px; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f0f0f0; font-weight: bold; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background: #e8f5e9; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>🧾 Cierre de Caja</h1>
        <div class="header-info">
          <p><strong>Período:</strong> ${formatDate(summary.dateFrom)} - ${formatDate(summary.dateTo)}</p>
          <p><strong>Generado:</strong> ${new Date(summary.generatedAt).toLocaleString('es-AR')}</p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <h3>💰 TOTAL VENTAS</h3>
            <div class="value">${formatPrice(summary.totalSales)}</div>
            <div class="sub">${summary.totalOrders} pedidos</div>
          </div>
          <div class="summary-card">
            <h3>📊 TICKET PROMEDIO</h3>
            <div class="value">${formatPrice(summary.averageTicket)}</div>
          </div>
        </div>

        <h2>💳 Desglose por Método de Pago</h2>
        <table>
          <thead>
            <tr>
              <th>Método</th>
              <th class="text-right">Pedidos</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>💵 Efectivo</td>
              <td class="text-right">${summary.ordersByCash}</td>
              <td class="text-right">${formatPrice(summary.salesByCash)}</td>
            </tr>
            <tr>
              <td>💙 Mercado Pago</td>
              <td class="text-right">${summary.ordersByMercadoPago}</td>
              <td class="text-right">${formatPrice(summary.salesByMercadoPago)}</td>
            </tr>
            <tr>
              <td>🏦 Transferencia</td>
              <td class="text-right">${summary.ordersByTransfer || 0}</td>
              <td class="text-right">${formatPrice(summary.salesByTransfer || 0)}</td>
            </tr>
            <tr>
              <td>💳 Otro Posnet</td>
              <td class="text-right">${summary.ordersByOtherPos || 0}</td>
              <td class="text-right">${formatPrice(summary.salesByOtherPos || 0)}</td>
            </tr>
            <tr>
              <td>📝 Otros</td>
              <td class="text-right">${summary.ordersByManualOther || 0}</td>
              <td class="text-right">${formatPrice(summary.salesByManualOther || 0)}</td>
            </tr>
            <tr class="total-row">
              <td>TOTAL</td>
              <td class="text-right">${summary.totalOrders}</td>
              <td class="text-right">${formatPrice(summary.totalSales)}</td>
            </tr>
          </tbody>
        </table>

        <h2>📦 Pedidos por Estado</h2>
        <table>
          <thead>
            <tr>
              <th>Estado</th>
              <th class="text-right">Cantidad</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${summary.ordersByStatus.map(s => `
              <tr>
                <td>${getStatusLabel(s.status)}</td>
                <td class="text-right">${s.count}</td>
                <td class="text-right">${formatPrice(s.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>🏆 Productos Más Vendidos</h2>
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th class="text-right">Cantidad</th>
              <th class="text-right">Ingresos</th>
            </tr>
          </thead>
          <tbody>
            ${summary.topProducts.map(p => `
              <tr>
                <td>${p.productName}</td>
                <td class="text-right">${p.quantitySold}</td>
                <td class="text-right">${formatPrice(p.totalRevenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>⏰ Ventas por Hora</h2>
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th class="text-right">Pedidos</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${summary.salesByHour.map(h => `
              <tr>
                <td>${formatHour(h.hour)}</td>
                <td class="text-right">${h.orders}</td>
                <td class="text-right">${formatPrice(h.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>📋 Detalle de Pedidos</h2>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Ticket</th>
              <th>Método</th>
              <th class="text-right">Total</th>
              <th>Hora</th>
            </tr>
          </thead>
          <tbody>
            ${summary.orders.map(o => `
              <tr>
                <td>#${o.id}</td>
                <td>${o.receiptCode || '-'}</td>
                <td>${o.paymentMethod || '-'}</td>
                <td class="text-right">${formatPrice(o.totalAmount)}</td>
                <td>${formatDateTime(o.createdAt)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Documento generado automáticamente - Sistema Kiosko Autoservicio</p>
        </div>
      </body>
      </html>
    `;

    // Crear ventana para imprimir/PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      
      // Esperar a que cargue y abrir diálogo de impresión
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div>
      {/* Header */}
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
        <h2 style={{ margin: 0, fontSize: 18 }}>🧾 Cierre de Caja</h2>
      </div>

      {/* Filtros de fecha */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 16,
        padding: 12,
        background: '#f3f4f6',
        borderRadius: 8,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>Desde:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 6,
            }}
          />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13 }}>Hasta:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 6,
            }}
          />
        </label>
        <button
          onClick={loadSummary}
          style={{
            padding: '8px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Consultar
        </button>
        {summary && (
          <button
            onClick={generatePDF}
            style={{
              padding: '8px 20px',
              background: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 'bold',
              marginLeft: 'auto',
            }}
          >
            📄 Exportar PDF
          </button>
        )}
      </div>

      {loading && <p style={{ textAlign: 'center', padding: 40 }}>Cargando...</p>}
      {error && (
        <div style={{ padding: 12, background: '#fee2e2', color: '#dc2626', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {summary && !loading && (
        <>
          {/* Resumen Principal */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
            marginBottom: 20,
          }}>
            {/* Total Ventas */}
            <div style={{
              padding: 16,
              background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
              borderRadius: 12,
              color: 'white',
            }}>
              <div style={{ fontSize: 13, opacity: 0.9 }}>💰 Total Ventas</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 4 }}>
                {formatPrice(summary.totalSales)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                {summary.totalOrders} pedidos
              </div>
            </div>

            {/* Ticket Promedio */}
            <div style={{
              padding: 16,
              background: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
              borderRadius: 12,
              color: 'white',
            }}>
              <div style={{ fontSize: 13, opacity: 0.9 }}>📊 Ticket Promedio</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 4 }}>
                {formatPrice(summary.averageTicket)}
              </div>
            </div>

            {/* Efectivo */}
            <div style={{
              padding: 16,
              background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
              borderRadius: 12,
              color: 'white',
            }}>
              <div style={{ fontSize: 13, opacity: 0.9 }}>💵 Efectivo</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 4 }}>
                {formatPrice(summary.salesByCash)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                {summary.ordersByCash} pedidos
              </div>
            </div>

            {/* Mercado Pago */}
            <div style={{
              padding: 16,
              background: 'linear-gradient(135deg, #00b1ea 0%, #00d4ff 100%)',
              borderRadius: 12,
              color: 'white',
            }}>
              <div style={{ fontSize: 13, opacity: 0.9 }}>💙 Mercado Pago</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 4 }}>
                {formatPrice(summary.salesByMercadoPago)}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                {summary.ordersByMercadoPago} pedidos
              </div>
            </div>

            {/* Transferencia - solo mostrar si hay pedidos */}
            {(summary.ordersByTransfer > 0) && (
              <div style={{
                padding: 16,
                background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                borderRadius: 12,
                color: 'white',
              }}>
                <div style={{ fontSize: 13, opacity: 0.9 }}>🏦 Transferencia</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 4 }}>
                  {formatPrice(summary.salesByTransfer)}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  {summary.ordersByTransfer} pedidos
                </div>
              </div>
            )}

            {/* Otro Posnet - solo mostrar si hay pedidos */}
            {(summary.ordersByOtherPos > 0) && (
              <div style={{
                padding: 16,
                background: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
                borderRadius: 12,
                color: 'white',
              }}>
                <div style={{ fontSize: 13, opacity: 0.9 }}>💳 Otro Posnet</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 4 }}>
                  {formatPrice(summary.salesByOtherPos)}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  {summary.ordersByOtherPos} pedidos
                </div>
              </div>
            )}

            {/* Otros - solo mostrar si hay pedidos */}
            {(summary.ordersByManualOther > 0) && (
              <div style={{
                padding: 16,
                background: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
                borderRadius: 12,
                color: 'white',
              }}>
                <div style={{ fontSize: 13, opacity: 0.9 }}>📝 Otros</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', marginTop: 4 }}>
                  {formatPrice(summary.salesByManualOther)}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  {summary.ordersByManualOther} pedidos
                </div>
              </div>
            )}
          </div>

          {/* Productos más vendidos */}
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>🏆 Productos Más Vendidos</h3>
            {summary.topProducts.length === 0 ? (
              <p style={{ color: '#6b7280' }}>Sin datos</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {summary.topProducts.slice(0, 5).map((p, i) => (
                  <div
                    key={p.productId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: i === 0 ? '#fef3c7' : '#f9fafb',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>#{i + 1}</span>
                      <span>{p.productName}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold' }}>{p.quantitySold} unid.</div>
                      <div style={{ fontSize: 12, color: '#16a34a' }}>{formatPrice(p.totalRevenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ventas por Hora */}
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>⏰ Ventas por Hora</h3>
            {summary.salesByHour.length === 0 ? (
              <p style={{ color: '#6b7280' }}>Sin datos</p>
            ) : (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {summary.salesByHour.map(h => {
                  const maxOrders = Math.max(...summary.salesByHour.map(x => x.orders));
                  const heightPercent = (h.orders / maxOrders) * 100;
                  return (
                    <div
                      key={h.hour}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flex: 1,
                        minWidth: 30,
                      }}
                    >
                      <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 'bold' }}>
                        {h.orders}
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: 60,
                          background: '#f3f4f6',
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'flex-end',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: `${heightPercent}%`,
                            background: 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)',
                            borderRadius: 4,
                            minHeight: 4,
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>
                        {formatHour(h.hour)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Toggle detalle de pedidos */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              width: '100%',
              padding: 12,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#f9fafb',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginBottom: 16,
            }}
          >
            {showDetails ? '▲ Ocultar' : '▼ Ver'} Detalle de Pedidos ({summary.orders.length})
          </button>

          {/* Detalle de pedidos */}
          {showDetails && (
            <div style={{
              background: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              overflow: 'hidden',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '60px 80px 1fr 100px 80px',
                background: '#f3f4f6',
                padding: '10px 12px',
                fontWeight: 'bold',
                fontSize: 12,
              }}>
                <div>ID</div>
                <div>Ticket</div>
                <div>Método</div>
                <div style={{ textAlign: 'right' }}>Total</div>
                <div style={{ textAlign: 'right' }}>Hora</div>
              </div>
              {summary.orders.map(order => (
                <div
                  key={order.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 80px 1fr 100px 80px',
                    padding: '10px 12px',
                    borderTop: '1px solid #f3f4f6',
                    fontSize: 13,
                  }}
                >
                  <div>#{order.id}</div>
                  <div style={{ fontFamily: 'monospace' }}>{order.receiptCode || '-'}</div>
                  <div>{order.paymentMethod || '-'}</div>
                  <div style={{ textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                    {formatPrice(order.totalAmount)}
                  </div>
                  <div style={{ textAlign: 'right', color: '#6b7280' }}>
                    {formatDateTime(order.createdAt).split(' ')[1]}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Estados */}
          <div style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: 16,
            marginTop: 16,
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 15 }}>📦 Todos los Pedidos por Estado</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {summary.ordersByStatus.map(s => (
                <div
                  key={s.status}
                  style={{
                    padding: '8px 16px',
                    background: s.status === 'PAID' ? '#dcfce7' : '#f3f4f6',
                    borderRadius: 8,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{getStatusLabel(s.status)}</div>
                  <div style={{ fontWeight: 'bold' }}>{s.count}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
