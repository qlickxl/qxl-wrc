import axios from 'axios';
import * as cheerio from 'cheerio';
import pool from '../config/database';

type $ = ReturnType<typeof cheerio.load>;

const TGR_STANDINGS_URL = 'https://toyotagazooracing.com/wrc/standings';

// Map flag image filenames to nationalities
const FLAG_TO_NATIONALITY: Record<string, string> = {
  france: 'French',
  england: 'British',
  finland: 'Finnish',
  estonia: 'Estonian',
  belgium: 'Belgian',
  japan: 'Japanese',
  sweden: 'Swedish',
  netherlands: 'Dutch',
  ireland: 'Irish',
  spain: 'Spanish',
  germany: 'German',
  norway: 'Norwegian',
  austria: 'Austrian',
  italy: 'Italian',
  poland: 'Polish',
  chile: 'Chilean',
  mexico: 'Mexican',
  new_zealand: 'New Zealander',
  australia: 'Australian',
  czech: 'Czech',
  czech_republic: 'Czech',
};

function nationalityFromFlag(flagUrl: string): string | null {
  // Try icon_country_ pattern first (most URLs use this)
  let match = flagUrl.match(/icon_country_(\w+)\.png/);
  if (match) {
    const key = match[1].toLowerCase();
    return FLAG_TO_NATIONALITY[key] || key;
  }
  // Fall back to /flag/name.png (e.g. netherlands.png)
  match = flagUrl.match(/\/flag\/(\w+)\.png/);
  if (match) {
    const key = match[1].toLowerCase();
    return FLAG_TO_NATIONALITY[key] || key;
  }
  return null;
}

// Map manufacturer display names to canonical short names
const MANUFACTURER_NAMES: Record<string, string> = {
  'TOYOTA GAZOO Racing WRT': 'Toyota',
  'Hyundai Shell Mobis World Rally Team': 'Hyundai',
  'M-Sport Ford World Rally Team': 'M-Sport Ford',
  'TOYOTA GAZOO Racing WRT2': 'Toyota WRT2',
};

// Map driver short names from TGR to team (manufacturer) names
// This is resolved dynamically from the page data where possible

interface ScrapedDriver {
  position: number;
  name: string;
  nationality: string | null;
  points: number;
}

interface ScrapedManufacturer {
  position: number;
  name: string;
  fullName: string;
  nationality: string | null;
  points: number;
}

