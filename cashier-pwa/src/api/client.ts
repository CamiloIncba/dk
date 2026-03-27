import type { Order, MenuResponse, MenuItem, Category, CartItem } from '../types';
import { getBackendUrl } from '../hooks/useBackendConfig';

const API_KEY = import.meta.env.VITE_API_KEY || 'kiosko-norpan-2025-secret';

function getBaseUrl(): string {
  return getBackendUrl();
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(`${getBaseUrl()}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': API_KEY,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Fetch sin autenticación (endpoints públicos)
async function fetchPublic(url: string) {
  const response = await fetch(`${getBaseUrl()}${url}`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}

export interface ProductWithCategory extends MenuItem {
  category: Category;
}

export interface CategoryWithCount extends Category {
  _count: { products: number };
}

// Tipos para extras
export interface ExtraOption {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  active: boolean;
  paused: boolean;
  position: number;
  groupId: number;
}

export interface ExtraGroup {
  id: number;
  name: string;
  description?: string;
  minSelections: number;
  maxSelections?: number;
  active: boolean;
  paused: boolean;
  position: number;
  options: ExtraOption[];
  _count?: { products: number };
}

// Opción personalizada a nivel de producto
export interface ProductCustomOption {
  id: number;
  productExtraGroupId: number;
  optionId: number;
  priceOverride: number | null; // null = usa precio default, 0 = gratis
  option: ExtraOption;
}

export interface ProductExtraGroup {
  id: number;
  productId: number;
  groupId: number;
  position: number;
  maxSelections?: number; // Máximo para este producto específico
  group: ExtraGroup;
  customOptions: ProductCustomOption[]; // Opciones personalizadas (si vacío, usa todas del grupo)
}

// Movimiento de Mercado Pago para auditoría
export interface MPMovement {
  id: number;
  mpPaymentId: string;
  status: string;
  statusDetail?: string;
  paymentType?: string;
  paymentMethod?: string;
  transactionAmount?: number;
  isManual: boolean;
  manualReason?: string;
  manualApprovedBy?: string;
  manualNotes?: string;
  origin: string;
  createdAt: string;
  order?: {
    id: number;
    status: string;
    totalAmount: number;
    createdAt: string;
  };
}

// Razones de pago manual
export const MANUAL_PAYMENT_REASONS = {
  MP_VERIFIED: 'DINERO LLEGÓ A CUENTA MERCADO PAGO - VERIFICADO MANUALMENTE',
  TRANSFER: 'PAGO POR TRANSFERENCIA BANCARIA',
  CASH: 'PAGO EN EFECTIVO',
  OTHER_POS: 'PAGO CON OTRO POSNET',
  OTHER: 'OTRO MOTIVO',
} as const;

export type ManualPaymentReason = keyof typeof MANUAL_PAYMENT_REASONS;

export const api = {
  // Menú (público) - devuelve { categories: [...] }
  async getMenu(): Promise<MenuResponse> {
    return fetchPublic('/menu');
  },

  // Extras de un producto (público)
  async getProductExtras(productId: number): Promise<ProductExtraGroup[]> {
    return fetchPublic(`/menu/products/${productId}/extras`);
  },

  // Crear pedido (público) - ahora soporta extras
  async createOrder(items: { 
    productId: number; 
    quantity: number;
    extras?: { optionId: number; quantity?: number }[];
  }[]): Promise<Order> {
    const response = await fetch(`${getBaseUrl()}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!response.ok) throw new Error('Error creando pedido');
    return response.json();
  },

  // Obtener orden por ID (para verificar estado de pago)
  async getOrderById(orderId: number): Promise<Order> {
    return fetchPublic(`/orders/${orderId}`);
  },

  // Helper para convertir CartItem[] a formato de API
  createOrderFromCart(cart: CartItem[]): Promise<Order> {
    const items = cart.map(item => ({
      productId: item.productId,
      quantity: item.quantity,
      extras: item.extras.map(e => ({
        optionId: e.optionId,
        quantity: e.quantity,
      })),
    }));
    return this.createOrder(items);
  },

  // Pedidos activos (en preparación)
  async getActiveOrders(): Promise<Order[]> {
    return fetchWithAuth('/kitchen/orders');
  },

  // Pedidos listos
  async getReadyOrders(): Promise<Order[]> {
    return fetchWithAuth('/kitchen/orders/ready');
  },

  // Cambiar estado de cocina (usa endpoint admin)
  async updateKitchenStatus(orderId: number, status: string): Promise<Order> {
    return fetchWithAuth(`/admin/orders/${orderId}/kitchen-status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // Marcar pedido como pagado en efectivo (deprecated - usar markPaidManual)
  async markPaidCash(orderId: number): Promise<Order> {
    return fetchWithAuth(`/admin/orders/${orderId}/pay-cash`, {
      method: 'PATCH',
    });
  },

  // Razones de pago manual
  async getManualPaymentReasons(): Promise<Record<string, string>> {
    return fetchWithAuth('/admin/orders/manual-payment-reasons');
  },

  // Marcar pedido como pagado manualmente con justificación
  async markPaidManual(orderId: number, data: {
    reason: string;
    notes?: string;
    approvedBy?: string;
    source?: string;
  }): Promise<Order> {
    return fetchWithAuth(`/admin/orders/${orderId}/pay-manual`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Pedidos para auditoría (con info completa y filtros)
  async getOrdersForAudit(
    limit = 50,
    offset = 0,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
      status?: string;
      paymentMethod?: string;
      search?: string;
    },
  ): Promise<{
    orders: Order[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
    if (filters?.search) params.append('search', filters.search);
    return fetchWithAuth(`/admin/orders/audit?${params.toString()}`);
  },

  // Movimientos de Mercado Pago
  async getMPMovements(limit = 50, offset = 0): Promise<{
    payments: MPMovement[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return fetchWithAuth(`/admin/orders/mp-movements?limit=${limit}&offset=${offset}`);
  },

  // Pedidos recientes (admin)
  async getRecentOrders(limit = 20): Promise<Order[]> {
    return fetchWithAuth(`/admin/orders/recent?limit=${limit}`);
  },

  // === Admin Menu - Categorías ===
  async getCategories(): Promise<CategoryWithCount[]> {
    return fetchWithAuth('/admin/menu/categories');
  },

  async createCategory(data: { name: string; position?: number }): Promise<Category> {
    return fetchWithAuth('/admin/menu/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateCategory(id: number, data: { name?: string; position?: number; active?: boolean }): Promise<Category> {
    return fetchWithAuth(`/admin/menu/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteCategory(id: number): Promise<void> {
    return fetchWithAuth(`/admin/menu/categories/${id}`, { method: 'DELETE' });
  },

  // === Admin Menu - Productos ===
  async getProducts(): Promise<ProductWithCategory[]> {
    return fetchWithAuth('/admin/menu/products');
  },

  async createProduct(data: { 
    name: string; 
    price: number; 
    categoryId: number;
    description?: string;
    imageUrl?: string;
  }): Promise<ProductWithCategory> {
    return fetchWithAuth('/admin/menu/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateProduct(id: number, data: { 
    name?: string; 
    price?: number; 
    categoryId?: number;
    description?: string;
    imageUrl?: string;
    active?: boolean;
  }): Promise<ProductWithCategory> {
    return fetchWithAuth(`/admin/menu/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteProduct(id: number): Promise<void> {
    return fetchWithAuth(`/admin/menu/products/${id}`, { method: 'DELETE' });
  },

  // === Upload de imágenes ===
  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${getBaseUrl()}/admin/upload/image`, {
      method: 'POST',
      headers: {
        'X-API-KEY': API_KEY,
        // No poner Content-Type, el browser lo setea con boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Error subiendo imagen');
    }

    const data = await response.json();
    return data.url;
  },

  // === Extras - Grupos ===
  async getExtraGroups(): Promise<ExtraGroup[]> {
    return fetchWithAuth('/admin/extras/groups');
  },

  async createExtraGroup(data: { 
    name: string; 
    description?: string;
    minSelections?: number;
    maxSelections?: number;
  }): Promise<ExtraGroup> {
    return fetchWithAuth('/admin/extras/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateExtraGroup(id: number, data: { 
    name?: string; 
    description?: string;
    minSelections?: number;
    maxSelections?: number | null;
    active?: boolean;
  }): Promise<ExtraGroup> {
    return fetchWithAuth(`/admin/extras/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteExtraGroup(id: number): Promise<void> {
    return fetchWithAuth(`/admin/extras/groups/${id}`, { method: 'DELETE' });
  },

  async toggleExtraGroupPause(id: number): Promise<ExtraGroup> {
    return fetchWithAuth(`/admin/extras/groups/${id}/pause`, { method: 'PATCH' });
  },

  // === Extras - Opciones ===
  async createExtraOption(groupId: number, data: { 
    name: string; 
    price?: number;
    imageUrl?: string;
  }): Promise<ExtraOption> {
    return fetchWithAuth(`/admin/extras/groups/${groupId}/options`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateExtraOption(id: number, data: { 
    name?: string; 
    price?: number;
    imageUrl?: string;
    active?: boolean;
  }): Promise<ExtraOption> {
    return fetchWithAuth(`/admin/extras/options/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteExtraOption(id: number): Promise<void> {
    return fetchWithAuth(`/admin/extras/options/${id}`, { method: 'DELETE' });
  },

  async toggleExtraOptionPause(id: number): Promise<ExtraOption> {
    return fetchWithAuth(`/admin/extras/options/${id}/pause`, { method: 'PATCH' });
  },

  // === Extras - Vinculación con Productos (Admin) ===
  async getProductExtrasAdmin(productId: number): Promise<ProductExtraGroup[]> {
    return fetchWithAuth(`/admin/extras/products/${productId}`);
  },

  async setProductExtras(
    productId: number, 
    groups: { 
      groupId: number; 
      maxSelections?: number | null;
      customOptions?: { optionId: number; priceOverride?: number | null }[];
    }[]
  ): Promise<ProductExtraGroup[]> {
    return fetchWithAuth(`/admin/extras/products/${productId}`, {
      method: 'POST',
      body: JSON.stringify({ groups }),
    });
  },

  // ============================================================
  // Pagos Mercado Pago
  // ============================================================

  // --- Terminal Point ---

  /**
   * Lista dispositivos Point vinculados a la cuenta
   */
  async getPointDevices(): Promise<{ id: string; operating_mode: string; pos_id: string }[]> {
    return fetchWithAuth('/payments/mp/point/devices');
  },

  /**
   * Crea intención de pago en terminal Point
   */
  async createPointIntent(orderId: number, deviceId: string): Promise<{
    id: string;
    device_id: string;
    amount: number;
    state: string;
  }> {
    return fetchWithAuth('/payments/mp/point/intent', {
      method: 'POST',
      body: JSON.stringify({ orderId, deviceId }),
    });
  },

  /**
   * Consulta estado de intención Point
   */
  async getPointIntentStatus(deviceId: string, intentId: string): Promise<{
    id: string;
    state: string;
    payment?: {
      id: string;
      type: string;
      status: string;
      status_detail?: string;
    };
  }> {
    return fetchWithAuth(`/payments/mp/point/intent/${deviceId}/${intentId}`);
  },

  /**
   * Procesa resultado del pago Point y actualiza orden
   */
  async processPointPayment(orderId: number, deviceId: string, intentId: string): Promise<{
    status: string;
    orderId: number;
    mpPaymentId?: string;
  }> {
    return fetchWithAuth('/payments/mp/point/process', {
      method: 'POST',
      body: JSON.stringify({ orderId, deviceId, intentId }),
    });
  },

  /**
   * Cancela intención de pago en terminal Point
   */
  async cancelPointIntent(deviceId: string, intentId: string): Promise<{ cancelled: boolean }> {
    return fetchWithAuth(`/payments/mp/point/intent/${deviceId}/${intentId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Obtiene el estado actual del dispositivo Point
   * Útil para detectar si el terminal volvió a FREE (operación cancelada/timeout)
   */
  async getPointDeviceStatus(deviceId: string): Promise<{
    id: string;
    operating_mode: string;
    payment_intent_id?: string;
  }> {
    return fetchWithAuth(`/payments/mp/point/device/${deviceId}/status`);
  },

  /**
   * Limpia/resetea el dispositivo Point cancelando cualquier intent activo
   */
  async clearPointDevice(deviceId: string): Promise<{
    deviceStatus: { id: string; operating_mode: string; payment_intent_id?: string };
    cleanupResult: string;
  }> {
    return fetchWithAuth(`/payments/mp/point/clear/${deviceId}`, {
      method: 'POST',
    });
  },

  // --- QR Estático ---

  /**
   * Crea orden en QR estático de la caja
   */
  async createQrStaticOrder(orderId: number): Promise<{ qrData: string; inStoreOrderId: string }> {
    return fetchWithAuth('/payments/mp/qr-static', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  },

  /**
   * Limpia la orden del QR estático
   */
  async deleteQrStaticOrder(): Promise<{ deleted: boolean }> {
    return fetchWithAuth('/payments/mp/qr-static', {
      method: 'DELETE',
    });
  },

  /**
   * Verifica en Mercado Pago si hay un pago aprobado para una orden.
   * Útil para confirmar pagos QR sin depender del webhook.
   */
  async checkMpPaymentStatus(orderId: number): Promise<{
    paid: boolean;
    paymentId?: string;
    status?: string;
  }> {
    return fetchPublic(`/payments/mp/check-payment/${orderId}`);
  },

  /**
   * Imprime el ticket directamente en la impresora del servidor Windows.
   * Usa el endpoint del backend que envía a "OCOM OCPP-80S" via PowerShell.
   */
  async printTicketDirect(orderId: number): Promise<{ success: boolean; message: string }> {
    return fetchWithAuth(`/receipts/order/${orderId}/print`, {
      method: 'POST',
    });
  },

  /**
   * Busca todos los pagos de Mercado Pago (incluyendo no vinculados a órdenes)
   */
  async searchAllMpPayments(limit: number = 30, offset: number = 0, dateFrom?: string): Promise<{
    payments: MpPaymentGeneral[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    if (dateFrom) params.append('dateFrom', dateFrom);
    return fetchWithAuth(`/payments/mp/search-all?${params.toString()}`);
  },

  // === Cierre de Caja ===
  
  /**
   * Obtiene el resumen de cierre de caja del día de hoy
   */
  async getCashClosingToday(): Promise<CashClosingSummary> {
    return fetchWithAuth('/cash-closing/today');
  },

  /**
   * Obtiene el resumen de cierre de caja para un rango de fechas
   */
  async getCashClosingSummary(dateFrom: string, dateTo: string): Promise<CashClosingSummary> {
    return fetchWithAuth(`/cash-closing/summary?dateFrom=${dateFrom}&dateTo=${dateTo}`);
  },
};

// Tipo para cierre de caja
export interface CashClosingSummary {
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
  totalOrders: number;
  totalSales: number;
  averageTicket: number;
  // Desglose por método de pago
  salesByCash: number;
  salesByMercadoPago: number;
  salesByTransfer: number;
  salesByOtherPos: number;
  salesByManualOther: number;
  ordersByCash: number;
  ordersByMercadoPago: number;
  ordersByTransfer: number;
  ordersByOtherPos: number;
  ordersByManualOther: number;
  ordersByStatus: {
    status: string;
    count: number;
    total: number;
  }[];
  topProducts: {
    productId: number;
    productName: string;
    quantitySold: number;
    totalRevenue: number;
  }[];
  salesByHour: {
    hour: number;
    orders: number;
    total: number;
  }[];
  orders: {
    id: number;
    receiptCode: string | null;
    status: string;
    totalAmount: number;
    paymentMethod: string | null;
    createdAt: string;
  }[];
}

// Tipo para pagos generales de MP
export interface MpPaymentGeneral {
  id: number;
  status: string;
  statusDetail: string;
  amount: number;
  currency: string;
  paymentType: string;
  paymentMethod: string;
  dateCreated: string;
  dateApproved: string | null;
  externalReference: string | null;
  description: string | null;
  payerEmail: string | null;
  pointOfInteraction: string | null;
  linkedOrder: {
    id: number;
    status: string;
    totalAmount: number;
  } | null;
  isLinked: boolean;
}

// Tipo para estadísticas del dashboard
export interface DashboardStats {
  todaySales: number;
  todayOrders: number;
  averageTicket: number;
  pendingOrders: number;
  yesterdaySales: number;
  salesGrowth: number;
  salesByHour: { hour: string; sales: number; orders: number }[];
  salesByDay: { date: string; sales: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  paymentMethods: { method: string; count: number; total: number }[];
  ordersByStatus: { status: string; count: number }[];
}

// Obtener estadísticas del dashboard
export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${getBaseUrl()}/stats/dashboard`);
  if (!res.ok) throw new Error('Error fetching dashboard stats');
  return res.json();
}

// Tipo para configuración del sistema
export interface SystemConfig {
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  taxId: string;
  receiptFooter: string;
  currency: string;
  taxRate: number;
  enableSound: boolean;
  enableVibration: boolean;
  kitchenAutoRefresh: number;
  orderTimeout: number;
  printAutomatically: boolean;
  mpPublicKey: string;
  mpAccessToken: string;
}

// Obtener configuración del sistema
export async function getSystemConfig(): Promise<SystemConfig> {
  const res = await fetch(`${getBaseUrl()}/config`);
  if (!res.ok) throw new Error('Error fetching system config');
  return res.json();
}

// Actualizar configuración del sistema
export async function updateSystemConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
  const res = await fetch(`${getBaseUrl()}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Error updating system config');
  return res.json();
}
