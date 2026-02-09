import express from 'express';
import {
  syncCalendar,
  syncRally,
  syncSeason,
  syncStandings,
  scrapeStandings,
  scrapeResults,
  scrapeUpcomingStages,
  recomputeStats,
  getApiStatus,
} from '../controllers/wrcSyncController';

const router = express.Router();

router.post('/calendar', syncCalendar);
router.post('/rally', syncRally);
router.post('/season', syncSeason);
router.post('/standings', syncStandings);
router.post('/scrape-standings', scrapeStandings);
router.post('/scrape-results', scrapeResults);
router.post('/scrape-upcoming-stages', scrapeUpcomingStages);
router.post('/recompute-stats', recomputeStats);
router.get('/status', getApiStatus);

export default router;
