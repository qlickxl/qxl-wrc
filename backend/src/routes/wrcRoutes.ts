import express from 'express';
import {
  getRallies,
  getRallyResults,
  getStages,
  getStageResults,
  getDriverStandings,
  getManufacturerStandings,
  getDriverProfile,
} from '../controllers/wrcController';

const router = express.Router();

router.get('/rallies', getRallies);
router.get('/rallies/:id/results', getRallyResults);
router.get('/rallies/:id/stages', getStages);
router.get('/stages/:id/results', getStageResults);
router.get('/standings/drivers', getDriverStandings);
router.get('/standings/manufacturers', getManufacturerStandings);
router.get('/drivers/:id', getDriverProfile);

export default router;
