import axios from 'axios';
import pool from '../config/database';

const EWRC_BASE = 'https://www.ewrc-results.com';

interface EwrcEventConfig { round: number; name: string; ewrcId: number; slug: string }

const EWRC_EVENTS: Record<number, EwrcEventConfig[]> = {
  2025: [
    { round: 1,  name: 'Monte Carlo',    ewrcId: 89918, slug: 'rallye-automobile-monte-carlo-2025' },
    { round: 2,  name: 'Sweden',         ewrcId: 90017, slug: 'rally-sweden-2025' },
    { round: 3,  name: 'Kenya',          ewrcId: 90018, slug: 'safari-rally-kenya-2025' },
    { round: 4,  name: 'Canarias',       ewrcId: 90019, slug: 'rally-islas-canarias-rally-of-spain-2025' },
    { round: 5,  name: 'Portugal',       ewrcId: 90020, slug: 'vodafone-rally-de-portugal-2025' },
    { round: 6,  name: 'Sardinia',       ewrcId: 90021, slug: 'rally-italia-sardegna-2025' },
    { round: 7,  name: 'Greece',         ewrcId: 90022, slug: 'eko-acropolis-rally-2025' },
    { round: 8,  name: 'Estonia',        ewrcId: 90023, slug: 'delfi-rally-estonia-2025' },
    { round: 9,  name: 'Finland',        ewrcId: 90024, slug: 'secto-rally-finland-2025' },
    { round: 10, name: 'Paraguay',       ewrcId: 90025, slug: 'ueno-rally-del-paraguay-2025' },
    { round: 11, name: 'Chile',          ewrcId: 90026, slug: 'rally-chile-biobio-2025' },
    { round: 12, name: 'Central Europe', ewrcId: 90027, slug: 'central-european-rally-2025' },
    { round: 13, name: 'Japan',          ewrcId: 90028, slug: 'forum8-rally-japan-2025' },
    { round: 14, name: 'Saudi Arabia',   ewrcId: 90029, slug: 'rally-saudi-arabia-2025' },
  ],
  2026: [
    { round: 1,  name: 'Monte Carlo',    ewrcId: 96179, slug: 'rallye-automobile-monte-carlo-2026' },
    { round: 2,  name: 'Sweden',         ewrcId: 96256, slug: 'rally-sweden-2026' },
    { round: 3,  name: 'Kenya',          ewrcId: 96257, slug: 'safari-rally-kenya-2026' },
    { round: 4,  name: 'Croatia',        ewrcId: 96258, slug: 'croatia-rally-2026' },
    { round: 5,  name: 'Canarias',       ewrcId: 96259, slug: 'rally-islas-canarias-rally-of-spain-2026' },
    { round: 6,  name: 'Portugal',       ewrcId: 96260, slug: 'vodafone-rally-de-portugal-2026' },
    { round: 7,  name: 'Japan',          ewrcId: 96261, slug: 'forum8-rally-japan-2026' },
    { round: 8,  name: 'Greece',         ewrcId: 96262, slug: 'eko-acropolis-rally-greece-2026' },
    { round: 9,  name: 'Estonia',        ewrcId: 96263, slug: 'delfi-rally-estonia-2026' },
    { round: 10, name: 'Finland',        ewrcId: 96264, slug: 'secto-rally-finland-2026' },
    { round: 11, name: 'Paraguay',       ewrcId: 96265, slug: 'ueno-rally-del-paraguay-2026' },
    { round: 12, name: 'Chile',          ewrcId: 96266, slug: 'rally-chile-biobio-2026' },
    { round: 13, name: 'Sardinia',       ewrcId: 96267, slug: 'rally-italia-sardegna-2026' },
    { round: 14, name: 'Saudi Arabia',   ewrcId: 96268, slug: 'rally-saudi-arabia-2026' },
  ],
};

// ---------- Interfaces ----------

interface EwrcResult {
  id: number;
  start_number: number;
  result: number;
  superally: number;
  time: { raw: number; pretty: string };
  driver: { id: number; firstname: string; lastname: string; flag: string };
  codriver: { id: number; firstname: string; lastname: string; flag: string };
  team: { id: number; name: string };
  car: { name: string };
  classes: { id: number; name: string }[];
}

interface EwrcStage {
  stage: {
    id: number;
    event_id: number;
    stage_number: number;
    leg_number: number;
    name: string;
    first_car_time: string;
    distance: number;
    powerstage: number;
    cancelled: number;
  };
}

interface EwrcEventDetail {
  id: number;
  season: number;
  name: string;
  from_date: string;
  until_date: string;
  surface?: { en: string };
  country?: { name: { en: string } };
}

// ---------- Helpers ----------

