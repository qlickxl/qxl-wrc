import { Request, Response } from 'express';
import pool from '../config/database';

// Helper to format milliseconds into H:MM:SS.sss
function formatTime(ms: number | null): string | null {
  if (ms === null || ms === undefined) return null;
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export const getRallies = async (req: Request, res: Response) => {
  try {
    let season = req.query.season;
    if (!season) {
      // Default to latest season with data
      const latest = await pool.query('SELECT MAX(season) as max_season FROM wrc_rallies');
      season = latest.rows[0]?.max_season || new Date().getFullYear();
    }
    const result = await pool.query(
      `SELECT * FROM wrc_rallies WHERE season = $1 ORDER BY round`,
      [season]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching rallies:', error);
    res.status(500).json({ error: 'Failed to fetch rallies' });
  }
};

export const getRallyResults = async (req: Request, res: Response) => {
  try {
    const rallyId = parseInt(req.params.id);
    const result = await pool.query(
      `SELECT
        o.overall_position as position,
        o.total_time_ms,
        o.gap_first_ms,
        o.points_total as points,
        o.status,
        o.retirement_reason,
        d.name as driver_name,
        d.nationality as driver_nationality,
        d.photo_url as driver_photo,
        cd.name as codriver_name,
        c.car_number,
        c.car_class,
        c.team_name,
        m.name as manufacturer_name,
        m.logo_url as manufacturer_logo
      FROM wrc_overall_results o
      JOIN wrc_crews c ON c.id = o.crew_id
      JOIN wrc_drivers d ON d.id = c.driver_id
      LEFT JOIN wrc_codrivers cd ON cd.id = c.codriver_id
      LEFT JOIN wrc_manufacturers m ON m.id = c.manufacturer_id
      WHERE o.rally_id = $1
      ORDER BY COALESCE(o.overall_position, 999), o.status`,
      [rallyId]
    );

    // Format times for display
    const rows = result.rows.map((r) => ({
      ...r,
      total_time: formatTime(r.total_time_ms),
      gap_first: formatTime(r.gap_first_ms),
    }));

    res.json(rows);
  } catch (error) {
    console.error('Error fetching rally results:', error);
    res.status(500).json({ error: 'Failed to fetch rally results' });
  }
};

export const getStages = async (req: Request, res: Response) => {
  try {
    const rallyId = parseInt(req.params.id);
    const result = await pool.query(
      `SELECT * FROM wrc_stages WHERE rally_id = $1 ORDER BY stage_number`,
      [rallyId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stages:', error);
    res.status(500).json({ error: 'Failed to fetch stages' });
  }
};

export const getStageResults = async (req: Request, res: Response) => {
  try {
    const stageId = parseInt(req.params.id);
    const result = await pool.query(
      `SELECT
        sr.stage_position,
        sr.stage_time_ms,
        sr.overall_position,
        sr.overall_time_ms,
        sr.gap_first_ms,
        sr.gap_prev_ms,
        sr.penalty_time_ms,
        sr.penalty_reason,
        d.name as driver_name,
        d.nationality as driver_nationality,
        cd.name as codriver_name,
        c.car_number,
        c.car_class,
        c.team_name,
        m.name as manufacturer_name
      FROM wrc_stage_results sr
      JOIN wrc_crews c ON c.id = sr.crew_id
      JOIN wrc_drivers d ON d.id = c.driver_id
      LEFT JOIN wrc_codrivers cd ON cd.id = c.codriver_id
      LEFT JOIN wrc_manufacturers m ON m.id = c.manufacturer_id
      WHERE sr.stage_id = $1
      ORDER BY sr.stage_position`,
      [stageId]
    );

    const rows = result.rows.map((r) => ({
      ...r,
      stage_time: formatTime(r.stage_time_ms),
      overall_time: formatTime(r.overall_time_ms),
      gap_first: formatTime(r.gap_first_ms),
      gap_prev: formatTime(r.gap_prev_ms),
    }));

    res.json(rows);
  } catch (error) {
    console.error('Error fetching stage results:', error);
    res.status(500).json({ error: 'Failed to fetch stage results' });
  }
};

export const getDriverStandings = async (req: Request, res: Response) => {
  try {
    const season = req.query.season || new Date().getFullYear();
    const result = await pool.query(
      `SELECT
        ds.position,
        ds.points,
        ds.wins,
        ds.podiums,
        ds.stage_wins,
        ds.manufacturer,
        d.name as driver_name,
        d.nationality,
        d.photo_url
      FROM wrc_driver_standings ds
      JOIN wrc_drivers d ON d.id = ds.driver_id
      WHERE ds.season = $1
      ORDER BY ds.position`,
      [season]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching driver standings:', error);
    res.status(500).json({ error: 'Failed to fetch driver standings' });
  }
};

export const getManufacturerStandings = async (req: Request, res: Response) => {
  try {
    const season = req.query.season || new Date().getFullYear();
    const result = await pool.query(
      `SELECT
        ms.position,
        ms.points,
        ms.wins,
        m.name as manufacturer_name,
        m.nationality,
        m.logo_url
      FROM wrc_manufacturer_standings ms
      JOIN wrc_manufacturers m ON m.id = ms.manufacturer_id
      WHERE ms.season = $1
      ORDER BY ms.position`,
      [season]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching manufacturer standings:', error);
    res.status(500).json({ error: 'Failed to fetch manufacturer standings' });
  }
};

export const getDriverProfile = async (req: Request, res: Response) => {
  try {
    const driverId = parseInt(req.params.id);
    const driverResult = await pool.query(
      'SELECT * FROM wrc_drivers WHERE id = $1',
      [driverId]
    );
    if (driverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    // Get recent results
    const resultsResult = await pool.query(
      `SELECT
        r.name as rally_name,
        r.country,
        r.season,
        o.overall_position as position,
        o.points_total as points,
        o.status,
        c.team_name,
        m.name as manufacturer_name
      FROM wrc_overall_results o
      JOIN wrc_crews c ON c.id = o.crew_id
      JOIN wrc_rallies r ON r.id = o.rally_id
      LEFT JOIN wrc_manufacturers m ON m.id = c.manufacturer_id
      WHERE c.driver_id = $1
      ORDER BY r.season DESC, r.round DESC
      LIMIT 20`,
      [driverId]
    );

    res.json({
      driver: driverResult.rows[0],
      results: resultsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching driver profile:', error);
    res.status(500).json({ error: 'Failed to fetch driver profile' });
  }
};
