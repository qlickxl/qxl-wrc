import pool from '../config/database';
import { wrcApiService } from './wrc-api.service';

export class WrcSyncService {
  /**
   * Sync rally calendar for the active season
   */
  static async syncCalendar(season?: number): Promise<{ upserted: number }> {
    const events = await wrcApiService.getActiveSeason();
    if (!events.length) {
      throw new Error('No rally events returned from WRC API');
    }

    let upserted = 0;
    for (const event of events) {
      const eventSeason = season || new Date(event.startDate || event.date).getFullYear();
      const round = event.round || event.order || (upserted + 1);
      const name = event.name || event.eventName || 'Unknown Rally';
      const officialName = event.officialName || event.fullName || name;
      const country = event.country?.name || event.countryName || null;
      const surface = event.surface || null;
      const startDate = event.startDate || event.date || null;
      const endDate = event.endDate || null;
      const totalStages = event.totalStages || null;
      const status = event.status || (startDate && new Date(startDate) < new Date() ? 'completed' : 'upcoming');
      const eventId = event.id || event.eventId || null;

      await pool.query(
        `INSERT INTO wrc_rallies (season, round, name, official_name, country, surface, start_date, end_date, total_stages, status, event_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (season, round) DO UPDATE SET
           name = COALESCE(EXCLUDED.name, wrc_rallies.name),
           official_name = COALESCE(EXCLUDED.official_name, wrc_rallies.official_name),
           country = COALESCE(EXCLUDED.country, wrc_rallies.country),
           surface = COALESCE(EXCLUDED.surface, wrc_rallies.surface),
           start_date = COALESCE(EXCLUDED.start_date, wrc_rallies.start_date),
           end_date = COALESCE(EXCLUDED.end_date, wrc_rallies.end_date),
           total_stages = COALESCE(EXCLUDED.total_stages, wrc_rallies.total_stages),
           status = COALESCE(EXCLUDED.status, wrc_rallies.status),
           event_id = COALESCE(EXCLUDED.event_id, wrc_rallies.event_id),
           updated_at = CURRENT_TIMESTAMP`,
        [eventSeason, round, name, officialName, country, surface, startDate, endDate, totalStages, status, eventId]
      );
      upserted++;
    }

    console.log(`[wrc-sync] syncCalendar: ${upserted} rallies upserted`);
    return { upserted };
  }

  /**
   * Sync stages for a rally from itinerary
   */
  static async syncStages(eventId: number, rallyId: number): Promise<{ upserted: number }> {
    const itinerary = await wrcApiService.getEventItinerary(eventId);
    const legs = itinerary?.itineraryLegs || itinerary?.legs || [];

    let upserted = 0;
    for (const leg of legs) {
      const sections = leg.itinerarySections || leg.sections || [];
      for (const section of sections) {
        const stages = section.stages || section.controls || [];
        for (const stage of stages) {
          if (!stage.stageId && !stage.number) continue;

          const stageNumber = stage.number || stage.stageId;
          const name = stage.name || stage.stageName || `SS${stageNumber}`;
          const distance = stage.distance || stage.length || null;
          const surface = stage.surface || null;
          const isPowerStage = stage.powerStage || stage.isPowerStage || false;
          const legNumber = leg.legDate ? leg.order || leg.legId : null;
          const stageDate = stage.date || leg.legDate || null;
          const startTime = stage.startTime || null;

          await pool.query(
            `INSERT INTO wrc_stages (rally_id, stage_number, name, distance_km, surface, is_power_stage, leg, stage_date, start_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (rally_id, stage_number) DO UPDATE SET
               name = COALESCE(EXCLUDED.name, wrc_stages.name),
               distance_km = COALESCE(EXCLUDED.distance_km, wrc_stages.distance_km),
               surface = COALESCE(EXCLUDED.surface, wrc_stages.surface),
               is_power_stage = EXCLUDED.is_power_stage,
               leg = COALESCE(EXCLUDED.leg, wrc_stages.leg),
               stage_date = COALESCE(EXCLUDED.stage_date, wrc_stages.stage_date),
               start_time = COALESCE(EXCLUDED.start_time, wrc_stages.start_time),
               updated_at = CURRENT_TIMESTAMP`,
            [rallyId, stageNumber, name, distance, surface, isPowerStage, legNumber, stageDate, startTime]
          );
          upserted++;
        }
      }
    }

    console.log(`[wrc-sync] syncStages: eventId=${eventId} — ${upserted} stages`);
    return { upserted };
  }

