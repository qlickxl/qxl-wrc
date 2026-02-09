import axios, { AxiosInstance } from 'axios';
import NodeCache from 'node-cache';

const WRC_BASE_URL = 'https://api.wrc.com';
const cache = new NodeCache({ stdTTL: 600 }); // 10 min cache

class RateLimiter {
  private minDelay = 500; // 500ms between requests
  private maxPerHour = 200;
  private timestamps: number[] = [];
  private lastRequest = 0;

  async wait(): Promise<void> {
    const oneHourAgo = Date.now() - 3600_000;
    this.timestamps = this.timestamps.filter((t) => t > oneHourAgo);

    if (this.timestamps.length >= this.maxPerHour) {
      throw new Error(
        `WRC API rate limit: ${this.maxPerHour} requests/hour exhausted. ` +
          `Oldest expires in ${Math.ceil((this.timestamps[0] + 3600_000 - Date.now()) / 1000)}s`
      );
    }

    const elapsed = Date.now() - this.lastRequest;
    if (elapsed < this.minDelay) {
      await new Promise((r) => setTimeout(r, this.minDelay - elapsed));
    }

    this.lastRequest = Date.now();
    this.timestamps.push(this.lastRequest);
  }

  getStatus() {
    const oneHourAgo = Date.now() - 3600_000;
    this.timestamps = this.timestamps.filter((t) => t > oneHourAgo);
    return {
      requestsInLastHour: this.timestamps.length,
      maxPerHour: this.maxPerHour,
      remaining: this.maxPerHour - this.timestamps.length,
    };
  }
}

const rateLimiter = new RateLimiter();

export class WrcApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: WRC_BASE_URL,
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    });
  }

  private getCacheKey(endpoint: string): string {
    return `wrc_${endpoint}`;
  }

  private async fetchWithCache<T>(endpoint: string, ttl?: number): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint);
    const cached = cache.get<T>(cacheKey);
    if (cached) return cached;

    await rateLimiter.wait();

    try {
      const response = await this.client.get<T>(endpoint);
      const data = response.data;

      if (ttl !== undefined) {
        cache.set(cacheKey, data, ttl);
      } else {
        cache.set(cacheKey, data);
      }
      return data;
    } catch (error: any) {
      if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
        console.error(`[wrc-api] DNS resolution failed for api.wrc.com — API may be unavailable`);
        throw new Error('WRC API DNS resolution failed — service may be unavailable');
      }
      console.error(`[wrc-api] Error for ${endpoint}:`, error.message);
      throw error;
    }
  }

  async getActiveSeason(): Promise<any> {
    const data: any = await this.fetchWithCache('/contel-page/83388/calendar/active-season/', 3600);
    return data?.rallyEvents?.items || [];
  }

  async getEventCars(eventId: number): Promise<any> {
    const data: any = await this.fetchWithCache(`/results-api/rally-event/${eventId}/cars`);
    return data || [];
  }

  async getEventItinerary(eventId: number): Promise<any> {
    const data: any = await this.fetchWithCache(`/results-api/rally-event/${eventId}/itinerary`);
    return data || {};
  }

  async getEventResult(eventId: number): Promise<any> {
    const data: any = await this.fetchWithCache(`/results-api/rally-event/${eventId}/result`);
    return data || [];
  }

  async getStageTimes(eventId: number, stageId: string): Promise<any> {
    const data: any = await this.fetchWithCache(
      `/results-api/rally-event/${eventId}/stage-times/stage-external/${stageId}`
    );
    return data || [];
  }

  async getSplitTimes(eventId: number, stageId: string): Promise<any> {
    const data: any = await this.fetchWithCache(
      `/results-api/rally-event/${eventId}/split-times/stage-external/${stageId}`
    );
    return data || {};
  }

  async getPenalties(eventId: number): Promise<any> {
    const data: any = await this.fetchWithCache(`/results-api/rally-event/${eventId}/penalties`);
    return data || [];
  }

  async getRetirements(eventId: number): Promise<any> {
    const data: any = await this.fetchWithCache(`/results-api/rally-event/${eventId}/retirements`);
    return data || [];
  }

  getStatus() {
    return rateLimiter.getStatus();
  }
}

export const wrcApiService = new WrcApiService();