export class StandingsScraperService {
  /**
   * Scrape and upsert standings for a given season
   */
  static async scrapeAndSync(season?: number): Promise<{
    drivers: number;
    manufacturers: number;
    season: number;
  }> {
    const targetSeason = season || new Date().getFullYear();
    const url = `${TGR_STANDINGS_URL}/${targetSeason}/`;

    console.log(`[standings-scraper] Fetching ${url}`);
    const { data: html } = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html',
      },
    });

    const $ = cheerio.load(html);

    // Parse manufacturers
    const manufacturers = this.parseManufacturers($);
    console.log(`[standings-scraper] Parsed ${manufacturers.length} manufacturers`);

    // Parse drivers
    const drivers = this.parseDrivers($);
    console.log(`[standings-scraper] Parsed ${drivers.length} drivers`);

    // Upsert into DB
    const mfgCount = await this.upsertManufacturerStandings(targetSeason, manufacturers);
    const driverCount = await this.upsertDriverStandings(targetSeason, drivers, manufacturers);

    console.log(`[standings-scraper] Synced ${driverCount} drivers, ${mfgCount} manufacturers for ${targetSeason}`);
    return { drivers: driverCount, manufacturers: mfgCount, season: targetSeason };
  }

  private static parseManufacturers($: $): ScrapedManufacturer[] {
    const manufacturers: ScrapedManufacturer[] = [];

    // Rows between MANUFACTURERS' RANKING START and END comments
    const mfgTable = $('div.tmp_ranking_box').first().find('table tr').filter((_i, el) => {
      return $(el).children('td').length > 0;
    });

    mfgTable.each((_i, el) => {
      const tds = $(el).children('td');
      const position = parseInt(tds.eq(0).text().trim());
      const fullName = tds.eq(1).find('.driver-name').text().trim();
      const flagImg = tds.eq(1).find('img').attr('src') || '';
      const points = parseInt(tds.eq(2).text().trim()) || 0;

      if (!fullName || isNaN(position)) return;

      manufacturers.push({
        position,
        name: MANUFACTURER_NAMES[fullName] || fullName,
        fullName,
        nationality: nationalityFromFlag(flagImg),
        points,
      });
    });

    return manufacturers;
  }

  private static parseDrivers($: $): ScrapedDriver[] {
    const drivers: ScrapedDriver[] = [];

    // The drivers table is the second tmp_ranking_box
    const driverTable = $('div.tmp_ranking_box').eq(1).find('table tr').filter((_i, el) => {
      return $(el).children('td').length > 0;
    });

    driverTable.each((_i, el) => {
      const tds = $(el).children('td');
      const position = parseInt(tds.eq(0).text().trim());
      const name = tds.eq(1).find('.driver-name').text().trim();
      const flagImg = tds.eq(1).find('img').attr('src') || '';
      const points = parseInt(tds.eq(2).text().trim()) || 0;

      if (!name || isNaN(position)) return;

      drivers.push({
        position,
        name,
        nationality: nationalityFromFlag(flagImg),
        points,
      });
    });

    return drivers;
  }

  private static async upsertManufacturerStandings(
    season: number,
    manufacturers: ScrapedManufacturer[]
  ): Promise<number> {
    let count = 0;

    for (const mfg of manufacturers) {
      // Upsert into wrc_manufacturers
      const mfgResult = await pool.query(
        `INSERT INTO wrc_manufacturers (name, full_name, nationality)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET
           full_name = COALESCE(EXCLUDED.full_name, wrc_manufacturers.full_name),
           nationality = EXCLUDED.nationality,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [mfg.name, mfg.fullName, mfg.nationality]
      );
      const mfgId = mfgResult.rows[0].id;

      // Upsert into wrc_manufacturer_standings
      await pool.query(
        `INSERT INTO wrc_manufacturer_standings (season, position, manufacturer_id, points)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (season, manufacturer_id) DO UPDATE SET
           position = EXCLUDED.position,
           points = EXCLUDED.points,
           updated_at = CURRENT_TIMESTAMP`,
        [season, mfg.position, mfgId, mfg.points]
      );
      count++;
    }

    return count;
  }

  private static async upsertDriverStandings(
    season: number,
    drivers: ScrapedDriver[],
    manufacturers: ScrapedManufacturer[]
  ): Promise<number> {
    // Build a rough driver→manufacturer mapping from known team affiliations
    const DRIVER_TEAM_MAP: Record<string, string> = {
      'S. OGIER': 'Toyota',
      'E. EVANS': 'Toyota',
      'K. ROVANPERÄ': 'Toyota',
      'T. KATSUTA': 'Toyota WRT2',
      'O. TÄNAK': 'Hyundai',
      'T. NEUVILLE': 'Hyundai',
      'A. FOURMAUX': 'M-Sport Ford',
      'S. PAJARI': 'Toyota WRT2',
      'O. SOLBERG': 'Toyota WRT2',
      'G. MUNSTER': 'M-Sport Ford',
      'J. MCERLEAN': 'M-Sport Ford',
      'D. SORDO': 'Hyundai',
    };

    let count = 0;

    for (const driver of drivers) {
      // Normalize name: "S. OGIER" → "Ogier S."
      const normalizedName = this.normalizeName(driver.name);

      // Upsert into wrc_drivers
      const driverResult = await pool.query(
        `INSERT INTO wrc_drivers (name, full_name, nationality)
         VALUES ($1, $2, $3)
         ON CONFLICT (name) DO UPDATE SET
           full_name = COALESCE(EXCLUDED.full_name, wrc_drivers.full_name),
           nationality = EXCLUDED.nationality,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [normalizedName, driver.name, driver.nationality]
      );
      const driverId = driverResult.rows[0].id;

      // Resolve manufacturer name for standings
      const teamName = DRIVER_TEAM_MAP[driver.name] || null;

      // Upsert into wrc_driver_standings
      await pool.query(
        `INSERT INTO wrc_driver_standings (season, position, driver_id, manufacturer, points)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (season, driver_id) DO UPDATE SET
           position = EXCLUDED.position,
           manufacturer = COALESCE(EXCLUDED.manufacturer, wrc_driver_standings.manufacturer),
           points = EXCLUDED.points,
           updated_at = CURRENT_TIMESTAMP`,
        [season, driver.position, driverId, teamName, driver.points]
      );
      count++;
    }

    return count;
  }

  /**
   * Convert "S. OGIER" → "Ogier S." for DB consistency
   */
  private static normalizeName(tgrName: string): string {
    const parts = tgrName.split(/\s+/);
    if (parts.length < 2) return tgrName;
    // First part is initial (e.g. "S."), rest is surname
    const initial = parts[0];
    const surname = parts.slice(1).map(p =>
      p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    ).join(' ');
    // Handle accented chars — keep them as-is
    return `${surname} ${initial}`;
  }
}
