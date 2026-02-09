import { Request, Response } from 'express';
import { WrcSyncService } from '../services/wrc-sync.service';
import { StandingsScraperService } from '../services/standings-scraper.service';
import { ResultsScraperService } from '../services/results-scraper.service';

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

export const scrapeStandings = async (req: Request, res: Response) => {
  try {
    const season = req.body.season || undefined;
    const result = await StandingsScraperService.scrapeAndSync(season);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Scrape standings error:', error);
    res.status(500).json({ error: error.message || 'Failed to scrape standings' });
  }
};

export const scrapeResults = async (req: Request, res: Response) => {
  try {
    const round = req.body.round ? parseInt(req.body.round) : undefined;
    const season = req.body.season ? parseInt(req.body.season) : undefined;
    if (round) {
      const result = await ResultsScraperService.scrapeRally(round, season);
      res.json({ success: true, ...result });
    } else {
      const result = await ResultsScraperService.scrapeAllRallies(season);
      res.json({ success: true, ...result });
    }
  } catch (error: any) {
    console.error('Scrape results error:', error);
    res.status(500).json({ error: error.message || 'Failed to scrape results' });
  }
};

export const scrapeUpcomingStages = async (req: Request, res: Response) => {
  try {
    const season = req.body.season ? parseInt(req.body.season) : new Date().getFullYear();
    const result = await ResultsScraperService.scrapeUpcomingStages(season);
    res.json({ success: true, rallies: result });
  } catch (error: any) {
    console.error('Scrape upcoming stages error:', error);
    res.status(500).json({ error: error.message || 'Failed to scrape upcoming stages' });
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
