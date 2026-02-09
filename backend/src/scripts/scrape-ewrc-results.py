#!/usr/bin/env python3
"""
eWRC Results Scraper
Scrapes rally results from ewrc-results.com
Uses VPN rotation every 20 requests (same Surfshark pattern as F1 scraper)
"""

import os
import sys
import time
import random
import subprocess
import psycopg2
import requests
from bs4 import BeautifulSoup

# ── Config ────────────────────────────────────────────────────────────────────

DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'dbname': 'motor_racing',
    'user': 'postgres',
    'password': 'postgres'
}

BASE_URL = 'https://www.ewrc-results.com'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
}

VPN_SERVERS = [
    'uk-lon', 'uk-man', 'de-fra', 'de-ber', 'nl-ams',
    'fr-par', 'se-sto', 'no-osl', 'fi-hel', 'es-mad',
    'it-mil', 'at-vie', 'be-bru', 'dk-cop', 'ie-dub',
]

SUDO_PASSWORD = 'Hamm3rt1me'
request_count = 0
MAX_REQUESTS_BEFORE_ROTATE = 20


# ── VPN Management ────────────────────────────────────────────────────────────

def get_current_ip():
    """Get current public IP"""
    try:
        r = requests.get('https://api.ipify.org', timeout=10)
        return r.text.strip()
    except:
        return 'unknown'


def kill_vpn():
    """Kill any existing VPN connection"""
    try:
        cmd = f'echo {SUDO_PASSWORD} | sudo -S killall openvpn 2>/dev/null'
        subprocess.run(cmd, shell=True, capture_output=True, timeout=10)
        time.sleep(2)
    except:
        pass


def connect_vpn(server=None):
    """Connect to a Surfshark VPN server"""
    kill_vpn()

    if server is None:
        server = random.choice(VPN_SERVERS)

    config_path = f'/tmp/{server}.prod.surfshark.com_udp.ovpn'
    auth_path = '/tmp/surfshark-auth.txt'

    if not os.path.exists(config_path):
        print(f'  [VPN] Config not found: {config_path}')
        return False

    try:
        cmd = f'echo {SUDO_PASSWORD} | sudo -S openvpn --config {config_path} --auth-user-pass {auth_path} --daemon'
        subprocess.run(cmd, shell=True, capture_output=True, timeout=15)
        time.sleep(8)

        ip = get_current_ip()
        print(f'  [VPN] Connected to {server} — IP: {ip}')
        return True
    except Exception as e:
        print(f'  [VPN] Failed to connect: {e}')
        return False


def maybe_rotate_vpn():
    """Rotate VPN after MAX_REQUESTS_BEFORE_ROTATE requests"""
    global request_count
    request_count += 1
    if request_count >= MAX_REQUESTS_BEFORE_ROTATE:
        print(f'\n  [VPN] Rotating after {request_count} requests...')
        connect_vpn()
        request_count = 0


# ── Scraping ──────────────────────────────────────────────────────────────────

def fetch_page(url, retries=3):
    """Fetch a page with retries and VPN rotation"""
    maybe_rotate_vpn()

    for attempt in range(retries):
        try:
            time.sleep(random.uniform(1.5, 3.5))
            r = requests.get(url, headers=HEADERS, timeout=30)
            if r.status_code == 200:
                return BeautifulSoup(r.text, 'html.parser')
            elif r.status_code == 429:
                print(f'  [HTTP] Rate limited, waiting 60s...')
                time.sleep(60)
                connect_vpn()
            else:
                print(f'  [HTTP] {r.status_code} for {url}')
        except Exception as e:
            print(f'  [HTTP] Error (attempt {attempt+1}): {e}')
            if attempt < retries - 1:
                connect_vpn()
                time.sleep(5)

    return None


def scrape_season(year):
    """Scrape the season page to get rally links"""
    url = f'{BASE_URL}/season/{year}/1-wrc/'
    print(f'\n[eWRC] Scraping season {year}: {url}')
    soup = fetch_page(url)
    if not soup:
        print(f'  Failed to fetch season page')
        return []

    rallies = []
    # Look for rally links in the season page
    for link in soup.select('a[href*="/results/"]'):
        href = link.get('href', '')
        if '/results/' in href and href.count('/') >= 2:
            rally_name = link.get_text(strip=True)
            if rally_name and len(rally_name) > 2:
                full_url = BASE_URL + href if href.startswith('/') else href
                rallies.append({
                    'name': rally_name,
                    'url': full_url,
                    'slug': href.split('/results/')[-1].rstrip('/'),
                })

    print(f'  Found {len(rallies)} rallies')
    return rallies


