import React, { useEffect, useState } from 'react';
import { getSystemConfig, updateSystemConfig } from '../api/client';
import type { SystemConfig } from '../api/client';

interface Props {
  onBack: () => void;
}

export default function SystemConfigView({ onBack }: Props) {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const data = await getSystemConfig();
      setConfig(data);
      setError('');
    } catch {
      setError('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: keyof SystemConfig, value: string | number | boolean) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
    setSuccess('');
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateSystemConfig(config);
      setSuccess('Configuración guardada correctamente');
    } catch {
      setError('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p>Cargando configuración...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div style={{ padding: 20 }}>
        <button onClick={onBack} style={{ marginBottom: 16, padding: '8px 16px', border: '1px solid #ddd', borderRadius: 8, background: 'white' }}>
          ← Volver
        </button>
        <p style={{ color: '#ef4444' }}>{error || 'No se pudo cargar la configuración'}</p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: 8,
    fontSize: 14,
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 6,
    fontWeight: 500,
    color: '#374151',
    fontSize: 14,
  };

  const sectionStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #e5e7eb',
    marginBottom: 20,
  };

  const sectionTitleStyle: React.CSSProperties = {
    margin: '0 0 16px 0',
    fontSize: 16,
    color: '#374151',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 16,
  };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={onBack}
            style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 8, background: 'white', cursor: 'pointer' }}
          >
            ← Volver
          </button>
          <h1 style={{ margin: 0, fontSize: 24 }}>⚙️ Configuración del Sistema</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 24px',
            border: 'none',
            borderRadius: 8,
            background: saving ? '#9ca3af' : '#10b981',
            color: 'white',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {saving ? 'Guardando...' : '💾 Guardar Cambios'}
        </button>
      </div>

      {/* Mensajes */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16, color: '#dc2626' }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginBottom: 16, color: '#16a34a' }}>
          ✅ {success}
        </div>
      )}

      {/* Información del Negocio */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>🏪 Información del Negocio</h3>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Nombre del Negocio</label>
            <input
              type="text"
              value={config.businessName}
              onChange={(e) => handleChange('businessName', e.target.value)}
              style={inputStyle}
              placeholder="Mi Restaurante"
            />
          </div>
          <div>
            <label style={labelStyle}>Teléfono</label>
            <input
              type="tel"
              value={config.businessPhone}
              onChange={(e) => handleChange('businessPhone', e.target.value)}
              style={inputStyle}
              placeholder="+52 55 1234 5678"
            />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={labelStyle}>Dirección</label>
            <input
              type="text"
              value={config.businessAddress}
              onChange={(e) => handleChange('businessAddress', e.target.value)}
              style={inputStyle}
              placeholder="Calle Ejemplo #123, Col. Centro, Ciudad"
            />
          </div>
          <div>
            <label style={labelStyle}>RFC / ID Fiscal</label>
            <input
              type="text"
              value={config.taxId}
              onChange={(e) => handleChange('taxId', e.target.value)}
              style={inputStyle}
              placeholder="XAXX010101000"
            />
          </div>
          <div>
            <label style={labelStyle}>Pie de Recibo</label>
            <input
              type="text"
              value={config.receiptFooter}
              onChange={(e) => handleChange('receiptFooter', e.target.value)}
              style={inputStyle}
              placeholder="¡Gracias por su compra!"
            />
          </div>
        </div>
      </div>

      {/* Configuración Fiscal */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>💰 Configuración Fiscal</h3>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Moneda</label>
            <select
              value={config.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              style={inputStyle}
            >
              <option value="MXN">MXN - Peso Mexicano</option>
              <option value="USD">USD - Dólar Estadounidense</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tasa de Impuesto (IVA)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                value={config.taxRate * 100}
                onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) / 100 || 0)}
                style={{ ...inputStyle, flex: 1 }}
                min="0"
                max="100"
                step="0.1"
              />
              <span style={{ color: '#6b7280' }}>%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Configuración de Notificaciones */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>🔔 Notificaciones</h3>
        <div style={gridStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="checkbox"
              id="enableSound"
              checked={config.enableSound}
              onChange={(e) => handleChange('enableSound', e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <label htmlFor="enableSound" style={{ color: '#374151', cursor: 'pointer' }}>
              Habilitar sonidos de notificación
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="checkbox"
              id="enableVibration"
              checked={config.enableVibration}
              onChange={(e) => handleChange('enableVibration', e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <label htmlFor="enableVibration" style={{ color: '#374151', cursor: 'pointer' }}>
              Habilitar vibración (móviles)
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="checkbox"
              id="printAutomatically"
              checked={config.printAutomatically}
              onChange={(e) => handleChange('printAutomatically', e.target.checked)}
              style={{ width: 20, height: 20 }}
            />
            <label htmlFor="printAutomatically" style={{ color: '#374151', cursor: 'pointer' }}>
              Imprimir tickets automáticamente
            </label>
          </div>
        </div>
      </div>

      {/* Configuración de Cocina */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>👨‍🍳 Cocina</h3>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Actualización automática (segundos)</label>
            <input
              type="number"
              value={config.kitchenAutoRefresh}
              onChange={(e) => handleChange('kitchenAutoRefresh', parseInt(e.target.value) || 5)}
              style={inputStyle}
              min="1"
              max="60"
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
              Cada cuántos segundos se actualizan los pedidos en cocina
            </p>
          </div>
          <div>
            <label style={labelStyle}>Timeout de órdenes (minutos)</label>
            <input
              type="number"
              value={config.orderTimeout}
              onChange={(e) => handleChange('orderTimeout', parseInt(e.target.value) || 30)}
              style={inputStyle}
              min="5"
              max="120"
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
              Tiempo para marcar una orden como expirada
            </p>
          </div>
        </div>
      </div>

      {/* Configuración de Mercado Pago */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>💳 Mercado Pago</h3>
        <div style={gridStyle}>
          <div>
            <label style={labelStyle}>Public Key</label>
            <input
              type="text"
              value={config.mpPublicKey}
              onChange={(e) => handleChange('mpPublicKey', e.target.value)}
              style={inputStyle}
              placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
          <div>
            <label style={labelStyle}>Access Token</label>
            <input
              type="password"
              value={config.mpAccessToken}
              onChange={(e) => handleChange('mpAccessToken', e.target.value)}
              style={inputStyle}
              placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#f59e0b' }}>
              ⚠️ Este token es sensible. Manténlo en secreto.
            </p>
          </div>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 13, color: '#6b7280' }}>
          Obtén tus credenciales en{' '}
          <a href="https://www.mercadopago.com.mx/developers/panel" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
            Panel de Desarrolladores de Mercado Pago
          </a>
        </p>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 24, paddingBottom: 40 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 32px',
            border: 'none',
            borderRadius: 8,
            background: saving ? '#9ca3af' : '#10b981',
            color: 'white',
            cursor: saving ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          {saving ? 'Guardando...' : '💾 Guardar Todos los Cambios'}
        </button>
      </div>
    </div>
  );
}
