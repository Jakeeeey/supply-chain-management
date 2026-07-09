import { DemoData } from '../types/demo.types';

export class DemoService {
  /**
   * Fetches demo data by ID
   */
  static async getDemoData(id: string): Promise<DemoData> {
    // Placeholder implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ id, name: 'Sample Demo Item', createdAt: new Date() });
      }, 500);
    });
  }
}
