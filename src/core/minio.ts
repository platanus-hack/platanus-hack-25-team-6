import * as Minio from 'minio';

/**
 * MinIO Core Client
 * Low-level S3-compatible storage client
 */
class MinIOClient {
  private static instance: MinIOClient;
  private client: Minio.Client;

  private constructor() {
    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    });
  }

  public static getInstance(): MinIOClient {
    if (!MinIOClient.instance) {
      MinIOClient.instance = new MinIOClient();
    }
    return MinIOClient.instance;
  }

  public getClient(): Minio.Client {
    return this.client;
  }
}

export const minioClient = MinIOClient.getInstance();
