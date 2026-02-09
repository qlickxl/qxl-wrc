import { Request, Response } from 'express';
import { WrcSyncService } from '../services/wrc-sync.service';

export const syncCalendar = async (req: Request, res: Response) => {
  try {
    const season = req.body.season || undefined;
    const result = await WrcSyncService.syncCalendar(season);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Sync calendar error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync calendar' });
  }
};

export const syncRally = async (req: Request, res: Response) => {
  try {
    const eventId = parseInt(req.body.eventId);
    if (!eventId) {
      return res.status(400).json({ error: 'eventId is required' });
    }
    const result = await WrcSyncService.syncRally(eventId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Sync rally error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync rally' });
  }
};

export const syncSeason = async (req: Request, res: Response) => {
  try {
    const season = req.body.season || undefined;
    const result = await WrcSyncService.syncSeason(season);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Sync season error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync season' });
  }
};

export const syncStandings = async (req: Request, res: Response) => {
  try {
    // Standings sync would typically come from the overall results
    // For now, recompute from existing data
    const stats = await WrcSyncService.recomputeDriverStats();
    res.json({ success: true, ...stats });
  } catch (error: any) {
    console.error('Sync standings error:', error);
    res.status(500).json({ error: error.message || 'Failed to sync standings' });
  }
};

export const recomputeStats = async (req: Request, res: Response) => {
  try {
    const result = await WrcSyncService.recomputeDriverStats();
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Recompute stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to recompute stats' });
  }
};

export const getApiStatus = async (req: Request, res: Response) => {
  try {
    const status = WrcSyncService.getStatus();
    res.json({ success: true, rateLimiter: status });
  } catch (error: any) {
    console.error('API status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get API status' });
  }
};
