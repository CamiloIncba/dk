import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { ExtraGroup, ExtraOption } from '../api/client';

interface ExtrasManagerProps {
  onBack: () => void;
}

type View = 'groups' | 'options';

export const ExtrasManager: React.FC<ExtrasManagerProps> = ({ onBack }) => {
  const [view, setView] = useState<View>('groups');
  const [groups, setGroups] = useState<ExtraGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ExtraGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states para grupo
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ExtraGroup | null>(null);
  const [formGroupName, setFormGroupName] = useState('');
  const [formGroupDesc, setFormGroupDesc] = useState('');
  const [formMinSel, setFormMinSel] = useState(0);
  const [formMaxSel, setFormMaxSel] = useState<number | ''>('');

  // Form states para opción
  const [optionFormOpen, setOptionFormOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ExtraOption | null>(null);
  const [formOptionName, setFormOptionName] = useState('');
  const [formOptionPrice, setFormOptionPrice] = useState(0);
  const [formOptionImage, setFormOptionImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await api.getExtraGroups();
      setGroups(data);
    } catch (err) {
      console.error('Error cargando grupos:', err);
    } finally {
      setLoading(false);
    }
  };

  // ==================== GRUPOS ====================

  const openGroupForm = (group?: ExtraGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormGroupName(group.name);
      setFormGroupDesc(group.description || '');
      setFormMinSel(group.minSelections);
      setFormMaxSel(group.maxSelections ?? '');
    } else {
      setEditingGroup(null);
      setFormGroupName('');
      setFormGroupDesc('');
      setFormMinSel(0);
      setFormMaxSel('');
    }
    setGroupFormOpen(true);
  };

  const closeGroupForm = () => {
    setGroupFormOpen(false);
    setEditingGroup(null);
  };

  const saveGroup = async () => {
    if (!formGroupName.trim()) return;
    setSaving(true);
    try {
      if (editingGroup) {
        await api.updateExtraGroup(editingGroup.id, {
          name: formGroupName,
          description: formGroupDesc || undefined,
          minSelections: formMinSel,
          maxSelections: formMaxSel === '' ? null : formMaxSel,
        });
      } else {
        await api.createExtraGroup({
          name: formGroupName,
          description: formGroupDesc || undefined,
          minSelections: formMinSel,
          maxSelections: formMaxSel === '' ? undefined : formMaxSel,
        });
      }
      await loadGroups();
      closeGroupForm();
    } catch (err) {
      console.error('Error guardando grupo:', err);
      alert('Error guardando grupo');
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (group: ExtraGroup) => {
    if (!confirm(`¿Eliminar el grupo "${group.name}" y todas sus opciones?`)) return;
    try {
      await api.deleteExtraGroup(group.id);
      await loadGroups();
      if (selectedGroup?.id === group.id) {
        setSelectedGroup(null);
        setView('groups');
      }
    } catch (err) {
      console.error('Error eliminando grupo:', err);
      alert('Error eliminando grupo');
    }
  };

  const toggleGroupPause = async (group: ExtraGroup) => {
    try {
      await api.toggleExtraGroupPause(group.id);
      await loadGroups();
    } catch (err) {
      console.error('Error pausando grupo:', err);
      alert('Error al pausar/reanudar grupo');
    }
  };

  // ==================== OPCIONES ====================

  const openOptionsView = (group: ExtraGroup) => {
    setSelectedGroup(group);
    setView('options');
  };

  const openOptionForm = (option?: ExtraOption) => {
    if (option) {
      setEditingOption(option);
      setFormOptionName(option.name);
      setFormOptionPrice(option.price);
      setFormOptionImage(option.imageUrl || '');
    } else {
      setEditingOption(null);
      setFormOptionName('');
      setFormOptionPrice(0);
      setFormOptionImage('');
    }
    setOptionFormOpen(true);
  };

  const closeOptionForm = () => {
    setOptionFormOpen(false);
    setEditingOption(null);
  };

  const handleOptionImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const url = await api.uploadImage(file);
      setFormOptionImage(url);
    } catch (err) {
      console.error('Error subiendo imagen:', err);
      alert('Error subiendo imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const saveOption = async () => {
    if (!formOptionName.trim() || !selectedGroup) return;
    setSaving(true);
    try {
      if (editingOption) {
        await api.updateExtraOption(editingOption.id, {
          name: formOptionName,
          price: formOptionPrice,
          imageUrl: formOptionImage || undefined,
        });
      } else {
        await api.createExtraOption(selectedGroup.id, {
          name: formOptionName,
          price: formOptionPrice,
          imageUrl: formOptionImage || undefined,
        });
      }
      await loadGroups();
      // Actualizar selectedGroup
      const updated = (await api.getExtraGroups()).find(g => g.id === selectedGroup.id);
      if (updated) setSelectedGroup(updated);
      closeOptionForm();
    } catch (err) {
      console.error('Error guardando opción:', err);
      alert('Error guardando opción');
    } finally {
      setSaving(false);
    }
  };

  const deleteOption = async (option: ExtraOption) => {
    if (!confirm(`¿Eliminar "${option.name}"?`)) return;
    try {
      await api.deleteExtraOption(option.id);
      await loadGroups();
      const updated = (await api.getExtraGroups()).find(g => g.id === selectedGroup?.id);
      if (updated) setSelectedGroup(updated);
    } catch (err) {
      console.error('Error eliminando opción:', err);
      alert('Error eliminando opción');
    }
  };

  const toggleOptionPause = async (option: ExtraOption) => {
    try {
      await api.toggleExtraOptionPause(option.id);
      await loadGroups();
      const updated = (await api.getExtraGroups()).find(g => g.id === selectedGroup?.id);
      if (updated) setSelectedGroup(updated);
    } catch (err) {
      console.error('Error pausando opción:', err);
      alert('Error al pausar/reanudar opción');
    }
  };

  // ==================== RENDER ====================

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p>Cargando extras...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          onClick={view === 'options' ? () => setView('groups') : onBack}
          style={{
            padding: '8px 16px',
            background: '#666',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          ← Volver
        </button>
        <h2 style={{ margin: 0, flex: 1 }}>
          {view === 'groups' ? '🧩 Grupos de Extras' : `📋 ${selectedGroup?.name}`}
        </h2>
        <button
          onClick={() => view === 'groups' ? openGroupForm() : openOptionForm()}
          style={{
            padding: '8px 16px',
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          + {view === 'groups' ? 'Nuevo Grupo' : 'Nueva Opción'}
        </button>
      </div>

      {/* Vista de grupos */}
      {view === 'groups' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groups.length === 0 ? (
            <div style={{
              padding: 40,
              textAlign: 'center',
              background: '#f5f5f5',
              borderRadius: 12,
              color: '#666',
            }}>
              <p style={{ fontSize: 18 }}>No hay grupos de extras creados</p>
              <p>Creá grupos como "Aderezos", "Ingredientes", "Extras", etc.</p>
            </div>
          ) : (
            groups.map(group => (
              <div
                key={group.id}
                style={{
                  background: group.paused ? '#fff8e1' : group.active ? 'white' : '#f9f9f9',
                  border: group.paused ? '2px solid #ff9800' : '1px solid #ddd',
                  borderRadius: 12,
                  padding: 16,
                  opacity: group.active ? 1 : 0.6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 18 }}>{group.name}</h3>
                      {group.paused && (
                        <span style={{
                          background: '#ff9800',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 'bold',
                        }}>
                          ⏸️ PAUSADO
                        </span>
                      )}
                    </div>
                    {group.description && (
                      <p style={{ margin: '4px 0 0', color: '#666', fontSize: 14 }}>
                        {group.description}
                      </p>
                    )}
                    <div style={{ marginTop: 8, display: 'flex', gap: 16, fontSize: 13, color: '#888' }}>
                      <span>📋 {group.options?.length || 0} opciones</span>
                      <span>📦 {group._count?.products || 0} productos</span>
                      <span>
                        {group.minSelections > 0 ? `Mín: ${group.minSelections}` : 'Opcional'}
                        {group.maxSelections ? ` | Máx: ${group.maxSelections}` : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleGroupPause(group)}
                    title={group.paused ? 'Reanudar grupo' : 'Pausar grupo'}
                    style={{
                      padding: '8px 12px',
                      background: group.paused ? '#4CAF50' : '#ff9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    {group.paused ? '▶️' : '⏸️'}
                  </button>
                  <button
                    onClick={() => openOptionsView(group)}
                    style={{
                      padding: '8px 12px',
                      background: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    Ver opciones
                  </button>
                  <button
                    onClick={() => openGroupForm(group)}
                    style={{
                      padding: '8px 12px',
                      background: '#FF9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteGroup(group)}
                    style={{
                      padding: '8px 12px',
                      background: '#f44336',
                      color: 'white',
                      border: 'none',
                      borderRadius: 6,
                      cursor: 'pointer',
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Vista de opciones */}
      {view === 'options' && selectedGroup && (
        <div>
          <div style={{
            background: '#e3f2fd',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
          }}>
            <strong>Límites:</strong>{' '}
            {selectedGroup.minSelections > 0 
              ? `Mínimo ${selectedGroup.minSelections} selección(es)` 
              : 'Sin mínimo (opcional)'
            }
            {selectedGroup.maxSelections 
              ? ` | Máximo ${selectedGroup.maxSelections} selección(es)` 
              : ' | Sin límite máximo'
            }
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 12 
          }}>
            {(selectedGroup.options || []).length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                padding: 40,
                textAlign: 'center',
                background: '#f5f5f5',
                borderRadius: 12,
                color: '#666',
              }}>
                <p>No hay opciones en este grupo</p>
                <p>Agregá opciones como ingredientes o aderezos</p>
              </div>
            ) : (
              selectedGroup.options.map(option => (
                <div
                  key={option.id}
                  style={{
                    background: option.paused ? '#fff8e1' : option.active ? 'white' : '#f9f9f9',
                    border: option.paused ? '2px solid #ff9800' : '1px solid #ddd',
                    borderRadius: 12,
                    overflow: 'hidden',
                    opacity: option.active ? 1 : 0.6,
                  }}
                >
                  {option.imageUrl && (
                    <div style={{
                      height: 100,
                      background: `url(${option.imageUrl}) center/cover`,
                      position: 'relative',
                    }}>
                      {option.paused && (
                        <div style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: '#ff9800',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 'bold',
                        }}>
                          ⏸️ PAUSADO
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <h4 style={{ margin: 0, flex: 1 }}>{option.name}</h4>
                      {option.paused && !option.imageUrl && (
                        <span style={{
                          background: '#ff9800',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 'bold',
                        }}>
                          ⏸️
                        </span>
                      )}
                    </div>
                    <p style={{ 
                      margin: '4px 0 8px', 
                      color: option.price > 0 ? '#4CAF50' : '#888',
                      fontWeight: option.price > 0 ? 'bold' : 'normal',
                    }}>
                      {option.price > 0 ? `+$${option.price}` : 'Sin cargo'}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => toggleOptionPause(option)}
                        title={option.paused ? 'Reanudar opción' : 'Pausar opción'}
                        style={{
                          padding: '6px 10px',
                          background: option.paused ? '#4CAF50' : '#ff9800',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        {option.paused ? '▶️' : '⏸️'}
                      </button>
                      <button
                        onClick={() => openOptionForm(option)}
                        style={{
                          flex: 1,
                          padding: '6px',
                          background: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => deleteOption(option)}
                        style={{
                          padding: '6px 10px',
                          background: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          cursor: 'pointer',
                          fontSize: 12,
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal formulario de grupo */}
      {groupFormOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400,
          }}>
            <h3 style={{ marginTop: 0 }}>
              {editingGroup ? 'Editar Grupo' : 'Nuevo Grupo'}
            </h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
                Nombre *
              </label>
              <input
                type="text"
                value={formGroupName}
                onChange={e => setFormGroupName(e.target.value)}
                placeholder="Ej: Aderezos, Ingredientes..."
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 16,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
                Descripción
              </label>
              <input
                type="text"
                value={formGroupDesc}
                onChange={e => setFormGroupDesc(e.target.value)}
                placeholder="Descripción opcional"
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 16,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
                  Mín. selecciones
                </label>
                <input
                  type="number"
                  min="0"
                  value={formMinSel}
                  onChange={e => setFormMinSel(parseInt(e.target.value) || 0)}
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: 16,
                    boxSizing: 'border-box',
                  }}
                />
                <small style={{ color: '#888' }}>0 = opcional</small>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
                  Máx. selecciones
                </label>
                <input
                  type="number"
                  min="1"
                  value={formMaxSel}
                  onChange={e => setFormMaxSel(e.target.value === '' ? '' : parseInt(e.target.value))}
                  placeholder="Sin límite"
                  style={{
                    width: '100%',
                    padding: 12,
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: 16,
                    boxSizing: 'border-box',
                  }}
                />
                <small style={{ color: '#888' }}>Vacío = sin límite</small>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={closeGroupForm}
                style={{
                  flex: 1,
                  padding: 12,
                  background: '#eee',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={saveGroup}
                disabled={saving || !formGroupName.trim()}
                style={{
                  flex: 1,
                  padding: 12,
                  background: saving ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal formulario de opción */}
      {optionFormOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400,
          }}>
            <h3 style={{ marginTop: 0 }}>
              {editingOption ? 'Editar Opción' : 'Nueva Opción'}
            </h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
                Nombre *
              </label>
              <input
                type="text"
                value={formOptionName}
                onChange={e => setFormOptionName(e.target.value)}
                placeholder="Ej: Ketchup, Tocino..."
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 16,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
                Precio adicional ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formOptionPrice}
                onChange={e => setFormOptionPrice(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: 12,
                  border: '1px solid #ddd',
                  borderRadius: 8,
                  fontSize: 16,
                  boxSizing: 'border-box',
                }}
              />
              <small style={{ color: '#888' }}>0 = sin cargo adicional</small>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 'bold' }}>
                Imagen
              </label>
              {formOptionImage && (
                <div style={{ marginBottom: 8, position: 'relative' }}>
                  <img
                    src={formOptionImage}
                    alt="Preview"
                    style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }}
                  />
                  <button
                    onClick={() => setFormOptionImage('')}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: 24,
                      height: 24,
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleOptionImageUpload}
                disabled={uploadingImage}
                style={{ width: '100%' }}
              />
              {uploadingImage && <small>Subiendo imagen...</small>}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={closeOptionForm}
                style={{
                  flex: 1,
                  padding: 12,
                  background: '#eee',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={saveOption}
                disabled={saving || !formOptionName.trim()}
                style={{
                  flex: 1,
                  padding: 12,
                  background: saving ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: 16,
                  fontWeight: 'bold',
                }}
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
