import { useState, useEffect } from 'react';
import { api, type ProductExtraGroup, type ExtraOption } from '../api/client';
import type { CartItemExtra, MenuItem } from '../types';

interface ExtrasModalProps {
  product: MenuItem;
  onConfirm: (extras: CartItemExtra[]) => void;
  onCancel: () => void;
}

export function ExtrasModal({ product, onConfirm, onCancel }: ExtrasModalProps) {
  const [extraGroups, setExtraGroups] = useState<ProductExtraGroup[]>([]);
  const [loading, setLoading] = useState(true);
  // selections: { groupId -> { optionId -> quantity } }
  const [selections, setSelections] = useState<Map<number, Map<number, number>>>(new Map());

  useEffect(() => {
    loadExtras();
  }, [product.id]);

  const loadExtras = async () => {
    try {
      const groups = await api.getProductExtras(product.id);
      setExtraGroups(groups);
      // Inicializar selecciones vacías
      const initial = new Map<number, Map<number, number>>();
      groups.forEach(g => initial.set(g.groupId, new Map()));
      setSelections(initial);
    } catch (err) {
      console.error('Error cargando extras:', err);
    } finally {
      setLoading(false);
    }
  };

  // Obtener opciones disponibles para un grupo
  const getAvailableOptions = (group: ProductExtraGroup): (ExtraOption & { finalPrice: number })[] => {
    // Si hay customOptions, solo esas
    if (group.customOptions && group.customOptions.length > 0) {
      return group.customOptions.map(co => ({
        ...co.option,
        finalPrice: co.priceOverride !== null ? co.priceOverride : co.option.price,
      }));
    }
    // Si no, todas las del grupo
    return group.group.options
      .filter(o => o.active)
      .map(o => ({ ...o, finalPrice: o.price }));
  };

  const getMaxSelections = (group: ProductExtraGroup): number => {
    // Prioridad: maxSelections del producto > maxSelections del grupo > infinito
    if (group.maxSelections !== null && group.maxSelections !== undefined) {
      return group.maxSelections;
    }
    if (group.group.maxSelections !== null && group.group.maxSelections !== undefined) {
      return group.group.maxSelections;
    }
    return 999;
  };

  const getTotalSelected = (groupId: number): number => {
    const groupSel = selections.get(groupId);
    if (!groupSel) return 0;
    let total = 0;
    groupSel.forEach(qty => total += qty);
    return total;
  };

  const toggleOption = (groupId: number, optionId: number) => {
    setSelections(prev => {
      const newSel = new Map(prev);
      const groupSel = new Map(newSel.get(groupId) || new Map());
      
      const current = groupSel.get(optionId) || 0;
      const max = getMaxSelections(extraGroups.find(g => g.groupId === groupId)!);
      const totalSelected = getTotalSelected(groupId);

      if (current > 0) {
        // Quitar
        groupSel.delete(optionId);
      } else {
        // Agregar si no supera el máximo
        if (totalSelected < max) {
          groupSel.set(optionId, 1);
        }
      }

      newSel.set(groupId, groupSel);
      return newSel;
    });
  };

  const handleConfirm = () => {
    const extras: CartItemExtra[] = [];
    
    selections.forEach((groupSel, groupId) => {
      const group = extraGroups.find(g => g.groupId === groupId);
      if (!group) return;
      
      const availableOptions = getAvailableOptions(group);
      
      groupSel.forEach((qty, optionId) => {
        if (qty > 0) {
          const opt = availableOptions.find(o => o.id === optionId);
          if (opt) {
            extras.push({
              optionId,
              name: opt.name,
              price: opt.finalPrice,
              quantity: qty,
            });
          }
        }
      });
    });

    onConfirm(extras);
  };

  // Validar mínimos
  const isValid = (): boolean => {
    for (const group of extraGroups) {
      const min = group.group.minSelections || 0;
      const selected = getTotalSelected(group.groupId);
      if (selected < min) return false;
    }
    return true;
  };

  const formatPrice = (price: number) => {
    if (price === 0) return 'Gratis';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Calcular total de extras seleccionados
  const getExtrasTotal = (): number => {
    let total = 0;
    selections.forEach((groupSel, groupId) => {
      const group = extraGroups.find(g => g.groupId === groupId);
      if (!group) return;
      const availableOptions = getAvailableOptions(group);
      groupSel.forEach((qty, optionId) => {
        const opt = availableOptions.find(o => o.id === optionId);
        if (opt) total += opt.finalPrice * qty;
      });
    });
    return total;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px',
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '16px',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#111827' }}>
            {product.name}
          </h2>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
            Personaliza tu pedido
          </p>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Cargando opciones...
            </div>
          ) : extraGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No hay extras disponibles
            </div>
          ) : (
            extraGroups.map(group => {
              const options = getAvailableOptions(group);
              const max = getMaxSelections(group);
              const min = group.group.minSelections || 0;
              const selected = getTotalSelected(group.groupId);

              return (
                <div key={group.groupId} style={{ marginBottom: '24px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', color: '#111827' }}>
                      {group.group.name}
                    </h3>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                      {min > 0 && `Mínimo ${min}`}
                      {min > 0 && max < 999 && ' • '}
                      {max < 999 && `Máximo ${max}`}
                      {min === 0 && max >= 999 && 'Opcional'}
                      {' • '}
                      <span style={{ 
                        color: selected < min ? '#dc2626' : '#22c55e',
                        fontWeight: 500,
                      }}>
                        {selected} seleccionados
                      </span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {options.map(option => {
                      const isSelected = (selections.get(group.groupId)?.get(option.id) || 0) > 0;
                      const canSelect = isSelected || selected < max;

                      return (
                        <button
                          key={option.id}
                          onClick={() => canSelect && toggleOption(group.groupId, option.id)}
                          disabled={!canSelect && !isSelected}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '14px 16px',
                            border: isSelected ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                            borderRadius: '12px',
                            backgroundColor: isSelected ? '#eff6ff' : '#fff',
                            cursor: canSelect || isSelected ? 'pointer' : 'not-allowed',
                            opacity: canSelect || isSelected ? 1 : 0.5,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              border: isSelected ? 'none' : '2px solid #d1d5db',
                              backgroundColor: isSelected ? '#3b82f6' : '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: '14px',
                              fontWeight: 'bold',
                            }}>
                              {isSelected && '✓'}
                            </div>
                            <span style={{ 
                              fontSize: '15px', 
                              fontWeight: isSelected ? '600' : '500',
                              color: '#111827',
                            }}>
                              {option.name}
                            </span>
                          </div>
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: '600',
                            color: option.finalPrice === 0 ? '#22c55e' : '#374151',
                          }}>
                            {option.finalPrice > 0 && '+'}
                            {formatPrice(option.finalPrice)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Producto: {formatPrice(parseInt(product.price))}
            </span>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Extras: {formatPrice(getExtrasTotal())}
            </span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>Total:</span>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#22c55e' }}>
              {formatPrice(parseInt(product.price) + getExtrasTotal())}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '14px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                backgroundColor: '#fff',
                color: '#374151',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid()}
              style={{
                flex: 2,
                padding: '14px',
                border: 'none',
                borderRadius: '12px',
                backgroundColor: isValid() ? '#3b82f6' : '#9ca3af',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isValid() ? 'pointer' : 'not-allowed',
              }}
            >
              Agregar al pedido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