const FLAG_TO_NATIONALITY: Record<string, string> = {
  fr: 'French', gb: 'British', uk: 'British', fi: 'Finnish', ee: 'Estonian', be: 'Belgian',
  jp: 'Japanese', se: 'Swedish', nl: 'Dutch', ie: 'Irish', es: 'Spanish',
  de: 'German', no: 'Norwegian', at: 'Austrian', it: 'Italian', pl: 'Polish',
  cl: 'Chilean', mx: 'Mexican', nz: 'New Zealander', au: 'Australian',
  cz: 'Czech', pt: 'Portuguese', ke: 'Kenyan', ar: 'Argentine', br: 'Brazilian',
  uy: 'Uruguayan', py: 'Paraguayan', sa: 'Saudi', mc: 'Monégasque',
  gr: 'Greek', hr: 'Croatian', lv: 'Latvian', lt: 'Lithuanian', bg: 'Bulgarian',
  ro: 'Romanian', hu: 'Hungarian', sk: 'Slovak', si: 'Slovenian', dk: 'Danish',
  us: 'American', ca: 'Canadian', za: 'South African', in: 'Indian',
  lu: 'Luxembourgish', qa: 'Qatari',
};

function resolveManufacturer(teamName: string): string {
  const t = teamName.toLowerCase();
  if (t.includes('toyota')) return 'Toyota';
  if (t.includes('hyundai')) return 'Hyundai';
  if (t.includes('m-sport') || t.includes('ford')) return 'M-Sport Ford';
  if (t.includes('citro')) return 'Citroën';
  if (t.includes('škoda') || t.includes('skoda')) return 'Škoda';
  return teamName;
}

// ---------- RSC Parsing ----------

function decodeRSCPayloads(html: string): string[] {
  const raw = html.match(/self\.__next_f\.push\(\[1,"(.*?)"\]\)/gs) || [];
  return raw.map(r => {
    const inner = r.match(/self\.__next_f\.push\(\[1,"(.*)"\]\)/s)?.[1];
    if (!inner) return '';
    try {
      return inner.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    } catch { return ''; }
  }).filter(Boolean);
}

function extractJsonArray(decoded: string, key: string): any[] {
  const marker = `"${key}":[`;
  const idx = decoded.indexOf(marker);
  if (idx < 0) return [];
  const start = idx + marker.length - 1; // include the [
  let depth = 0;
  for (let i = start; i < decoded.length; i++) {
    if (decoded[i] === '[') depth++;
    else if (decoded[i] === ']') depth--;
    if (depth === 0) {
      try { return JSON.parse(decoded.slice(start, i + 1)); }
      catch { return []; }
    }
  }
  return [];
}

async function fetchPage(path: string): Promise<string> {
  const url = `${EWRC_BASE}${path}`;
  const { data } = await axios.get<string>(url, {
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html',
    },
  });
  return data;
}

// ---------- Service ----------

export class ResultsScraperService {
  /**
   * Scrape results + stages for a single rally
   */
  static async scrapeRally(round: number, season = 2025): Promise<{
    rally: string; crews: number; results: number; stages: number;
  }> {
    const events = EWRC_EVENTS[season];
    if (!events) throw new Error(`No eWRC event data for season ${season}`);
    const eventInfo = events.find(e => e.round === round);
    if (!eventInfo) throw new Error(`No eWRC mapping for ${season} round ${round}`);

    console.log(`[results-scraper] Fetching ${season} R${round}: ${eventInfo.name}`);

    // Fetch final results page
    const finalHtml = await fetchPage(`/final/${eventInfo.ewrcId}-${eventInfo.slug}/`);
    const finalPayloads = decodeRSCPayloads(finalHtml);

    let results: EwrcResult[] = [];
    let eventDetail: EwrcEventDetail | undefined;

    for (const decoded of finalPayloads) {
      if (results.length === 0) {
        const arr = extractJsonArray(decoded, 'results');
        if (arr.length > 0 && arr[0]?.driver) results = arr;
      }
      if (!eventDetail && decoded.includes('"from_date"') && decoded.includes('"starters"')) {
        const match = decoded.match(/"data":(\{"id":\d+.*?"from_date".*?\})/s);
        if (match) {
          try { eventDetail = JSON.parse(match[1]); } catch { /* skip */ }
        }
      }
    }

    if (results.length === 0) throw new Error(`No results found for ${eventInfo.name}`);

    // Filter to RC1 (WRC top class)
    const wrcResults = results.filter(r => r.classes?.some(c => c.name === 'RC1'));
    console.log(`[results-scraper] ${eventInfo.name}: ${results.length} total, ${wrcResults.length} RC1`);

    // Fetch stage results page for stage list
    const stagesHtml = await fetchPage(`/results/${eventInfo.ewrcId}-${eventInfo.slug}/`);
    const stagePayloads = decodeRSCPayloads(stagesHtml);

    let stageList: EwrcStage[] = [];
    for (const decoded of stagePayloads) {
      const arr = extractJsonArray(decoded, 'stages');
      if (arr.length > 0 && arr[0]?.stage) { stageList = arr; break; }
    }

    // Ensure rally record
    const rallyRow = await this.ensureRally(eventInfo, eventDetail, season);
    const rallyId = rallyRow.id;

    // Upsert stages
    let stageCount = 0;
    for (const s of stageList) {
      if (s.stage.cancelled) continue;
      await this.upsertStage(rallyId, s);
      stageCount++;
    }
    console.log(`[results-scraper] ${eventInfo.name}: ${stageCount} stages upserted`);

    // Upsert crews and results
    let crewCount = 0;
    let resultCount = 0;
    for (const entry of wrcResults) {
      const crewId = await this.upsertCrew(rallyId, entry);
      if (!crewId) continue;
      crewCount++;
      await this.upsertOverallResult(rallyId, crewId, entry, wrcResults[0].time.raw);
      resultCount++;
    }

    console.log(`[results-scraper] ${eventInfo.name}: ${crewCount} crews, ${resultCount} results`);
    return { rally: eventInfo.name, crews: crewCount, results: resultCount, stages: stageCount };
  }

