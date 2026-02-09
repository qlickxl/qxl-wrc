import axios from 'axios';
import pool from '../config/database';

const EWRC_BASE = 'https://www.ewrc-results.com';

// eWRC event IDs for 2025 WRC season
const EWRC_2025_EVENTS: { round: number; name: string; ewrcId: number; slug: string }[] = [
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
];

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
  average_speed?: number;
}

interface EwrcEventDetail {
  id: number;
  season: number;
  name: string;
  from_date: string;
  until_date: string;
  surface: { en: string };
  starters: number;
  finishers: number;
  total_distance: number;
  stage_distance: string;
  country: { name: { en: string } };
}

interface EwrcRetirement {
  driver: { firstname: string; lastname: string; flag: string };
  codriver: { firstname: string; lastname: string };
  team: { name: string };
  car: { name: string };
  reason?: string;
  stage?: string;
}

const FLAG_TO_NATIONALITY: Record<string, string> = {
  fr: 'French', gb: 'British', fi: 'Finnish', ee: 'Estonian', be: 'Belgian',
  jp: 'Japanese', se: 'Swedish', nl: 'Dutch', ie: 'Irish', es: 'Spanish',
  de: 'German', no: 'Norwegian', at: 'Austrian', it: 'Italian', pl: 'Polish',
  cl: 'Chilean', mx: 'Mexican', nz: 'New Zealander', au: 'Australian',
  cz: 'Czech', pt: 'Portuguese', ke: 'Kenyan', ar: 'Argentine', br: 'Brazilian',
  uy: 'Uruguayan', py: 'Paraguayan', sa: 'Saudi', mc: 'Monégasque',
  gr: 'Greek', hr: 'Croatian', lv: 'Latvian', lt: 'Lithuanian', bg: 'Bulgarian',
  ro: 'Romanian', hu: 'Hungarian', sk: 'Slovak', si: 'Slovenian', dk: 'Danish',
  us: 'American', ca: 'Canadian', za: 'South African', in: 'Indian',
};

// Map eWRC team names to our canonical manufacturer names
function resolveManufacturer(teamName: string): string {
  const t = teamName.toLowerCase();
  if (t.includes('toyota')) return 'Toyota';
  if (t.includes('hyundai')) return 'Hyundai';
  if (t.includes('m-sport') || t.includes('ford')) return 'M-Sport Ford';
  if (t.includes('citro')) return 'Citroën';
  if (t.includes('škoda') || t.includes('skoda')) return 'Škoda';
  return teamName;
}

async function fetchEwrcPage(ewrcId: number, slug: string): Promise<string> {
  const url = `${EWRC_BASE}/final/${ewrcId}-${slug}/`;
  const { data } = await axios.get<string>(url, {
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html',
    },
  });
  return data;
}

function extractResultsFromRSC(html: string): { results: EwrcResult[]; event?: EwrcEventDetail } {
  // Extract Next.js RSC payloads
  const payloads = html.match(/self\.__next_f\.push\(\[1,"(.*?)"\]\)/gs) || [];

  let results: EwrcResult[] = [];
  let event: EwrcEventDetail | undefined;

  for (const raw of payloads) {
    const inner = raw.match(/self\.__next_f\.push\(\[1,"(.*)"\]\)/s)?.[1];
    if (!inner) continue;

    let decoded: string;
    try {
      decoded = inner.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    } catch {
      continue;
    }

    // Extract results array
    if (results.length === 0 && decoded.includes('"results":[{"id":')) {
      const idx = decoded.indexOf('"results":[');
      const start = idx + '"results":'.length;
      let depth = 0;
      let end = start;
      for (let i = start; i < decoded.length; i++) {
        if (decoded[i] === '[') depth++;
        else if (decoded[i] === ']') depth--;
        if (depth === 0) { end = i + 1; break; }
      }
      try {
        results = JSON.parse(decoded.slice(start, end));
      } catch (e) {
        console.warn('[results-scraper] Failed to parse results JSON');
      }
    }

    // Extract event detail
    if (!event && decoded.includes('"from_date"') && decoded.includes('"starters"')) {
      const match = decoded.match(/"data":(\{[^}]*"from_date"[^}]*"starters":\d+[^}]*\})/);
      if (match) {
        try {
          event = JSON.parse(match[1]);
        } catch {
          // Will use fallback data
        }
      }
    }
  }

  return { results, event };
}

export class ResultsScraperService {
  /**
   * Scrape and sync results for a single rally by round number
   */
  static async scrapeRally(round: number, season = 2025): Promise<{
    rally: string;
    crews: number;
    results: number;
  }> {
    const eventInfo = EWRC_2025_EVENTS.find(e => e.round === round);
    if (!eventInfo) throw new Error(`No eWRC mapping for round ${round}`);

    console.log(`[results-scraper] Fetching round ${round}: ${eventInfo.name}`);
    const html = await fetchEwrcPage(eventInfo.ewrcId, eventInfo.slug);
    const { results, event } = extractResultsFromRSC(html);

    if (results.length === 0) {
      throw new Error(`No results found for ${eventInfo.name}`);
    }

    // Filter to RC1 (WRC class) only
    const wrcResults = results.filter(r =>
      r.classes?.some(c => c.name === 'RC1')
    );

    console.log(`[results-scraper] ${eventInfo.name}: ${results.length} total, ${wrcResults.length} RC1/WRC`);

    // Ensure rally exists in DB with correct data
    const rallyRow = await this.ensureRally(eventInfo, event, season);
    const rallyId = rallyRow.id;

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

    console.log(`[results-scraper] ${eventInfo.name}: ${crewCount} crews, ${resultCount} results upserted`);
    return { rally: eventInfo.name, crews: crewCount, results: resultCount };
  }

  /**
   * Scrape and sync all rallies for the season
   */
  static async scrapeAllRallies(season = 2025): Promise<{
    synced: { rally: string; crews: number; results: number }[];
    errors: { rally: string; error: string }[];
  }> {
    const synced = [];
    const errors = [];

    for (const event of EWRC_2025_EVENTS) {
      try {
        const result = await this.scrapeRally(event.round, season);
        synced.push(result);
        // Be polite — 1s delay between requests
        await new Promise(r => setTimeout(r, 1000));
      } catch (err: any) {
        console.warn(`[results-scraper] ${event.name} failed: ${err.message}`);
        errors.push({ rally: event.name, error: err.message });
      }
    }

    return { synced, errors };
  }

  private static async ensureRally(
    eventInfo: { round: number; name: string; ewrcId: number },
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
         start_date = EXCLUDED.start_date,
         end_date = EXCLUDED.end_date,
         status = 'completed',
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [season, eventInfo.round, eventInfo.name, officialName, country, surface, startDate, endDate]
    );
    return result.rows[0];
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
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [codriverName, `${entry.codriver.firstname} ${entry.codriver.lastname}`, codriverNat]
    );
    let codriverId: number;
    if (codriverResult.rows.length > 0) {
      codriverId = codriverResult.rows[0].id;
    } else {
      const existing = await pool.query(
        'SELECT id FROM wrc_codrivers WHERE name = $1 LIMIT 1',
        [codriverName]
      );
      codriverId = existing.rows[0]?.id;
    }

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
    rallyId: number,
    crewId: number,
    entry: EwrcResult,
    winnerTimeMs: number
  ): Promise<void> {
    const totalTimeMs = entry.time?.raw || null; // eWRC raw is already in ms
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
