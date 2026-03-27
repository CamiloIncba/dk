import { useState, useEffect, useCallback } from 'react';
import { fetchDisplayOrders } from './api/client';
import { DisplayResponse, Order } from './types';

const REFRESH_INTERVAL = 10000; // 10 segundos

function App() {
  const [data, setData] = useState<DisplayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);

  const loadOrders = useCallback(async () => {
    try {
      const result = await fetchDisplayOrders();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial y refresh automático
  useEffect(() => {
    loadOrders();
    
    const interval = setInterval(() => {
      loadOrders();
      setCountdown(REFRESH_INTERVAL / 1000);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [loadOrders]);

  // Countdown visual
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 1 ? prev - 1 : REFRESH_INTERVAL / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (loading && !data) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Cargando pedidos...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="error">
        <div className="error-icon">⚠️</div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="header">
        <h1>🍞 Estado de Pedidos</h1>
        <div className="subtitle">Casa Rica</div>
      </header>

      <div className="columns-container">
        <Column 
          title="🔥 En Preparación" 
          orders={data?.inPreparation || []} 
          type="preparing"
        />
        <Column 
          title="✅ Listo para Retirar" 
          orders={data?.ready || []} 
          type="ready"
        />
      </div>

      <div className="refresh-timer">
        Actualiza en {countdown}s
      </div>
    </div>
  );
}

interface ColumnProps {
  title: string;
  orders: Order[];
  type: 'preparing' | 'ready';
}

function Column({ title, orders, type }: ColumnProps) {
  const hasManyOrders = orders.length > 5;
  
  return (
    <div className={`column ${type} ${hasManyOrders ? 'many-orders' : ''}`}>
      <div className="column-header">
        {title} ({orders.length})
      </div>
      <div className="column-content">
        {orders.length === 0 ? (
          <div className="empty-message">
            {type === 'preparing' 
              ? 'No hay pedidos en preparación' 
              : 'No hay pedidos listos'}
          </div>
        ) : (
          orders.map(order => (
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: Order;
}

function OrderCard({ order }: OrderCardProps) {
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="order-card">
      <div className="order-code">
        #{order.id}
      </div>
      <div className="order-time">{formatTime(order.createdAt)}</div>
    </div>
  );
}

export default App;
