export class UpdateKitchenStatusDto {
  // Usamos strings para el DTO y validamos a mano.
  // Valores permitidos: PENDING, IN_PREPARATION, READY, CANCELLED, DELIVERED
  status!: string;
  
  // Para auditoría: origen del cambio
  source?: string;  // 'kitchen-app', 'cashier-pwa', 'android-kiosk'
  changedBy?: string;  // Identificador del usuario
  notes?: string;  // Notas opcionales
}
