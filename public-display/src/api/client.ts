import { DisplayResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010';

/**
 * Obtiene los pedidos para mostrar en pantalla pública
 * Este endpoint es público, no requiere API Key
 */
export async function fetchDisplayOrders(): Promise<DisplayResponse> {
  const response = await fetch(`${API_BASE_URL}/kitchen/display`);
  
  if (!response.ok) {
    throw new Error(`Error al cargar pedidos: ${response.status}`);
  }
  
  return response.json();
}
