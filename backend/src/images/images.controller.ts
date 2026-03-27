import { Controller, Get, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';

/**
 * Proxy de imágenes para dispositivos sin acceso a internet.
 * El kiosko puede pedir imágenes a través del backend local.
 * 
 * Uso: GET /images/proxy?url=https://ejemplo.com/imagen.jpg
 */
@Controller('images')
export class ImagesController {
  // Cache simple en memoria (en producción usar Redis o disco)
  private imageCache = new Map<string, { data: Buffer; contentType: string; timestamp: number }>();
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hora

  @Get('proxy')
  async proxyImage(
    @Query('url') url: string,
    @Res() res: Response,
  ) {
    if (!url) {
      throw new HttpException('URL requerida', HttpStatus.BAD_REQUEST);
    }

    try {
      // Decodificar URL si viene encoded
      const decodedUrl = decodeURIComponent(url);
      
      // Verificar cache
      const cached = this.imageCache.get(decodedUrl);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        res.setHeader('Content-Type', cached.contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.setHeader('X-Cache', 'HIT');
        return res.send(cached.data);
      }

      // Descargar imagen
      const response = await axios.get(decodedUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'KioskoImageProxy/1.0',
        },
      });

      const contentType = response.headers['content-type'] || 'image/jpeg';
      const imageData = Buffer.from(response.data);

      // Guardar en cache
      this.imageCache.set(decodedUrl, {
        data: imageData,
        contentType,
        timestamp: Date.now(),
      });

      // Limpiar cache viejo (cada 100 requests)
      if (Math.random() < 0.01) {
        this.cleanCache();
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Cache', 'MISS');
      return res.send(imageData);

    } catch (error) {
      console.error('Error proxying image:', url, error.message);
      throw new HttpException(
        `Error descargando imagen: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.imageCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.imageCache.delete(key);
      }
    }
  }
}