  /**
   * Sync entry list (cars) → wrc_drivers, wrc_codrivers, wrc_manufacturers, wrc_crews
   */
  static async syncEntryList(eventId: number, rallyId: number): Promise<{ crews: number }> {
    const cars = await wrcApiService.getEventCars(eventId);
    const entries = Array.isArray(cars) ? cars : (cars?.entries || []);

    let crewCount = 0;
    for (const entry of entries) {
      const driver = entry.driver || {};
      const codriver = entry.coDriver || entry.codriver || {};
      const manufacturer = entry.manufacturer || entry.team || {};

      // Upsert manufacturer
      let manufacturerId: number | null = null;
      const mfgName = manufacturer.name || manufacturer.manufacturerName;
      if (mfgName) {
        const mfgResult = await pool.query(
          `INSERT INTO wrc_manufacturers (name, full_name, nationality)
           VALUES ($1, $2, $3)
           ON CONFLICT (name) DO UPDATE SET
             full_name = COALESCE(EXCLUDED.full_name, wrc_manufacturers.full_name),
             updated_at = CURRENT_TIMESTAMP
           RETURNING id`,
          [mfgName, manufacturer.fullName || mfgName, manufacturer.nationality || null]
        );
        manufacturerId = mfgResult.rows[0].id;
      }

      // Upsert driver
      const driverName = `${driver.lastName || ''} ${driver.firstName || ''}`.trim();
      const driverResult = await pool.query(
        `INSERT INTO wrc_drivers (name, full_name, nationality, wrc_api_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          driverName || 'Unknown',
          driver.fullName || driverName,
          driver.nationality?.name || driver.country || null,
          driver.personId || driver.id || null,
        ]
      );
      let driverId: number;
      if (driverResult.rows.length > 0) {
        driverId = driverResult.rows[0].id;
      } else {
        // Already exists — find by wrc_api_id or name
        const existing = await pool.query(
          `SELECT id FROM wrc_drivers WHERE wrc_api_id = $1 OR name = $2 LIMIT 1`,
          [driver.personId || driver.id || -1, driverName]
        );
        driverId = existing.rows[0]?.id;
        if (!driverId) continue;
      }

      // Upsert codriver
      const codriverName = `${codriver.lastName || ''} ${codriver.firstName || ''}`.trim();
      let codriverId: number | null = null;
      if (codriverName) {
        const codriverResult = await pool.query(
          `INSERT INTO wrc_codrivers (name, full_name, nationality, wrc_api_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [
            codriverName,
            codriver.fullName || codriverName,
            codriver.nationality?.name || codriver.country || null,
            codriver.personId || codriver.id || null,
          ]
        );
        if (codriverResult.rows.length > 0) {
          codriverId = codriverResult.rows[0].id;
        } else {
          const existing = await pool.query(
            `SELECT id FROM wrc_codrivers WHERE wrc_api_id = $1 OR name = $2 LIMIT 1`,
            [codriver.personId || codriver.id || -1, codriverName]
          );
          codriverId = existing.rows[0]?.id || null;
        }
      }

      // Upsert crew
      const carNumber = entry.carNo || entry.entryId || entry.number || null;
      const carClass = entry.groupName || entry.className || entry.group || null;
      const teamName = entry.entrantName || entry.teamName || mfgName || null;
      const status = entry.status || 'running';

      await pool.query(
        `INSERT INTO wrc_crews (rally_id, driver_id, codriver_id, manufacturer_id, car_number, car_class, team_name, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (rally_id, driver_id) DO UPDATE SET
           codriver_id = COALESCE(EXCLUDED.codriver_id, wrc_crews.codriver_id),
           manufacturer_id = COALESCE(EXCLUDED.manufacturer_id, wrc_crews.manufacturer_id),
           car_number = COALESCE(EXCLUDED.car_number, wrc_crews.car_number),
           car_class = COALESCE(EXCLUDED.car_class, wrc_crews.car_class),
           team_name = COALESCE(EXCLUDED.team_name, wrc_crews.team_name),
           status = COALESCE(EXCLUDED.status, wrc_crews.status),
           updated_at = CURRENT_TIMESTAMP`,
        [rallyId, driverId, codriverId, manufacturerId, carNumber, carClass, teamName, status]
      );
      crewCount++;
    }

    console.log(`[wrc-sync] syncEntryList: eventId=${eventId} — ${crewCount} crews`);
    return { crews: crewCount };
  }

