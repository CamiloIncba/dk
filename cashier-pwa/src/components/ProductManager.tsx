import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { ProductWithCategory, CategoryWithCount, ExtraGroup } from '../api/client';

type ViewMode = 'products' | 'categories';

interface ProductManagerProps {
  onBack?: () => void;
}

export function ProductManager({ onBack }: ProductManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('products');
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCategory, setFormCategory] = useState<number | null>(null);
  const [formActive, setFormActive] = useState(true);
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Extra groups - ahora con opciones personalizadas
  const [allExtraGroups, setAllExtraGroups] = useState<ExtraGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<{
    groupId: number;
    maxSelections?: number | null;
    customOptions?: { optionId: number; priceOverride: number | null }[];
    useCustomOptions: boolean; // true = usar solo opciones seleccionadas, false = usar todas
  }[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null); // Grupo expandido para ver opciones
  
  // Para agregar opciones rápidas
  const [quickAddGroupId, setQuickAddGroupId] = useState<number | null>(null);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddPrice, setQuickAddPrice] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats, groups] = await Promise.all([
        api.getProducts(),
        api.getCategories(),
        api.getExtraGroups(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setAllExtraGroups(groups.filter(g => g.active));
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // === Productos ===
  const startEditProduct = async (product: ProductWithCategory) => {
    setEditing(product.id);
    setFormName(product.name);
    setFormPrice(String(parseInt(product.price)));
    setFormCategory(product.categoryId);
    setFormActive(product.active);
    setFormDescription(product.description || '');
    setFormImageUrl(product.imageUrl || '');
    setCreating(false);
    setExpandedGroupId(null);
    
    // Cargar grupos de extras vinculados
    setLoadingExtras(true);
    try {
      const productExtras = await api.getProductExtrasAdmin(product.id);
      setSelectedGroups(productExtras.map(pe => ({
        groupId: pe.groupId,
        maxSelections: pe.maxSelections ?? null,
        useCustomOptions: pe.customOptions && pe.customOptions.length > 0,
        customOptions: pe.customOptions?.map(co => ({
          optionId: co.optionId,
          priceOverride: co.priceOverride,
        })) || [],
      })));
    } catch (err) {
      console.error('Error cargando extras:', err);
      setSelectedGroups([]);
    } finally {
      setLoadingExtras(false);
    }
  };

  const startCreateProduct = () => {
    setCreating(true);
    setEditing(null);
    setFormName('');
    setFormPrice('');
    setFormCategory(categories[0]?.id || null);
    setFormActive(true);
    setFormDescription('');
    setFormImageUrl('');
    setSelectedGroups([]);
    setExpandedGroupId(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setCreating(false);
    setSelectedGroups([]);
    setExpandedGroupId(null);
  };

  const saveProduct = async () => {
    if (!formName || !formPrice || !formCategory) {
      alert('Complete todos los campos');
      return;
    }

    try {
      let productId: number;
      
      if (creating) {
        const newProduct = await api.createProduct({
          name: formName,
          price: parseInt(formPrice),
          categoryId: formCategory,
          description: formDescription || undefined,
          imageUrl: formImageUrl || undefined,
        });
        productId = newProduct.id;
      } else if (editing) {
        await api.updateProduct(editing, {
          name: formName,
          price: parseInt(formPrice),
          categoryId: formCategory,
          active: formActive,
          description: formDescription || undefined,
          imageUrl: formImageUrl || undefined,
        });
        productId = editing;
      } else {
        return;
      }
      
      // Guardar grupos de extras vinculados (con opciones personalizadas)
      const groupsToSave = selectedGroups.map(g => ({
        groupId: g.groupId,
        maxSelections: g.maxSelections,
        customOptions: g.useCustomOptions ? g.customOptions : undefined,
      }));
      await api.setProductExtras(productId, groupsToSave);
      
      cancelEdit();
      loadData();
    } catch (err) {
      alert('Error guardando producto');
    }
  };

  const toggleExtraGroup = (groupId: number) => {
    setSelectedGroups(prev => {
      const exists = prev.find(g => g.groupId === groupId);
      if (exists) {
        // Si estaba expandido, cerrarlo
        if (expandedGroupId === groupId) {
          setExpandedGroupId(null);
        }
        return prev.filter(g => g.groupId !== groupId);
      } else {
        return [...prev, { groupId, maxSelections: null, useCustomOptions: false, customOptions: [] }];
      }
    });
  };

  const updateGroupMaxSelections = (groupId: number, max: number | null) => {
    setSelectedGroups(prev => 
      prev.map(g => g.groupId === groupId ? { ...g, maxSelections: max } : g)
    );
  };

  const isGroupSelected = (groupId: number) => {
    return selectedGroups.some(g => g.groupId === groupId);
  };

  const getGroupMaxSelections = (groupId: number) => {
    return selectedGroups.find(g => g.groupId === groupId)?.maxSelections ?? null;
  };

  const getGroupConfig = (groupId: number) => {
    return selectedGroups.find(g => g.groupId === groupId);
  };

  const toggleUseCustomOptions = (groupId: number) => {
    setSelectedGroups(prev =>
      prev.map(g => {
        if (g.groupId === groupId) {
          // Si activamos custom options, inicializar con todas las opciones del grupo
          const group = allExtraGroups.find(eg => eg.id === groupId);
          if (!g.useCustomOptions && group) {
            return {
              ...g,
              useCustomOptions: true,
              customOptions: group.options.map(opt => ({
                optionId: opt.id,
                priceOverride: null, // null = precio default
              })),
            };
          }
          return { ...g, useCustomOptions: !g.useCustomOptions };
        }
        return g;
      })
    );
  };

  const toggleOptionInGroup = (groupId: number, optionId: number) => {
    setSelectedGroups(prev =>
      prev.map(g => {
        if (g.groupId === groupId && g.customOptions) {
          const exists = g.customOptions.find(o => o.optionId === optionId);
          if (exists) {
            return {
              ...g,
              customOptions: g.customOptions.filter(o => o.optionId !== optionId),
            };
          } else {
            return {
              ...g,
              customOptions: [...g.customOptions, { optionId, priceOverride: null }],
            };
          }
        }
        return g;
      })
    );
  };

  const updateOptionPrice = (groupId: number, optionId: number, price: number | null) => {
    setSelectedGroups(prev =>
      prev.map(g => {
        if (g.groupId === groupId && g.customOptions) {
          return {
            ...g,
            customOptions: g.customOptions.map(o =>
              o.optionId === optionId ? { ...o, priceOverride: price } : o
            ),
          };
        }
        return g;
      })
    );
  };

  const isOptionSelectedInGroup = (groupId: number, optionId: number) => {
    const group = selectedGroups.find(g => g.groupId === groupId);
    if (!group?.useCustomOptions) return true; // Todas seleccionadas por defecto
    return group.customOptions?.some(o => o.optionId === optionId) ?? false;
  };

  const getOptionPriceOverride = (groupId: number, optionId: number) => {
    const group = selectedGroups.find(g => g.groupId === groupId);
    return group?.customOptions?.find(o => o.optionId === optionId)?.priceOverride ?? null;
  };

  const handleQuickAddOption = async (groupId: number) => {
    if (!quickAddName.trim()) {
      alert('Ingrese un nombre para la opción');
      return;
    }

    setQuickAddLoading(true);
    try {
      // Crear la opción en el backend
      const newOption = await api.createExtraOption(groupId, {
        name: quickAddName.trim(),
        price: quickAddPrice ? parseFloat(quickAddPrice) : 0,
      });

      // Actualizar la lista de grupos con la nueva opción
      setAllExtraGroups(prev =>
        prev.map(g => {
          if (g.id === groupId) {
            return { ...g, options: [...g.options, newOption] };
          }
          return g;
        })
      );

      // Si estamos usando opciones personalizadas, agregar la nueva opción como seleccionada
      setSelectedGroups(prev =>
        prev.map(g => {
          if (g.groupId === groupId && g.useCustomOptions && g.customOptions) {
            return {
              ...g,
              customOptions: [...g.customOptions, { optionId: newOption.id, priceOverride: null }],
            };
          }
          return g;
        })
      );

      // Limpiar el formulario
      setQuickAddName('');
      setQuickAddPrice('');
      setQuickAddGroupId(null);
    } catch (err) {
      alert('Error creando la opción');
      console.error(err);
    } finally {
      setQuickAddLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo y tamaño
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten imágenes');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar 5MB');
      return;
    }

    setUploading(true);
    try {
      const url = await api.uploadImage(file);
      setFormImageUrl(url);
    } catch (err) {
      alert('Error subiendo imagen');
    } finally {
      setUploading(false);
    }
  };

  const toggleProductActive = async (product: ProductWithCategory) => {
    try {
      await api.updateProduct(product.id, { active: !product.active });
      loadData();
    } catch (err) {
      alert('Error actualizando producto');
    }
  };

  // === Categorías ===
  const startEditCategory = (cat: CategoryWithCount) => {
    setEditing(cat.id);
    setFormName(cat.name);
    setFormActive(cat.active);
    setCreating(false);
  };

  const startCreateCategory = () => {
    setCreating(true);
    setEditing(null);
    setFormName('');
    setFormActive(true);
  };

  const saveCategory = async () => {
    if (!formName) {
      alert('Ingrese un nombre');
      return;
    }

    try {
      if (creating) {
        await api.createCategory({ name: formName });
      } else if (editing) {
        await api.updateCategory(editing, { name: formName, active: formActive });
      }
      cancelEdit();
      loadData();
    } catch (err) {
      alert('Error guardando categoría');
    }
  };

  const toggleCategoryActive = async (cat: CategoryWithCount) => {
    try {
      await api.updateCategory(cat.id, { active: !cat.active });
      loadData();
    } catch (err) {
      alert('Error actualizando categoría');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Cargando...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header con botón volver */}
      {onBack && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <button
            onClick={onBack}
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
          <h2 style={{ margin: 0, fontSize: 18 }}>📦 Productos y Categorías</h2>
        </div>
      )}

      {/* Toggle Productos / Categorías */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => { setViewMode('products'); cancelEdit(); }}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: viewMode === 'products' ? '#6366f1' : '#e5e7eb',
            color: viewMode === 'products' ? '#fff' : '#374151',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          📦 Productos ({products.length})
        </button>
        <button
          onClick={() => { setViewMode('categories'); cancelEdit(); }}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: viewMode === 'categories' ? '#6366f1' : '#e5e7eb',
            color: viewMode === 'categories' ? '#fff' : '#374151',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          🏷️ Categorías ({categories.length})
        </button>
      </div>

      {/* Botón Agregar */}
      <button
        onClick={viewMode === 'products' ? startCreateProduct : startCreateCategory}
        style={{
          padding: '12px',
          backgroundColor: '#22c55e',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '16px',
        }}
      >
        ➕ Agregar {viewMode === 'products' ? 'Producto' : 'Categoría'}
      </button>

      {/* Formulario de edición/creación */}
      {(editing || creating) && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f3f4f6',
          borderRadius: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>
            {creating ? 'Nuevo' : 'Editar'} {viewMode === 'products' ? 'Producto' : 'Categoría'}
          </h3>
          
          <input
            type="text"
            placeholder="Nombre"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            style={{
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
            }}
          />

          {viewMode === 'products' && (
            <>
              <input
                type="number"
                placeholder="Precio"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                style={{
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              />
              <select
                value={formCategory || ''}
                onChange={(e) => setFormCategory(parseInt(e.target.value))}
                style={{
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              >
                <option value="">Seleccionar categoría</option>
                {categories.filter(c => c.active).map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              
              {/* Detalles/Descripción */}
              <textarea
                placeholder="Detalles del producto (ingredientes, descripción, etc.)"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={3}
                style={{
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />

              {/* Imagen */}
              <div style={{ 
                border: '1px dashed #d1d5db', 
                borderRadius: '8px', 
                padding: '12px',
                backgroundColor: '#fff',
              }}>
                <div style={{ marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                  📷 Imagen del producto
                </div>
                {formImageUrl && (
                  <div style={{ marginBottom: '8px', position: 'relative' }}>
                    <img 
                      src={formImageUrl} 
                      alt="Preview" 
                      style={{ 
                        width: '100%', 
                        maxHeight: '120px', 
                        objectFit: 'cover',
                        borderRadius: '6px',
                      }} 
                    />
                    <button
                      onClick={() => setFormImageUrl('')}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        backgroundColor: '#dc2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  style={{ fontSize: '14px' }}
                />
                {uploading && <div style={{ marginTop: '4px', color: '#3b82f6' }}>Subiendo...</div>}
              </div>

              {/* Grupos de Extras */}
              <div style={{ 
                border: '1px solid #d1d5db', 
                borderRadius: '8px', 
                padding: '12px',
                backgroundColor: '#fff',
              }}>
                <div style={{ marginBottom: '10px', fontSize: '14px', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>🧩 Extras / Ingredientes</span>
                  {loadingExtras && <span style={{ fontSize: '12px' }}>Cargando...</span>}
                </div>
                
                {allExtraGroups.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#9ca3af', fontStyle: 'italic' }}>
                    No hay grupos de extras creados. Créalos desde Ajustes → Extras.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {allExtraGroups.map(group => {
                      const selected = isGroupSelected(group.id);
                      const currentMax = getGroupMaxSelections(group.id);
                      const groupConfig = getGroupConfig(group.id);
                      const isExpanded = expandedGroupId === group.id;
                      
                      return (
                        <div 
                          key={group.id}
                          style={{ 
                            padding: '12px',
                            backgroundColor: selected ? '#eef2ff' : '#f9fafb',
                            borderRadius: '8px',
                            border: selected ? '2px solid #6366f1' : '1px solid #e5e7eb',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleExtraGroup(group.id)}
                              disabled={loadingExtras}
                              style={{ width: '18px', height: '18px', accentColor: '#6366f1' }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500, fontSize: '14px' }}>{group.name}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                {group.options.length} opciones • 
                                {group.minSelections > 0 ? ` Mín: ${group.minSelections}` : ' Opcional'}
                                {group.maxSelections ? ` • Máx grupo: ${group.maxSelections}` : ''}
                              </div>
                            </div>
                          </label>
                          
                          {/* Configuración del grupo - solo visible si está seleccionado */}
                          {selected && (
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #c7d2fe' }}>
                              {/* Máximo para este producto */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                <label style={{ fontSize: '13px', color: '#4b5563', whiteSpace: 'nowrap' }}>
                                  Máx. selecciones:
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Sin límite"
                                  value={currentMax ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    updateGroupMaxSelections(group.id, val === '' ? null : parseInt(val));
                                  }}
                                  style={{
                                    width: '70px',
                                    padding: '5px 8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    textAlign: 'center',
                                  }}
                                />
                              </div>

                              {/* Toggle para personalizar opciones */}
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'space-between',
                                padding: '8px',
                                backgroundColor: groupConfig?.useCustomOptions ? '#fef3c7' : '#f3f4f6',
                                borderRadius: '6px',
                                marginBottom: groupConfig?.useCustomOptions ? '10px' : '0',
                              }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                                  <input
                                    type="checkbox"
                                    checked={groupConfig?.useCustomOptions || false}
                                    onChange={() => toggleUseCustomOptions(group.id)}
                                    style={{ accentColor: '#f59e0b' }}
                                  />
                                  <span>Personalizar opciones y precios</span>
                                </label>
                                {groupConfig?.useCustomOptions && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '12px',
                                      backgroundColor: '#6366f1',
                                      color: '#fff',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {isExpanded ? '▲ Cerrar' : '▼ Configurar'}
                                  </button>
                                )}
                              </div>

                              {/* Lista de opciones personalizables */}
                              {groupConfig?.useCustomOptions && isExpanded && (
                                <div style={{ 
                                  display: 'flex', 
                                  flexDirection: 'column', 
                                  gap: '6px',
                                  maxHeight: '250px',
                                  overflowY: 'auto',
                                  padding: '8px',
                                  backgroundColor: '#fefce8',
                                  borderRadius: '6px',
                                  border: '1px solid #fde68a',
                                }}>
                                  <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px' }}>
                                    ✓ = disponible | Precio vacío = usa precio original | 0 = gratis
                                  </div>
                                  {group.options.map(option => {
                                    const isSelected = isOptionSelectedInGroup(group.id, option.id);
                                    const priceOverride = getOptionPriceOverride(group.id, option.id);
                                    const originalPrice = parseFloat(String(option.price));
                                    
                                    return (
                                      <div 
                                        key={option.id}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          padding: '8px',
                                          backgroundColor: isSelected ? '#fff' : '#fef9c3',
                                          borderRadius: '6px',
                                          border: isSelected ? '1px solid #22c55e' : '1px solid #fde68a',
                                          opacity: isSelected ? 1 : 0.6,
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleOptionInGroup(group.id, option.id)}
                                          style={{ accentColor: '#22c55e' }}
                                        />
                                        <span style={{ flex: 1, fontSize: '13px', fontWeight: isSelected ? 500 : 400 }}>
                                          {option.name}
                                          <span style={{ color: '#6b7280', marginLeft: '6px' }}>
                                            (${originalPrice})
                                          </span>
                                        </span>
                                        {isSelected && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ fontSize: '12px', color: '#4b5563' }}>$</span>
                                            <input
                                              type="number"
                                              min="0"
                                              placeholder="orig."
                                              value={priceOverride ?? ''}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                updateOptionPrice(
                                                  group.id, 
                                                  option.id, 
                                                  val === '' ? null : parseFloat(val)
                                                );
                                              }}
                                              style={{
                                                width: '60px',
                                                padding: '4px 6px',
                                                border: '1px solid #d1d5db',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                textAlign: 'center',
                                              }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}

                                  {/* Formulario para agregar opción rápida */}
                                  {quickAddGroupId === group.id ? (
                                    <div style={{
                                      display: 'flex',
                                      gap: '6px',
                                      padding: '10px',
                                      backgroundColor: '#ecfdf5',
                                      borderRadius: '6px',
                                      border: '1px solid #6ee7b7',
                                      marginTop: '6px',
                                    }}>
                                      <input
                                        type="text"
                                        placeholder="Nombre"
                                        value={quickAddName}
                                        onChange={(e) => setQuickAddName(e.target.value)}
                                        style={{
                                          flex: 1,
                                          padding: '6px 8px',
                                          border: '1px solid #d1d5db',
                                          borderRadius: '4px',
                                          fontSize: '13px',
                                        }}
                                        autoFocus
                                      />
                                      <input
                                        type="number"
                                        placeholder="$ Precio"
                                        value={quickAddPrice}
                                        onChange={(e) => setQuickAddPrice(e.target.value)}
                                        style={{
                                          width: '70px',
                                          padding: '6px 8px',
                                          border: '1px solid #d1d5db',
                                          borderRadius: '4px',
                                          fontSize: '13px',
                                          textAlign: 'center',
                                        }}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAddOption(group.id)}
                                        disabled={quickAddLoading}
                                        style={{
                                          padding: '6px 12px',
                                          backgroundColor: '#22c55e',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '12px',
                                          cursor: quickAddLoading ? 'wait' : 'pointer',
                                          opacity: quickAddLoading ? 0.7 : 1,
                                        }}
                                      >
                                        {quickAddLoading ? '...' : '✓'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setQuickAddGroupId(null);
                                          setQuickAddName('');
                                          setQuickAddPrice('');
                                        }}
                                        style={{
                                          padding: '6px 10px',
                                          backgroundColor: '#6b7280',
                                          color: '#fff',
                                          border: 'none',
                                          borderRadius: '4px',
                                          fontSize: '12px',
                                          cursor: 'pointer',
                                        }}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setQuickAddGroupId(group.id)}
                                      style={{
                                        marginTop: '6px',
                                        padding: '8px',
                                        width: '100%',
                                        backgroundColor: '#d1fae5',
                                        color: '#059669',
                                        border: '1px dashed #6ee7b7',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                      }}
                                    >
                                      ➕ Agregar opción al grupo
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {!creating && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                style={{ width: '20px', height: '20px' }}
              />
              <span>Activo</span>
            </label>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={viewMode === 'products' ? saveProduct : saveCategory}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              💾 Guardar
            </button>
            <button
              onClick={cancelEdit}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#6b7280',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ✖ Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de productos */}
      {viewMode === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {products.map((product) => (
            <div
              key={product.id}
              style={{
                padding: '12px',
                backgroundColor: product.active ? '#fff' : '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: product.active ? 1 : 0.6,
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                  {product.name}
                  {!product.active && <span style={{ color: '#dc2626', marginLeft: '8px' }}>⏸ Inactivo</span>}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  {product.category?.name} • {formatPrice(parseInt(product.price))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => toggleProductActive(product)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: product.active ? '#fef3c7' : '#dcfce7',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {product.active ? '⏸' : '▶️'}
                </button>
                <button
                  onClick={() => startEditProduct(product)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#e0e7ff',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ✏️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lista de categorías */}
      {viewMode === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categories.map((cat) => (
            <div
              key={cat.id}
              style={{
                padding: '12px',
                backgroundColor: cat.active ? '#fff' : '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                opacity: cat.active ? 1 : 0.6,
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '15px' }}>
                  {cat.name}
                  {!cat.active && <span style={{ color: '#dc2626', marginLeft: '8px' }}>⏸ Inactivo</span>}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>
                  {cat._count?.products || 0} productos
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => toggleCategoryActive(cat)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: cat.active ? '#fef3c7' : '#dcfce7',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {cat.active ? '⏸' : '▶️'}
                </button>
                <button
                  onClick={() => startEditCategory(cat)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#e0e7ff',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ✏️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
