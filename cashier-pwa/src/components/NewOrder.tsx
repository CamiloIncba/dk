import { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import type { Category, MenuItem, CartItem, CartItemExtra } from '../types';
import { ExtrasModal } from './ExtrasModal';
import { PaymentModal } from './PaymentModal';

interface NewOrderProps {
  onOrderCreated: () => void;
}

export function NewOrder({ onOrderCreated }: NewOrderProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  // Nuevo carrito que soporta extras
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Modal de extras
  const [extrasModalProduct, setExtrasModalProduct] = useState<MenuItem | null>(null);
  
  // Modal de pago
  const [paymentOrderId, setPaymentOrderId] = useState<number | null>(null);
  const [paymentTotal, setPaymentTotal] = useState<number>(0);
  const [paymentCart, setPaymentCart] = useState<CartItem[]>([]);
  
  // Cache de productos con extras
  const [productsWithExtras, setProductsWithExtras] = useState<Set<number>>(new Set());

  // Productos flat para búsqueda
  const allProducts = useMemo(() => 
    categories.flatMap(cat => cat.products), 
    [categories]
  );

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const data = await api.getMenu();
      setCategories(data.categories || []);
      if (data.categories && data.categories.length > 0) {
        setSelectedCategory(data.categories[0].id);
        // Cargar info de extras para cada producto
        checkProductsWithExtras(data.categories.flatMap(c => c.products));
      }
    } catch (err) {
      console.error('Error cargando menú:', err);
    } finally {
      setLoading(false);
    }
  };

  // Verificar qué productos tienen extras configurados
  const checkProductsWithExtras = async (products: MenuItem[]) => {
    const withExtras = new Set<number>();
    
    // Verificar en paralelo pero limitado
    const batchSize = 5;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (p) => {
          try {
            const extras = await api.getProductExtras(p.id);
            return { id: p.id, hasExtras: extras.length > 0 };
          } catch {
            return { id: p.id, hasExtras: false };
          }
        })
      );
      results.forEach(r => {
        if (r.hasExtras) withExtras.add(r.id);
      });
    }
    
    setProductsWithExtras(withExtras);
  };

  const currentProducts = selectedCategory 
    ? categories.find(c => c.id === selectedCategory)?.products || []
    : allProducts;

  const handleProductClick = async (product: MenuItem) => {
    // Si el producto tiene extras, mostrar modal
    if (productsWithExtras.has(product.id)) {
      setExtrasModalProduct(product);
    } else {
      // Si no tiene extras, agregar directo al carrito
      addToCartSimple(product.id);
    }
  };

  // Agregar producto sin extras
  const addToCartSimple = (productId: number) => {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const cartKey = `${productId}-noextras`;
    
    setCart(prev => {
      const existing = prev.find(item => item.cartKey === cartKey);
      if (existing) {
        return prev.map(item => 
          item.cartKey === cartKey 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        productId,
        productName: product.name,
        productPrice: parseInt(product.price),
        quantity: 1,
        extras: [],
        cartKey,
      }];
    });
  };

  // Agregar producto con extras desde el modal
  const addToCartWithExtras = (extras: CartItemExtra[]) => {
    if (!extrasModalProduct) return;
    
    const product = extrasModalProduct;
    // Generar key único basado en extras seleccionados
    const extrasKey = extras.map(e => `${e.optionId}:${e.quantity}`).sort().join(',');
    const cartKey = `${product.id}-${extrasKey || 'noextras'}`;

    setCart(prev => {
      const existing = prev.find(item => item.cartKey === cartKey);
      if (existing) {
        return prev.map(item => 
          item.cartKey === cartKey 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        productId: product.id,
        productName: product.name,
        productPrice: parseInt(product.price),
        quantity: 1,
        extras,
        cartKey,
      }];
    });

    setExtrasModalProduct(null);
  };

  const removeFromCart = (cartKey: string) => {
    setCart(prev => {
      const item = prev.find(i => i.cartKey === cartKey);
      if (!item) return prev;
      
      if (item.quantity <= 1) {
        return prev.filter(i => i.cartKey !== cartKey);
      }
      return prev.map(i => 
        i.cartKey === cartKey 
          ? { ...i, quantity: i.quantity - 1 }
          : i
      );
    });
  };

  const getItemTotal = (item: CartItem): number => {
    const extrasTotal = item.extras.reduce((sum, e) => sum + e.price * e.quantity, 0);
    return (item.productPrice + extrasTotal) * item.quantity;
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + getItemTotal(item), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      // Crear la orden primero
      const order = await api.createOrderFromCart(cart);
      
      // Guardar datos para el modal de pago
      setPaymentOrderId(order.id);
      setPaymentTotal(getTotal());
      setPaymentCart([...cart]); // Copia del carrito para impresión
      
    } catch (err) {
      alert('Error al crear pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = () => {
    setPaymentOrderId(null);
    setPaymentTotal(0);
    setPaymentCart([]);
    setCart([]);
    onOrderCreated();
  };

  const handlePaymentClose = () => {
    // Si cierra el modal sin pagar, la orden queda pendiente
    // El usuario puede ir a "Órdenes" para cobrarla después
    setPaymentOrderId(null);
    setPaymentTotal(0);
    setPaymentCart([]);
    setCart([]);
    onOrderCreated();
  };

  // Contar cantidad total de un producto en el carrito (sumando todas las variantes)
  const getProductQtyInCart = (productId: number): number => {
    return cart
      .filter(item => item.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px' }}>Cargando menú...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
      {/* Tabs de categorías */}
      {categories.length > 1 && (
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          overflowX: 'auto',
          paddingBottom: '8px',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '8px',
        }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '20px',
                backgroundColor: selectedCategory === cat.id ? '#3b82f6' : '#e5e7eb',
                color: selectedCategory === cat.id ? '#fff' : '#374151',
                cursor: 'pointer',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                fontSize: '14px',
              }}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Grid de productos */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
        padding: '10px 0',
        alignContent: 'start',
      }}>
        {currentProducts.map(product => {
          const qty = getProductQtyInCart(product.id);
          const hasExtras = productsWithExtras.has(product.id);
          
          return (
            <button
              key={product.id}
              onClick={() => handleProductClick(product)}
              style={{
                aspectRatio: '1',
                padding: '10px',
                border: qty > 0 ? '3px solid #3b82f6' : '2px solid #e5e7eb',
                borderRadius: '12px',
                backgroundColor: qty > 0 ? '#eff6ff' : '#fff',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                position: 'relative',
                boxShadow: qty > 0 ? '0 2px 8px rgba(59,130,246,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.15s ease',
              }}
            >
              {qty > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}>
                  {qty}
                </span>
              )}
              {hasExtras && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  left: '-6px',
                  backgroundColor: '#f59e0b',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                }}>
                  ⚙
                </span>
              )}
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                textAlign: 'center', 
                lineHeight: 1.2,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-word',
              }}>
                {product.name}
              </span>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#22c55e' }}>
                {formatPrice(parseInt(product.price))}
              </span>
            </button>
          );
        })}
      </div>

      {/* Resumen del carrito */}
      <div style={{
        borderTop: '2px solid #e5e7eb',
        padding: '12px 0',
        backgroundColor: '#f9fafb',
        marginLeft: '-16px',
        marginRight: '-16px',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}>
        {cart.length > 0 ? (
          <>
            <div style={{ maxHeight: '120px', overflow: 'auto', marginBottom: '8px' }}>
              {cart.map((item) => (
                <div key={item.cartKey} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  fontSize: '14px',
                  padding: '6px 0',
                  borderBottom: '1px solid #f3f4f6',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>
                      {item.quantity}x {item.productName}
                    </div>
                    {item.extras.length > 0 && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6b7280',
                        marginTop: '2px',
                      }}>
                        + {item.extras.map(e => e.name).join(', ')}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '500' }}>
                      {formatPrice(getItemTotal(item))}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.cartKey)}
                      style={{
                        width: '28px',
                        height: '28px',
                        border: 'none',
                        borderRadius: '50%',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: '16px',
                        flexShrink: 0,
                      }}
                    >
                      −
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderTop: '1px solid #e5e7eb',
              paddingTop: '8px',
              marginBottom: '8px',
            }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                TOTAL ({getTotalItems()} items)
              </span>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
                {formatPrice(getTotal())}
              </span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: submitting ? '#9ca3af' : '#22c55e',
                color: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: submitting ? 'default' : 'pointer',
              }}
            >
              {submitting ? 'Procesando...' : '💵 COBRAR'}
            </button>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '20px' }}>
            Toca un producto para agregarlo
          </div>
        )}
      </div>

      {/* Modal de extras */}
      {extrasModalProduct && (
        <ExtrasModal
          product={extrasModalProduct}
          onConfirm={addToCartWithExtras}
          onCancel={() => setExtrasModalProduct(null)}
        />
      )}

      {/* Modal de pago */}
      <PaymentModal
        isOpen={paymentOrderId !== null}
        orderId={paymentOrderId || 0}
        total={paymentTotal}
        cart={paymentCart}
        onClose={handlePaymentClose}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
