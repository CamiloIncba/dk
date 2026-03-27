import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Verificar si el endpoint está marcado como público
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    const validApiKey = process.env.API_KEY;

    // Si no hay API_KEY configurada en el entorno, permitir (desarrollo sin config)
    if (!validApiKey) {
      console.warn(
        '⚠️  API_KEY no configurada en .env - endpoints protegidos están abiertos',
      );
      return true;
    }

    if (!apiKey || apiKey !== validApiKey) {
      throw new UnauthorizedException('API Key inválida o faltante');
    }

    return true;
  }
}