def scrape_rally_results(rally_url, rally_name, year, conn):
    """Scrape overall results for a rally"""
    print(f'\n  [eWRC] Scraping results: {rally_name}')
    soup = fetch_page(rally_url)
    if not soup:
        print(f'    Failed to fetch rally page')
        return 0

    cur = conn.cursor()
    upserted = 0

    # Look for the results table
    tables = soup.select('table')
    for table in tables:
        rows = table.select('tr')
        for row in rows[1:]:  # Skip header
            cells = row.select('td')
            if len(cells) < 4:
                continue

            try:
                pos_text = cells[0].get_text(strip=True)
                position = None
                if pos_text.isdigit():
                    position = int(pos_text)

                # Driver name is usually in a link
                driver_link = cells[1].select_one('a') if len(cells) > 1 else None
                driver_name = driver_link.get_text(strip=True) if driver_link else cells[1].get_text(strip=True)

                if not driver_name or len(driver_name) < 2:
                    continue

                # Try to extract codriver, team, time from remaining cells
                codriver_name = cells[2].get_text(strip=True) if len(cells) > 2 else None
                team_name = cells[3].get_text(strip=True) if len(cells) > 3 else None
                time_text = cells[4].get_text(strip=True) if len(cells) > 4 else None

                # Upsert driver
                cur.execute(
                    """INSERT INTO wrc_drivers (name, full_name)
                       VALUES (%s, %s)
                       ON CONFLICT DO NOTHING
                       RETURNING id""",
                    (driver_name, driver_name)
                )
                result = cur.fetchone()
                if result:
                    driver_id = result[0]
                else:
                    cur.execute("SELECT id FROM wrc_drivers WHERE name = %s LIMIT 1", (driver_name,))
                    row_result = cur.fetchone()
                    if not row_result:
                        continue
                    driver_id = row_result[0]

                # Find or create rally
                cur.execute(
                    "SELECT id FROM wrc_rallies WHERE name ILIKE %s AND season = %s LIMIT 1",
                    (f'%{rally_name}%', year)
                )
                rally_row = cur.fetchone()
                if not rally_row:
                    continue
                rally_id = rally_row[0]

                # Upsert crew
                cur.execute(
                    """INSERT INTO wrc_crews (rally_id, driver_id, team_name, status)
                       VALUES (%s, %s, %s, %s)
                       ON CONFLICT (rally_id, driver_id) DO UPDATE SET
                         team_name = COALESCE(EXCLUDED.team_name, wrc_crews.team_name),
                         updated_at = CURRENT_TIMESTAMP
                       RETURNING id""",
                    (rally_id, driver_id, team_name, 'finished' if position else 'retired')
                )
                crew_row = cur.fetchone()
                if not crew_row:
                    continue
                crew_id = crew_row[0]

                # Upsert overall result
                cur.execute(
                    """INSERT INTO wrc_overall_results (rally_id, crew_id, overall_position, status)
                       VALUES (%s, %s, %s, %s)
                       ON CONFLICT (rally_id, crew_id) DO UPDATE SET
                         overall_position = COALESCE(EXCLUDED.overall_position, wrc_overall_results.overall_position),
                         status = COALESCE(EXCLUDED.status, wrc_overall_results.status),
                         updated_at = CURRENT_TIMESTAMP""",
                    (rally_id, crew_id, position, 'finished' if position else 'retired')
                )

                upserted += 1

            except Exception as e:
                print(f'    Error parsing row: {e}')
                continue

    conn.commit()
    print(f'    Upserted {upserted} results')
    return upserted


def scrape_stage_times(rally_slug, rally_name, year, conn):
    """Scrape stage times for a rally"""
    url = f'{BASE_URL}/times/{rally_slug}/'
    print(f'  [eWRC] Scraping stage times: {url}')
    soup = fetch_page(url)
    if not soup:
        print(f'    Failed to fetch stage times page')
        return 0

    # Stage times scraping is more complex and depends on the page structure
    # This is a placeholder — the actual scraping logic would need to be
    # adapted based on the eWRC HTML structure
    print(f'    Stage times scraping not yet fully implemented')
    return 0


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    year = int(sys.argv[1]) if len(sys.argv) > 1 else 2025

    print(f'=== eWRC Results Scraper — Season {year} ===')
    print(f'Current IP: {get_current_ip()}')

    # Connect to VPN
    print('\n[VPN] Connecting...')
    connect_vpn()

    # Connect to database
    conn = psycopg2.connect(**DB_CONFIG)
    print(f'[DB] Connected to {DB_CONFIG["dbname"]}')

    try:
        # Scrape season
        rallies = scrape_season(year)

        total_results = 0
        for rally in rallies:
            try:
                count = scrape_rally_results(rally['url'], rally['name'], year, conn)
                total_results += count
            except Exception as e:
                print(f'  Error scraping {rally["name"]}: {e}')
                conn.rollback()

        print(f'\n=== Scraping complete: {total_results} total results ===')

    finally:
        conn.close()
        kill_vpn()
        print('[VPN] Disconnected')


if __name__ == '__main__':
    main()
