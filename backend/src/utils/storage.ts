import * as fs from 'fs';
import * as path from 'path';

const STORAGE_DIR = process.env.STORAGE_DIR || './storage';

export class StorageProvider {
  private static initLocal() {
    const fullPath = path.resolve(STORAGE_DIR);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }

  static async saveFile(key: string, buffer: Buffer): Promise<string> {
    this.initLocal();
    const dest = path.join(path.resolve(STORAGE_DIR), key);
    const dir = path.dirname(dest);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    await fs.promises.writeFile(dest, buffer);
    return key;
  }

  static async getFile(key: string): Promise<Buffer> {
    const dest = path.join(path.resolve(STORAGE_DIR), key);
    if (!fs.existsSync(dest)) {
      throw new Error(`File not found: ${key}`);
    }
    return await fs.promises.readFile(dest);
  }

  static async getSignedUrl(key: string): Promise<string> {
    // For local storage we return an endpoint routing to the download controller
    return `/api/invoices/download-file?key=${encodeURIComponent(key)}`;
  }
}
export default StorageProvider;
