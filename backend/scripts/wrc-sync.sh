#!/bin/bash
################################################################################
# WRC Data Sync Script
#
# Syncs rally data from WRC API and eWRC scraper.
# Called by cron with different modes:
#
#   daily            - Calendar, standings, upcoming stages (4 AM daily)
#   rally-weekend    - Scrape results during active rally (every 30 mins Thu-Sun)
#   post-rally       - Recompute driver stats (Monday 5 AM)
#
# Usage: ./wrc-sync.sh <mode>
################################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/../logs/wrc-sync.log"
BACKEND_URL="http://localhost:4010/api/wrc/sync"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

call_endpoint() {
    local endpoint="$1"
    local description="$2"
    local response
    local http_code

    log "  → $description..."
    response=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/$endpoint" 2>&1)
    http_code=$(echo "$response" | tail -1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "200" ]; then
        log "  ✓ $description completed (HTTP $http_code)"
    else
        log "  ✗ $description failed (HTTP $http_code): $body"
    fi
}

MODE="${1:-daily}"

log "=========================================="
log "WRC Sync: mode=$MODE"
log "=========================================="

case "$MODE" in
    daily)
        call_endpoint "calendar" "Sync rally calendar"
        call_endpoint "standings" "Sync standings from WRC API"
        call_endpoint "scrape-standings" "Scrape standings from Toyota"
        call_endpoint "scrape-upcoming-stages" "Scrape upcoming stage schedules"
        ;;

    rally-weekend)
        # Check if there's an active rally this week before scraping
        ACTIVE_RALLY=$(PGPASSWORD=postgres psql -h localhost -U postgres -d motor_racing -t -c \
            "SELECT COUNT(*) FROM wrc_rallies
             WHERE start_date <= CURRENT_DATE + INTERVAL '1 day'
             AND end_date >= CURRENT_DATE - INTERVAL '1 day'
             AND season = EXTRACT(YEAR FROM CURRENT_DATE);" 2>/dev/null | xargs)

        if [ "$ACTIVE_RALLY" -gt 0 ] 2>/dev/null; then
            log "Active rally detected - scraping results"
            call_endpoint "scrape-results" "Scrape rally results from eWRC"
            call_endpoint "season" "Sync season data from WRC API"
        else
            log "No active rally this week - skipping"
        fi
        ;;

    post-rally)
        # Check if a rally ended yesterday or over the weekend
        ENDED_RALLY=$(PGPASSWORD=postgres psql -h localhost -U postgres -d motor_racing -t -c \
            "SELECT COUNT(*) FROM wrc_rallies
             WHERE end_date BETWEEN CURRENT_DATE - INTERVAL '2 days' AND CURRENT_DATE
             AND season = EXTRACT(YEAR FROM CURRENT_DATE);" 2>/dev/null | xargs)

        if [ "$ENDED_RALLY" -gt 0 ] 2>/dev/null; then
            log "Rally ended recently - running post-rally sync"
            call_endpoint "scrape-results" "Final results scrape"
            call_endpoint "season" "Full season sync"
            call_endpoint "scrape-standings" "Update standings"
            call_endpoint "recompute-stats" "Recompute driver statistics"
        else
            log "No recently ended rally - skipping"
        fi
        ;;

    *)
        log "Unknown mode: $MODE"
        log "Usage: $0 {daily|rally-weekend|post-rally}"
        exit 1
        ;;
esac

log "Sync complete"
log "=========================================="