  /**
   * Scrape all completed rallies for a season
   */
  static async scrapeAllRallies(season = 2025): Promise<{
    synced: { rally: string; crews: number; results: number; stages: number }[];
    errors: { rally: string; error: string }[];
  }> {
    const events = EWRC_EVENTS[season];
    if (!events) throw new Error(`No eWRC event data for season ${season}`);

    const synced = [];
    const errors = [];

    for (const event of events) {
      try {
        const result = await this.scrapeRally(event.round, season);
        synced.push(result);
        await new Promise(r => setTimeout(r, 1000));
      } catch (err: any) {
        // Skip upcoming rallies that have no results
        if (err.message?.includes('No results found')) {
          console.log(`[results-scraper] ${event.name}: no results yet (upcoming)`);
        } else {
          console.warn(`[results-scraper] ${event.name} failed: ${err.message}`);
        }
        errors.push({ rally: event.name, error: err.message });
      }
    }

    return { synced, errors };
  }

  /**
   * Scrape calendar only (for upcoming rallies without results)
   */
  static async scrapeCalendar(season: number): Promise<{ upserted: number }> {
    const events = EWRC_EVENTS[season];
    if (!events) throw new Error(`No eWRC event data for season ${season}`);

    let upserted = 0;
    for (const event of events) {
      await pool.query(
        `INSERT INTO wrc_rallies (season, round, name, status)
         VALUES ($1, $2, $3, 'upcoming')
         ON CONFLICT (season, round) DO NOTHING`,
        [season, event.round, event.name]
      );
      upserted++;
    }
    return { upserted };
  }

  // ---------- DB upsert helpers ----------