  /**
   * Sync stage results for all stages in a rally
   */
  static async syncStageResults(eventId: number, rallyId: number): Promise<{ upserted: number }> {
    // Get stages for this rally
    const stagesResult = await pool.query(
      'SELECT id, stage_number FROM wrc_stages WHERE rally_id = $1 ORDER BY stage_number',
      [rallyId]
    );

    // Get crew lookup
    const crewsResult = await pool.query(
      `SELECT c.id, c.car_number, d.wrc_api_id as driver_api_id
       FROM wrc_crews c
       JOIN wrc_drivers d ON d.id = c.driver_id
       WHERE c.rally_id = $1`,
      [rallyId]
    );
    const crewByCarNumber = new Map<number, number>();
    const crewByDriverApiId = new Map<number, number>();
    for (const crew of crewsResult.rows) {
      if (crew.car_number) crewByCarNumber.set(crew.car_number, crew.id);
      if (crew.driver_api_id) crewByDriverApiId.set(crew.driver_api_id, crew.id);
    }

    let totalUpserted = 0;
    for (const stage of stagesResult.rows) {
      try {
        const stageExternalId = `${stage.stage_number}`;
        const times = await wrcApiService.getStageTimes(eventId, stageExternalId);
        const entries = Array.isArray(times) ? times : (times?.stageTimings || times?.entries || []);

        for (const entry of entries) {
          const entryId = entry.entryId || entry.carNo || entry.number;
          const crewId = crewByCarNumber.get(entryId) || crewByDriverApiId.get(entry.driverId) || null;
          if (!crewId) continue;

          const stageTimeMs = entry.stageTimeMs || entry.elapsedDurationMs || null;
          const stagePosition = entry.position || entry.stagePosition || null;
          const overallTimeMs = entry.overallTimeMs || entry.totalTimeMs || null;
          const overallPosition = entry.overallPosition || null;
          const gapFirstMs = entry.diffFirstMs || entry.gapFirstMs || null;
          const gapPrevMs = entry.diffPrevMs || entry.gapPrevMs || null;
          const penaltyMs = entry.penaltyDurationMs || entry.penaltyMs || 0;
          const penaltyReason = entry.penaltyReason || null;

          await pool.query(
            `INSERT INTO wrc_stage_results (stage_id, crew_id, stage_time_ms, stage_position, overall_time_ms, overall_position, gap_first_ms, gap_prev_ms, penalty_time_ms, penalty_reason)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (stage_id, crew_id) DO UPDATE SET
               stage_time_ms = COALESCE(EXCLUDED.stage_time_ms, wrc_stage_results.stage_time_ms),
               stage_position = COALESCE(EXCLUDED.stage_position, wrc_stage_results.stage_position),
               overall_time_ms = COALESCE(EXCLUDED.overall_time_ms, wrc_stage_results.overall_time_ms),
               overall_position = COALESCE(EXCLUDED.overall_position, wrc_stage_results.overall_position),
               gap_first_ms = COALESCE(EXCLUDED.gap_first_ms, wrc_stage_results.gap_first_ms),
               gap_prev_ms = COALESCE(EXCLUDED.gap_prev_ms, wrc_stage_results.gap_prev_ms),
               penalty_time_ms = COALESCE(EXCLUDED.penalty_time_ms, wrc_stage_results.penalty_time_ms),
               penalty_reason = COALESCE(EXCLUDED.penalty_reason, wrc_stage_results.penalty_reason),
               updated_at = CURRENT_TIMESTAMP`,
            [stage.id, crewId, stageTimeMs, stagePosition, overallTimeMs, overallPosition, gapFirstMs, gapPrevMs, penaltyMs, penaltyReason]
          );
          totalUpserted++;
        }
      } catch (err: any) {
        console.warn(`[wrc-sync] Stage ${stage.stage_number} times skipped: ${err.message}`);
      }
    }

    console.log(`[wrc-sync] syncStageResults: eventId=${eventId} — ${totalUpserted} results`);
    return { upserted: totalUpserted };
  }

