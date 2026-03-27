import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '../api/client';
import { useBackendConfig } from '../hooks/useBackendConfig';
import { BackendConfigModal } from './BackendConfigModal';
import type { Order, OrderItem } from '../types';

interface KitchenViewProps {
  onBack?: () => void;
}

type ChannelFilter = 'TODOS' | 'WEB_STORE' | 'OTROS';

// Sonido de notificación (ding corto)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleF9dYHWPo6iggGU/P2qOr8K8rYloTVRuj6e5sJFuW1VmfJCepp2OgGlhZXCFl5qWk4N0bG1wfYuVlZSJeXBtcXyCi5OSj4V8d3Z5fomPjoqAfHZ4eX2Fjo+Mh393c3R3e4SKjYqFfnd0dXh+hoyMiYV9d3V1e4GHi4mGgXt2dniAhYmIhoF8d3Z5fYOGiIeFfnp2dXl+g4eHhYF8d3V3fYKGh4WDfnh1dXl+goaGhIJ9eHV2en+EhoWDgHt3dXZ6f4OGhYOAfXh1dXl+goaFhIF8d3Z3fIKFhYSBfXl2dnl+g4WFg4F9eHZ2eX6ChYWDgX14dnZ5foKFhYOBfXh2dnl9goWFg4F9eHZ2eX6ChYWDgX14dnZ5foKFhYOBfXh2dnl9goWFg4F9eHZ2eX6ChYWDgX14dnZ5foKFhYOBfXh2dnl+goWFg4F9eHZ2eX2ChYSDgX14dnZ5foKFhYOBfXh2dnl+goWFg4F9eHZ2eX6ChYWDgX14dnZ5foKFhYOBfXh2dnl+goWFg4F9eHZ2eX6ChYWDgX14dnZ5foKFhYOBfXh2dnl+goWFg4F9eHZ2eX6ChYWDgX14dnZ5foKFhYOBfXh2dw==';

