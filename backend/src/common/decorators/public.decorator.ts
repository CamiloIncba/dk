import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca un endpoint como público (no requiere API Key).
 * Usar en endpoints que deben ser accesibles sin autenticación,
 * como el display público de pedidos.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
