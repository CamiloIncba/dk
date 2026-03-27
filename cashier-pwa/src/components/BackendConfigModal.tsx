import { useState, useEffect } from 'react';
import { useBackendConfig } from '../hooks/useBackendConfig';

interface BackendConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackendConfigModal({ isOpen, onClose }: BackendConfigModalProps) {
  const { backendUrl, setBackendUrl, status, checkConnection } = useBackendConfig();
  const [tempUrl, setTempUrl] = useState(backendUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  // Sincronizar tempUrl cuando cambia backendUrl o se abre el modal
  useEffect(() => {
    if (isOpen) {
      setTempUrl(backendUrl);
      setTestResult(null);
    }
  }, [isOpen, backendUrl]);

  if (!isOpen) return null;

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${tempUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      
      if (response.ok) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setBackendUrl(tempUrl);
    // Forzar reconexión
    setTimeout(() => {
      checkConnection();
    }, 100);
    onClose();
  };

  const handleReset = () => {
    const defaultUrl = 'http://localhost:3010';
    setTempUrl(defaultUrl);
    setTestResult(null);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        padding: '24px',
        maxWidth: '400px',
        width: '100%',
        margin: '16px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#111827',
          }}>
            ⚙️ Configuración del Servidor
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Estado actual */}
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '14px', color: '#4b5563' }}>Estado actual:</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: status.connected ? '#22c55e' : '#ef4444',
              }} />
              <span style={{
                fontSize: '14px',
                color: status.connected ? '#166534' : '#991b1b',
              }}>
                {status.connected ? 'Conectado' : 'Sin conexión'}
              </span>
            </div>
          </div>
          <div style={{
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            URL: {backendUrl}
          </div>
        </div>

        {/* Input de URL */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '4px',
          }}>
            URL del servidor:
          </label>
          <input
            type="text"
            value={tempUrl}
            onChange={(e) => {
              setTempUrl(e.target.value);
              setTestResult(null);
            }}
            placeholder="http://192.168.1.100:3010"
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              boxSizing: 'border-box',
            }}
          />
          <p style={{
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '4px',
            margin: '4px 0 0',
          }}>
            Ejemplo: http://192.168.1.100:3010
          </p>
        </div>

        {/* Resultado del test */}
        {testResult && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: testResult === 'success' ? '#f0fdf4' : '#fef2f2',
            color: testResult === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${testResult === 'success' ? '#bbf7d0' : '#fecaca'}`,
          }}>
            {testResult === 'success' ? (
              <span>✅ Conexión exitosa</span>
            ) : (
              <span>❌ No se pudo conectar. Verifica la URL.</span>
            )}
          </div>
        )}

        {/* Botones */}
        <div style={{
          display: 'flex',
          gap: '8px',
        }}>
          <button
            onClick={handleReset}
            style={{
              padding: '10px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: '#4b5563',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Restablecer
          </button>
          <button
            onClick={handleTest}
            disabled={testing || !tempUrl}
            style={{
              padding: '10px 16px',
              backgroundColor: '#e5e7eb',
              border: 'none',
              borderRadius: '8px',
              color: '#374151',
              cursor: testing || !tempUrl ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              opacity: testing || !tempUrl ? 0.5 : 1,
            }}
          >
            {testing ? 'Probando...' : 'Probar'}
          </button>
          <button
            onClick={handleSave}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#2563eb',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
