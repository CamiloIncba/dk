// ── Roles ────────────────────────────────────────────────────────────

export type Role = 'admin' | 'operador' | 'lector';

export interface CurrentUser {
  id: string;
  email: string;
  nombre: string;
  apellido?: string;
  role: Role;
  lastLogin?: string;
}

// ── API response wrapper ─────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
