import * as fs from 'fs';
import * as path from 'path';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const STORAGE_DIR = process.env.STORAGE_DIR || './storage';

// Check if S3 environment variables are provided
const useS3 = !!(process.env.S3_BUCKET_NAME && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);

const s3Client = useS3 ? new S3Client({
  region: 'auto', // Cloudflare R2 requires 'auto' as region
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!
  }
}) : null;

export class StorageProvider {
  private static initLocal() {
    const fullPath = path.resolve(STORAGE_DIR);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  static async saveFile(key: string, buffer: Buffer): Promise<string> {
    if (useS3 && s3Client) {
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: key.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'
      }));
      return key;
    }

    // Fallback to local storage
    this.initLocal();
    const dest = path.join(path.resolve(STORAGE_DIR), key);
    const dir = path.dirname(dest);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(dest, buffer);
    return key;
  }

  static async getFile(key: string): Promise<Buffer | Uint8Array> {
    if (useS3 && s3Client) {
      const response = await s3Client.send(new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      }));
      return Buffer.from(await response.Body!.transformToByteArray());
    }

    // Fallback to local storage
    const dest = path.join(path.resolve(STORAGE_DIR), key);
    if (!fs.existsSync(dest)) {
      throw new Error(`File not found: ${key}`);
    }
    return await fs.promises.readFile(dest);
  }

  static async getSignedUrl(key: string): Promise<string> {
    if (useS3 && s3Client) {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key
      });
      // URL expires in 1 hour
      return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    }

    // For local storage we return an endpoint routing to the download controller
    return `/api/invoices/download-file?key=${encodeURIComponent(key)}`;
  }
}
export default StorageProvider;
