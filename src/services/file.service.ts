import { minioClient } from '@/core/minio';

/**
 * File Service
 * High-level file storage operations
 */
export class FileService {
  private client = minioClient.getClient();
  private endpoint = process.env.NEXT_PUBLIC_MINIO_ENDPOINT || 'http://localhost:9000';

  /**
   * Ensure bucket exists
   */
  private async ensureBucket(bucketName: string): Promise<void> {
    const exists = await this.client.bucketExists(bucketName);
    if (!exists) {
      await this.client.makeBucket(bucketName, 'us-east-1');
      console.log(`✅ Bucket created: ${bucketName}`);
    }
  }

  /**
   * Upload file
   */
  async upload(
    bucketName: string,
    fileName: string,
    buffer: Buffer,
    contentType: string = 'application/octet-stream'
  ): Promise<string> {
    await this.ensureBucket(bucketName);

    const metaData = { 'Content-Type': contentType };
    await this.client.putObject(bucketName, fileName, buffer, buffer.length, metaData);

    return `${this.endpoint}/${bucketName}/${fileName}`;
  }

  /**
   * Delete file
   */
  async delete(bucketName: string, fileName: string): Promise<void> {
    await this.client.removeObject(bucketName, fileName);
  }

  /**
   * Get public URL
   */
  getUrl(bucketName: string, fileName: string): string {
    return `${this.endpoint}/${bucketName}/${fileName}`;
  }

  /**
   * List files in bucket
   */
  async list(bucketName: string, prefix: string = ''): Promise<string[]> {
    const files: string[] = [];
    const stream = this.client.listObjects(bucketName, prefix, true);

    return new Promise((resolve, reject) => {
      stream.on('data', (obj) => obj.name && files.push(obj.name));
      stream.on('error', reject);
      stream.on('end', () => resolve(files));
    });
  }

  /**
   * Check if file exists
   */
  async exists(bucketName: string, fileName: string): Promise<boolean> {
    try {
      await this.client.statObject(bucketName, fileName);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(bucketName: string, fileName: string) {
    return await this.client.statObject(bucketName, fileName);
  }
}

export const fileService = new FileService();
