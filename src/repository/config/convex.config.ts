import { ConvexHttpClient } from 'convex/browser';

export class ConvexClientFactory {
  private static client: ConvexHttpClient;

  static getClient(): ConvexHttpClient {
    if (!this.client) {
      const convexUrl = process.env.CONVEX_URL;
      if (!convexUrl) {
        throw new Error('CONVEX_URL environment variable is not set');
      }
      this.client = new ConvexHttpClient(convexUrl);
    }
    return this.client;
  }
}