  /**
   * Sync overall rally results
   */
  static async syncOverallResults(eventId: number, rallyId: number): Promise<{ upserted: number }> {
    const results = await wrcApiService.getEventResult(eventId);
    const entries = Array.isArray(results) ? results : (results?.entries || results?.results || []);

    // Get crew lookup
    const crewsResult = await pool.query(
      `SELECT c.id, c.car_number, d.wrc_api_id as driver_api_id
       FROM wrc_crews c
       JOIN wrc_drivers d ON d.id = c.driver_id
       WHERE c.rally_id = $1`,
      [rallyId]
    );
    const crewByCarNumber = new Map<number, number>();
    const crewByDriverApiId = new Map<number, number>();
    for (const crew of crewsResult.rows) {
      if (crew.car_number) crewByCarNumber.set(crew.car_number, crew.id);
      if (crew.driver_api_id) crewByDriverApiId.set(crew.driver_api_id, crew.id);
    }

    let upserted = 0;
    for (const entry of entries) {
      const entryId = entry.entryId || entry.carNo || entry.number;
      const crewId = crewByCarNumber.get(entryId) || crewByDriverApiId.get(entry.driverId) || null;
      if (!crewId) continue;

      const position = entry.position || entry.overallPosition || null;
      const totalTimeMs = entry.totalTimeMs || entry.totalTime || null;
      const gapFirstMs = entry.diffFirstMs || entry.gapFirstMs || null;
      const pointsOverall = entry.pointsOverall || entry.points || 0;
      const pointsPowerStage = entry.pointsPowerStage || 0;
      const pointsSuperSunday = entry.pointsSuperSunday || 0;
      const pointsTotal = entry.pointsTotal || (pointsOverall + pointsPowerStage + pointsSuperSunday);
      const status = entry.status || (position ? 'finished' : 'retired');
      const retirementReason = entry.retirementReason || entry.reason || null;

      await pool.query(
        `INSERT INTO wrc_overall_results (rally_id, crew_id, overall_position, total_time_ms, gap_first_ms, points_overall, points_power_stage, points_super_sunday, points_total, status, retirement_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (rally_id, crew_id) DO UPDATE SET
           overall_position = COALESCE(EXCLUDED.overall_position, wrc_overall_results.overall_position),
           total_time_ms = COALESCE(EXCLUDED.total_time_ms, wrc_overall_results.total_time_ms),
           gap_first_ms = COALESCE(EXCLUDED.gap_first_ms, wrc_overall_results.gap_first_ms),
           points_overall = COALESCE(EXCLUDED.points_overall, wrc_overall_results.points_overall),
           points_power_stage = COALESCE(EXCLUDED.points_power_stage, wrc_overall_results.points_power_stage),
           points_super_sunday = COALESCE(EXCLUDED.points_super_sunday, wrc_overall_results.points_super_sunday),
           points_total = COALESCE(EXCLUDED.points_total, wrc_overall_results.points_total),
           status = COALESCE(EXCLUDED.status, wrc_overall_results.status),
           retirement_reason = COALESCE(EXCLUDED.retirement_reason, wrc_overall_results.retirement_reason),
           updated_at = CURRENT_TIMESTAMP`,
        [rallyId, crewId, position, totalTimeMs, gapFirstMs, pointsOverall, pointsPowerStage, pointsSuperSunday, pointsTotal, status, retirementReason]
      );
      upserted++;
    }

    console.log(`[wrc-sync] syncOverallResults: eventId=${eventId} — ${upserted} results`);
    return { upserted };
  }