export function KitchenView({ onBack }: KitchenViewProps) {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('TODOS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [now, setNow] = useState(Date.now()); // Para actualizar contadores cada segundo
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { status } = useBackendConfig();
  
  // Referencia para rastrear IDs de pedidos conocidos
  const knownOrderIdsRef = useRef<Set<number>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isFirstLoadRef = useRef(true);

  // Inicializar audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.7;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Función para reproducir sonido
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Ignorar errores de autoplay
      });
    }
  }, [soundEnabled]);

  // Actualizar "now" cada segundo para contadores precisos
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const [active, ready] = await Promise.all([
        api.getActiveOrders(),
        api.getReadyOrders(),
      ]);
      
      // Detectar nuevos pedidos activos
      if (!isFirstLoadRef.current) {
        const currentIds = new Set(active.map(o => o.id));
        let hasNewOrder = false;
        
        for (const id of currentIds) {
          if (!knownOrderIdsRef.current.has(id)) {
            hasNewOrder = true;
            break;
          }
        }
        
        if (hasNewOrder) {
          playNotificationSound();
        }
      }
      
      // Actualizar IDs conocidos
      knownOrderIdsRef.current = new Set([
        ...active.map(o => o.id),
        ...ready.map(o => o.id),
      ]);
      isFirstLoadRef.current = false;
      
      setActiveOrders(active);
      setReadyOrders(ready);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  }, [playNotificationSound]);

  useEffect(() => {
    fetchOrders();
    // Polling cada 5 segundos
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleStart = async (orderId: number) => {
    try {
      await api.updateKitchenStatus(orderId, 'IN_PREPARATION');
      fetchOrders();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleReady = async (orderId: number) => {
    try {
      await api.updateKitchenStatus(orderId, 'READY');
      fetchOrders();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const handleDelivered = async (orderId: number) => {
    try {
      await api.updateKitchenStatus(orderId, 'DELIVERED');
      fetchOrders();
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calcular tiempo exacto desde creación (usa 'now' que se actualiza cada segundo)
  const getTimeAgo = (dateStr: string): { minutes: number; seconds: number; display: string } => {
    const diffMs = now - new Date(dateStr).getTime();
    const totalSeconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    // Mostrar MM:SS para tiempos menores a 60 minutos
    if (minutes < 60) {
      return {
        minutes,
        seconds,
        display: `${minutes}:${seconds.toString().padStart(2, '0')}`
      };
    }
    // Para más de una hora
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return {
      minutes,
      seconds,
      display: `${hours}h ${mins}m`
    };
  };

  // Color según tiempo de espera
  const getTimeColor = (minutes: number): string => {
    if (minutes < 5) return '#22c55e';
    if (minutes < 10) return '#f59e0b';
    return '#dc2626';
  };

  const getOrderChannel = useCallback((order: Order): string => {
    const explicitChannel = order.channel?.trim();
    if (explicitChannel) return explicitChannel.toUpperCase();

    const noteText = order.note ?? '';
    const match = noteText.match(/\[CHANNEL:([^\]]+)\]/i);
    if (match?.[1]) return match[1].trim().toUpperCase();

    return 'OTROS';
  }, []);

  const matchesChannelFilter = useCallback((order: Order): boolean => {
    const channel = getOrderChannel(order);
    if (channelFilter === 'TODOS') return true;
    if (channelFilter === 'WEB_STORE') return channel === 'WEB_STORE';
    return channel !== 'WEB_STORE';
  }, [channelFilter, getOrderChannel]);

  const filteredActiveOrders = useMemo(
    () => activeOrders.filter(matchesChannelFilter),
    [activeOrders, matchesChannelFilter]
  );

  const filteredReadyOrders = useMemo(
    () => readyOrders.filter(matchesChannelFilter),
    [readyOrders, matchesChannelFilter]
  );

  const getChannelBadgeStyles = (channel: string): { bg: string; text: string } => {
    if (channel === 'WEB_STORE') return { bg: '#7c3aed', text: '#ede9fe' };
    return { bg: '#4b5563', text: '#f3f4f6' };
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1f2937',
      color: '#fff',
      padding: '16px',
    }}>
      {/* Estilos de animación */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                padding: '12px 16px',
                backgroundColor: '#374151',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              ← Volver
            </button>
          )}
          <h1 style={{ margin: 0, fontSize: '28px' }}>🍳 COCINA</h1>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ 
            backgroundColor: '#3b82f6', 
            padding: '8px 16px', 
            borderRadius: '20px',
            fontSize: '18px',
            fontWeight: 'bold',
          }}>
            Activos: {filteredActiveOrders.length}
          </span>
          <span style={{ 
            backgroundColor: '#22c55e', 
            padding: '8px 16px', 
            borderRadius: '20px',
            fontSize: '18px',
            fontWeight: 'bold',
          }}>
            Listos: {filteredReadyOrders.length}
          </span>
          <div style={{
            display: 'flex',
            gap: '6px',
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: '10px',
            padding: '4px',
          }}>
            {(['TODOS', 'WEB_STORE', 'OTROS'] as ChannelFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setChannelFilter(filter)}
                style={{
                  padding: '8px 10px',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  backgroundColor: channelFilter === filter ? '#2563eb' : 'transparent',
                  color: channelFilter === filter ? '#fff' : '#d1d5db',
                }}
              >
                {filter}
              </button>
            ))}
          </div>
          {/* Botón de sonido */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            style={{
              padding: '12px 20px',
              backgroundColor: soundEnabled ? '#16a34a' : '#6b7280',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px',
            }}
            title={soundEnabled ? 'Sonido activado' : 'Sonido desactivado'}
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>
          <button
            onClick={fetchOrders}
            disabled={loading}
            style={{
              padding: '12px 20px',
              backgroundColor: '#4b5563',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            {loading ? '...' : '🔄'}
          </button>
          {/* Indicador de conexión */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: status.connected ? '#166534' : '#991b1b',
            borderRadius: '8px',
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: status.connected ? '#4ade80' : '#f87171',
              animation: status.connected ? 'none' : 'pulse 1s infinite',
            }} />
            <span style={{ fontSize: '14px' }}>
              {status.connected ? 'Conectado' : 'Sin conexión'}
            </span>
          </div>
          {/* Botón de configuración */}
          <button
            onClick={() => setShowConfig(true)}
            style={{
              padding: '12px 16px',
              backgroundColor: '#6b7280',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '18px',
            }}
            title="Configurar servidor"
          >
            ⚙️
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#dc2626',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '16px',
        }}>
          {error}
        </div>
      )}

      {/* Grid de dos columnas: En Preparación | Listos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
        height: 'calc(100vh - 120px)',
      }}>
        {/* Columna: En Preparación */}
        <div style={{
          backgroundColor: '#111827',
          borderRadius: '16px',
          padding: '16px',
          overflow: 'auto',
        }}>
          <h2 style={{ 
            margin: '0 0 16px', 
            fontSize: '22px',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            🔥 EN PREPARACIÓN
          </h2>

          {filteredActiveOrders.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px', 
              color: '#6b7280',
              fontSize: '20px',
            }}>
              No hay pedidos pendientes
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '16px',
            }}>
              {filteredActiveOrders.map(order => {
                const timeAgo = getTimeAgo(order.createdAt);
                const isInPrep = order.kitchenStatus === 'IN_PREPARATION';
                const channel = getOrderChannel(order);
                const channelBadge = getChannelBadgeStyles(channel);

                return (
                  <div
                    key={order.id}
                    style={{
                      backgroundColor: isInPrep ? '#1e3a5f' : '#1f2937',
                      border: isInPrep ? '3px solid #3b82f6' : '2px solid #374151',
                      borderRadius: '16px',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {/* Header de la orden */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                    }}>
                      <div>
                        <span style={{
                          fontSize: '32px',
                          fontWeight: 'bold',
                          color: '#fff',
                        }}>
                          #{order.id}
                        </span>
                        <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '4px' }}>
                          {formatTime(order.createdAt)}
                        </div>
                        <div style={{ marginTop: '8px' }}>
                          <span style={{
                            backgroundColor: channelBadge.bg,
                            color: channelBadge.text,
                            borderRadius: '999px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}>
                            {channel}
                          </span>
                        </div>
                      </div>
                      <div style={{
                        backgroundColor: getTimeColor(timeAgo.minutes),
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        fontFamily: 'monospace',
                      }}>
                        {timeAgo.display}
                      </div>
                    </div>

                    {/* Items */}
                    <div style={{ flex: 1, marginBottom: '16px' }}>
                      {order.items?.map((item) => (
                        <KitchenItem key={item.id} item={item} />
                      ))}
                    </div>

                    {/* Botones */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        onClick={() => handleReady(order.id)}
                        style={{
                          flex: 1,
                          padding: '16px',
                          backgroundColor: '#22c55e',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                        }}
                      >
                        ✅ LISTO
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna: Listos para entregar */}
        <div style={{
          backgroundColor: '#052e16',
          borderRadius: '16px',
          padding: '16px',
          overflow: 'auto',
        }}>
          <h2 style={{ 
            margin: '0 0 16px', 
            fontSize: '22px',
            color: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            ✅ LISTOS
          </h2>

          {filteredReadyOrders.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#6b7280',
              fontSize: '18px',
            }}>
              Sin pedidos listos
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredReadyOrders.map(order => {
                const channel = getOrderChannel(order);
                const channelBadge = getChannelBadgeStyles(channel);
                return (
                  <div
                    key={order.id}
                    style={{
                      backgroundColor: '#065f46',
                      border: '2px solid #22c55e',
                      borderRadius: '12px',
                      padding: '16px',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}>
                      <div>
                        <span style={{
                          fontSize: '28px',
                          fontWeight: 'bold',
                        }}>
                          #{order.id}
                        </span>
                        <div style={{ marginTop: '8px' }}>
                          <span style={{
                            backgroundColor: channelBadge.bg,
                            color: channelBadge.text,
                            borderRadius: '999px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}>
                            {channel}
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '14px', color: '#a7f3d0' }}>
                        {formatTime(order.createdAt)}
                      </span>
                    </div>

                    {/* Resumen de items */}
                    <div style={{ fontSize: '14px', color: '#d1fae5', marginBottom: '12px' }}>
                      {order.items?.map(item => (
                        <div key={item.id}>
                          {item.quantity}x {item.product.name}
                          {item.extras && item.extras.length > 0 && (
                            <span style={{ color: '#a7f3d0' }}>
                              {' '}(+{item.extras.length} extras)
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleDelivered(order.id)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#166534',
                        border: '2px solid #22c55e',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                      }}
                    >
                      📦 ENTREGADO
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de configuración */}
      <BackendConfigModal 
        isOpen={showConfig} 
        onClose={() => setShowConfig(false)} 
      />
    </div>
  );
}

// Componente para mostrar un item con sus extras
function KitchenItem({ item }: { item: OrderItem }) {
  return (
    <div style={{
      padding: '12px',
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: '10px',
      marginBottom: '8px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <span style={{
          backgroundColor: '#3b82f6',
          color: '#fff',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          flexShrink: 0,
        }}>
          {item.quantity}
        </span>
        <span style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#fff',
        }}>
          {item.product.name}
        </span>
      </div>

      {/* Extras - muy visibles */}
      {item.extras && item.extras.length > 0 && (
        <div style={{
          marginTop: '10px',
          marginLeft: '48px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
        }}>
          {item.extras.map((extra) => (
            <span
              key={extra.id}
              style={{
                backgroundColor: '#f59e0b',
                color: '#000',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              + {extra.extraOption.name}
              {extra.quantity > 1 && ` x${extra.quantity}`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