  private static async ensureRally(
    eventInfo: EwrcEventConfig,
    ewrcEvent: EwrcEventDetail | undefined,
    season: number
  ): Promise<{ id: number }> {
    const country = ewrcEvent?.country?.name?.en || null;
    const surface = ewrcEvent?.surface?.en || null;
    const startDate = ewrcEvent?.from_date || null;
    const endDate = ewrcEvent?.until_date || null;
    const officialName = ewrcEvent?.name || eventInfo.name;

    const result = await pool.query(
      `INSERT INTO wrc_rallies (season, round, name, official_name, country, surface, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'completed')
       ON CONFLICT (season, round) DO UPDATE SET
         name = EXCLUDED.name,
         official_name = EXCLUDED.official_name,
         country = COALESCE(EXCLUDED.country, wrc_rallies.country),
         surface = COALESCE(EXCLUDED.surface, wrc_rallies.surface),
         start_date = COALESCE(EXCLUDED.start_date, wrc_rallies.start_date),
         end_date = COALESCE(EXCLUDED.end_date, wrc_rallies.end_date),
         status = 'completed',
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [season, eventInfo.round, eventInfo.name, officialName, country, surface, startDate, endDate]
    );
    return result.rows[0];
  }

  private static async upsertStage(rallyId: number, s: EwrcStage): Promise<void> {
    const stg = s.stage;
    const stageDate = stg.first_car_time ? stg.first_car_time.split(' ')[0] : null;
    const startTime = stg.first_car_time ? stg.first_car_time.split(' ')[1] : null;

    await pool.query(
      `INSERT INTO wrc_stages (rally_id, stage_number, name, distance_km, is_power_stage, leg, stage_date, start_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (rally_id, stage_number) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, wrc_stages.name),
         distance_km = COALESCE(EXCLUDED.distance_km, wrc_stages.distance_km),
         is_power_stage = EXCLUDED.is_power_stage,
         leg = COALESCE(EXCLUDED.leg, wrc_stages.leg),
         stage_date = COALESCE(EXCLUDED.stage_date, wrc_stages.stage_date),
         start_time = COALESCE(EXCLUDED.start_time, wrc_stages.start_time),
         updated_at = CURRENT_TIMESTAMP`,
      [rallyId, stg.stage_number, stg.name, stg.distance, !!stg.powerstage, stg.leg_number, stageDate, startTime]
    );
  }

  private static async upsertCrew(rallyId: number, entry: EwrcResult): Promise<number | null> {
    const driverName = `${entry.driver.lastname} ${entry.driver.firstname.charAt(0)}.`;
    const driverNat = FLAG_TO_NATIONALITY[entry.driver.flag] || entry.driver.flag;
    const codriverName = `${entry.codriver.lastname} ${entry.codriver.firstname.charAt(0)}.`;
    const codriverNat = FLAG_TO_NATIONALITY[entry.codriver.flag] || entry.codriver.flag;
    const teamName = entry.team?.name || '';
    const mfgName = resolveManufacturer(teamName);

    // Upsert driver
    const driverResult = await pool.query(
      `INSERT INTO wrc_drivers (name, full_name, nationality)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET
         full_name = COALESCE(EXCLUDED.full_name, wrc_drivers.full_name),
         nationality = COALESCE(EXCLUDED.nationality, wrc_drivers.nationality),
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [driverName, `${entry.driver.firstname} ${entry.driver.lastname}`, driverNat]
    );
    const driverId = driverResult.rows[0].id;

    // Upsert codriver
    const codriverResult = await pool.query(
      `INSERT INTO wrc_codrivers (name, full_name, nationality)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE SET
         full_name = COALESCE(EXCLUDED.full_name, wrc_codrivers.full_name),
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [codriverName, `${entry.codriver.firstname} ${entry.codriver.lastname}`, codriverNat]
    );
    const codriverId = codriverResult.rows[0].id;

    // Upsert manufacturer
    const mfgResult = await pool.query(
      `INSERT INTO wrc_manufacturers (name, full_name)
       VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET
         full_name = COALESCE(EXCLUDED.full_name, wrc_manufacturers.full_name),
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [mfgName, teamName]
    );
    const mfgId = mfgResult.rows[0].id;

    // Upsert crew
    const crewResult = await pool.query(
      `INSERT INTO wrc_crews (rally_id, driver_id, codriver_id, manufacturer_id, car_number, team_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'finished')
       ON CONFLICT (rally_id, driver_id) DO UPDATE SET
         codriver_id = COALESCE(EXCLUDED.codriver_id, wrc_crews.codriver_id),
         manufacturer_id = COALESCE(EXCLUDED.manufacturer_id, wrc_crews.manufacturer_id),
         car_number = COALESCE(EXCLUDED.car_number, wrc_crews.car_number),
         team_name = COALESCE(EXCLUDED.team_name, wrc_crews.team_name),
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [rallyId, driverId, codriverId, mfgId, entry.start_number, teamName]
    );
    return crewResult.rows[0].id;
  }

  private static async upsertOverallResult(
    rallyId: number, crewId: number, entry: EwrcResult, winnerTimeMs: number
  ): Promise<void> {
    const totalTimeMs = entry.time?.raw || null;
    const gapFirstMs = totalTimeMs && winnerTimeMs ? totalTimeMs - winnerTimeMs : null;
    const position = entry.result || null;

    await pool.query(
      `INSERT INTO wrc_overall_results (rally_id, crew_id, overall_position, total_time_ms, gap_first_ms, status)
       VALUES ($1, $2, $3, $4, $5, 'finished')
       ON CONFLICT (rally_id, crew_id) DO UPDATE SET
         overall_position = COALESCE(EXCLUDED.overall_position, wrc_overall_results.overall_position),
         total_time_ms = COALESCE(EXCLUDED.total_time_ms, wrc_overall_results.total_time_ms),
         gap_first_ms = COALESCE(EXCLUDED.gap_first_ms, wrc_overall_results.gap_first_ms),
         status = COALESCE(EXCLUDED.status, wrc_overall_results.status),
         updated_at = CURRENT_TIMESTAMP`,
      [rallyId, crewId, position, totalTimeMs, gapFirstMs]
    );
  }
}