  /**
   * Sync a complete rally: stages, entry list, stage results, overall results
   */
  static async syncRally(eventId: number): Promise<{
    rallyId: number;
    stages: number;
    crews: number;
    stageResults: number;
    overallResults: number;
  }> {
    // Find or create the rally record
    const rallyResult = await pool.query(
      'SELECT id FROM wrc_rallies WHERE event_id = $1 LIMIT 1',
      [eventId]
    );
    if (rallyResult.rows.length === 0) {
      throw new Error(`Rally with event_id=${eventId} not found. Sync calendar first.`);
    }
    const rallyId = rallyResult.rows[0].id;

    const stagesResult = await this.syncStages(eventId, rallyId);
    const entryResult = await this.syncEntryList(eventId, rallyId);

    let stageResults = { upserted: 0 };
    let overallResults = { upserted: 0 };
    try {
      stageResults = await this.syncStageResults(eventId, rallyId);
    } catch (err: any) {
      console.warn(`[wrc-sync] Stage results skipped: ${err.message}`);
    }
    try {
      overallResults = await this.syncOverallResults(eventId, rallyId);
    } catch (err: any) {
      console.warn(`[wrc-sync] Overall results skipped: ${err.message}`);
    }

    return {
      rallyId,
      stages: stagesResult.upserted,
      crews: entryResult.crews,
      stageResults: stageResults.upserted,
      overallResults: overallResults.upserted,
    };
  }

  /**
   * Sync entire season: calendar + all rallies
   */
  static async syncSeason(season?: number): Promise<{
    calendar: number;
    rallies: { eventId: number; name: string; stages: number; crews: number }[];
  }> {
    const calendarResult = await this.syncCalendar(season);

    // Get all rallies with event_id
    const ralliesResult = await pool.query(
      'SELECT id, name, event_id FROM wrc_rallies WHERE event_id IS NOT NULL ORDER BY round'
    );

    const rallySummaries = [];
    for (const rally of ralliesResult.rows) {
      try {
        const result = await this.syncRally(rally.event_id);
        rallySummaries.push({
          eventId: rally.event_id,
          name: rally.name,
          stages: result.stages,
          crews: result.crews,
        });
      } catch (err: any) {
        console.warn(`[wrc-sync] Rally "${rally.name}" skipped: ${err.message}`);
      }
    }

    console.log(`[wrc-sync] syncSeason complete: ${calendarResult.upserted} calendar, ${rallySummaries.length} rallies synced`);
    return { calendar: calendarResult.upserted, rallies: rallySummaries };
  }

  /**
   * Recompute driver career stats from wrc_overall_results
   */
  static async recomputeDriverStats(): Promise<{ updated: number }> {
    const result = await pool.query(`
      UPDATE wrc_drivers SET
        career_starts = stats.starts,
        career_wins = stats.wins,
        career_podiums = stats.podiums,
        career_points = stats.total_points,
        updated_at = CURRENT_TIMESTAMP
      FROM (
        SELECT
          c.driver_id,
          COUNT(DISTINCT c.rally_id) as starts,
          COUNT(*) FILTER (WHERE o.overall_position = 1) as wins,
          COUNT(*) FILTER (WHERE o.overall_position IN (1,2,3)) as podiums,
          COALESCE(SUM(o.points_total), 0) as total_points
        FROM wrc_crews c
        LEFT JOIN wrc_overall_results o ON o.crew_id = c.id
        GROUP BY c.driver_id
      ) stats
      WHERE wrc_drivers.id = stats.driver_id
    `);

    console.log(`[wrc-sync] recomputeDriverStats: ${result.rowCount} drivers updated`);
    return { updated: result.rowCount || 0 };
  }

  static getStatus() {
    return wrcApiService.getStatus();
  }
}
