import { Injectable, BadRequestException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private region: string;

  constructor() {
    // Solo inicializar S3 si las variables de entorno están configuradas
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.bucketName = process.env.AWS_S3_BUCKET || '';

    if (accessKeyId && secretAccessKey && this.bucketName) {
      this.s3Client = new S3Client({
        region: this.region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      console.log('✅ AWS S3 configurado correctamente');
    } else {
      console.log(
        '⚠️ AWS S3 no configurado - las subidas de imágenes no funcionarán',
      );
    }
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    if (!this.s3Client) {
      throw new BadRequestException(
        'Servicio de imágenes no configurado. Configure las variables de entorno AWS.',
      );
    }

    // Validar tipo de archivo
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de archivo no permitido. Use JPG, PNG, WebP o GIF.',
      );
    }

    // Validar tamaño (máx 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        'El archivo es demasiado grande. Máximo 5MB.',
      );
    }

    // Generar nombre único
    const extension = file.originalname.split('.').pop() || 'jpg';
    const key = `products/${randomUUID()}.${extension}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      // Retornar URL pública
      return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('Error subiendo a S3:', error);
      throw new BadRequestException('Error al subir la imagen');
    }
  }

  async deleteImage(imageUrl: string): Promise<void> {
    if (!this.s3Client) return;

    try {
      // Extraer key de la URL
      const url = new URL(imageUrl);
      const key = url.pathname.substring(1); // Quitar el "/" inicial

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      console.error('Error eliminando de S3:', error);
    }
  }
}
