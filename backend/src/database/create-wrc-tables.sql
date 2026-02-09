-- WRC Tables for motor_racing database
-- Tables use wrc_ prefix to coexist with F1 tables

-- 1. Manufacturers
CREATE TABLE IF NOT EXISTS wrc_manufacturers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  nationality VARCHAR(100),
  base VARCHAR(255),
  championships INTEGER DEFAULT 0,
  logo_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Drivers
CREATE TABLE IF NOT EXISTS wrc_drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  nationality VARCHAR(100),
  birth_date DATE,
  career_starts INTEGER DEFAULT 0,
  career_wins INTEGER DEFAULT 0,
  career_podiums INTEGER DEFAULT 0,
  career_stage_wins INTEGER DEFAULT 0,
  career_points NUMERIC(10,2) DEFAULT 0,
  photo_url VARCHAR(255),
  wrc_api_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Co-drivers
CREATE TABLE IF NOT EXISTS wrc_codrivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  nationality VARCHAR(100),
  birth_date DATE,
  career_starts INTEGER DEFAULT 0,
  career_wins INTEGER DEFAULT 0,
  wrc_api_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Rallies (calendar/events)
CREATE TABLE IF NOT EXISTS wrc_rallies (
  id SERIAL PRIMARY KEY,
  season INTEGER NOT NULL,
  round INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  official_name VARCHAR(255),
  country VARCHAR(100),
  surface VARCHAR(50),
  start_date DATE,
  end_date DATE,
  total_stages INTEGER,
  status VARCHAR(50) DEFAULT 'upcoming',
  event_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season, round)
);

-- 5. Stages
CREATE TABLE IF NOT EXISTS wrc_stages (
  id SERIAL PRIMARY KEY,
  rally_id INTEGER REFERENCES wrc_rallies(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL,
  name VARCHAR(255),
  distance_km NUMERIC(8,2),
  surface VARCHAR(50),
  is_power_stage BOOLEAN DEFAULT FALSE,
  leg INTEGER,
  stage_date DATE,
  start_time TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(rally_id, stage_number)
);

-- 6. Crews (driver+codriver entry per rally)
CREATE TABLE IF NOT EXISTS wrc_crews (
  id SERIAL PRIMARY KEY,
  rally_id INTEGER REFERENCES wrc_rallies(id) ON DELETE CASCADE,
  driver_id INTEGER REFERENCES wrc_drivers(id),
  codriver_id INTEGER REFERENCES wrc_codrivers(id),
  manufacturer_id INTEGER REFERENCES wrc_manufacturers(id),
  car_number INTEGER,
  car_class VARCHAR(50),
  team_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'running',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(rally_id, driver_id)
);

-- 7. Stage results
CREATE TABLE IF NOT EXISTS wrc_stage_results (
  id SERIAL PRIMARY KEY,
  stage_id INTEGER REFERENCES wrc_stages(id) ON DELETE CASCADE,
  crew_id INTEGER REFERENCES wrc_crews(id) ON DELETE CASCADE,
  stage_time_ms INTEGER,
  stage_position INTEGER,
  overall_time_ms INTEGER,
  overall_position INTEGER,
  gap_first_ms INTEGER,
  gap_prev_ms INTEGER,
  penalty_time_ms INTEGER DEFAULT 0,
  penalty_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(stage_id, crew_id)
);

-- 8. Overall results
CREATE TABLE IF NOT EXISTS wrc_overall_results (
  id SERIAL PRIMARY KEY,
  rally_id INTEGER REFERENCES wrc_rallies(id) ON DELETE CASCADE,
  crew_id INTEGER REFERENCES wrc_crews(id) ON DELETE CASCADE,
  overall_position INTEGER,
  total_time_ms INTEGER,
  gap_first_ms INTEGER,
  points_overall NUMERIC(6,2) DEFAULT 0,
  points_power_stage NUMERIC(6,2) DEFAULT 0,
  points_super_sunday NUMERIC(6,2) DEFAULT 0,
  points_total NUMERIC(6,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'finished',
  retirement_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(rally_id, crew_id)
);

-- 9. Driver standings
CREATE TABLE IF NOT EXISTS wrc_driver_standings (
  id SERIAL PRIMARY KEY,
  season INTEGER NOT NULL,
  position INTEGER,
  driver_id INTEGER REFERENCES wrc_drivers(id),
  manufacturer VARCHAR(255),
  points NUMERIC(10,2) DEFAULT 0,
  wins INTEGER DEFAULT 0,
  podiums INTEGER DEFAULT 0,
  stage_wins INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season, driver_id)
);

-- 10. Manufacturer standings
CREATE TABLE IF NOT EXISTS wrc_manufacturer_standings (
  id SERIAL PRIMARY KEY,
  season INTEGER NOT NULL,
  position INTEGER,
  manufacturer_id INTEGER REFERENCES wrc_manufacturers(id),
  points NUMERIC(10,2) DEFAULT 0,
  wins INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(season, manufacturer_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_wrc_rallies_season ON wrc_rallies(season);
CREATE INDEX IF NOT EXISTS idx_wrc_stages_rally ON wrc_stages(rally_id);
CREATE INDEX IF NOT EXISTS idx_wrc_crews_rally ON wrc_crews(rally_id);
CREATE INDEX IF NOT EXISTS idx_wrc_crews_driver ON wrc_crews(driver_id);
CREATE INDEX IF NOT EXISTS idx_wrc_stage_results_stage ON wrc_stage_results(stage_id);
CREATE INDEX IF NOT EXISTS idx_wrc_stage_results_crew ON wrc_stage_results(crew_id);
CREATE INDEX IF NOT EXISTS idx_wrc_overall_results_rally ON wrc_overall_results(rally_id);
CREATE INDEX IF NOT EXISTS idx_wrc_driver_standings_season ON wrc_driver_standings(season);
CREATE INDEX IF NOT EXISTS idx_wrc_manufacturer_standings_season ON wrc_manufacturer_standings(season);
