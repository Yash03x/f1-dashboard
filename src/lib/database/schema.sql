-- F1 Dashboard Enterprise Database Schema
-- This schema supports pre-loaded data for instant page loads

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Seasons table
CREATE TABLE seasons (
  id VARCHAR(4) PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_completeness DECIMAL(3,2) DEFAULT 0.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Circuits table
CREATE TABLE circuits (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  country VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  altitude INTEGER,
  url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constructors table
CREATE TABLE constructors (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  nationality VARCHAR(100),
  url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drivers table
CREATE TABLE drivers (
  id VARCHAR(50) PRIMARY KEY,
  driver_code VARCHAR(3) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  nationality VARCHAR(100),
  date_of_birth DATE,
  url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Races table with pre-loaded data
CREATE TABLE races (
  id SERIAL PRIMARY KEY,
  season_id VARCHAR(4) REFERENCES seasons(id) ON DELETE CASCADE,
  circuit_id VARCHAR(50) REFERENCES circuits(id),
  round INTEGER NOT NULL,
  race_name VARCHAR(255) NOT NULL,
  race_date DATE,
  qualifying_date DATE,
  sprint_date DATE,
  
  -- Pre-loaded race data (JSONB for flexibility)
  race_results JSONB, -- Complete race results
  qualifying_results JSONB, -- Complete qualifying results
  sprint_results JSONB, -- Sprint race results (if applicable)
  lap_times JSONB, -- Lap times for all drivers
  pit_stops JSONB, -- Pit stop data
  fastest_laps JSONB, -- Fastest lap data
  
  -- Metadata
  status VARCHAR(50) DEFAULT 'scheduled',
  weather_data JSONB, -- Weather conditions
  track_conditions JSONB, -- Track temperature, grip, etc.
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(season_id, round)
);

-- Driver standings (pre-loaded)
CREATE TABLE driver_standings (
  id SERIAL PRIMARY KEY,
  season_id VARCHAR(4) REFERENCES seasons(id) ON DELETE CASCADE,
  race_id INTEGER REFERENCES races(id) ON DELETE CASCADE,
  driver_id VARCHAR(50) REFERENCES drivers(id),
  
  -- Standing data
  position INTEGER,
  points DECIMAL(10,2) DEFAULT 0,
  wins INTEGER DEFAULT 0,
  podiums INTEGER DEFAULT 0,
  fastest_laps INTEGER DEFAULT 0,
  
  -- Additional stats
  races_entered INTEGER DEFAULT 0,
  races_finished INTEGER DEFAULT 0,
  dnf_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(season_id, race_id, driver_id)
);

-- Constructor standings (pre-loaded)
CREATE TABLE constructor_standings (
  id SERIAL PRIMARY KEY,
  season_id VARCHAR(4) REFERENCES seasons(id) ON DELETE CASCADE,
  race_id INTEGER REFERENCES races(id) ON DELETE CASCADE,
  constructor_id VARCHAR(50) REFERENCES constructors(id),
  
  -- Standing data
  position INTEGER,
  points DECIMAL(10,2) DEFAULT 0,
  wins INTEGER DEFAULT 0,
  podiums INTEGER DEFAULT 0,
  fastest_laps INTEGER DEFAULT 0,
  
  -- Additional stats
  races_entered INTEGER DEFAULT 0,
  races_finished INTEGER DEFAULT 0,
  dnf_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(season_id, race_id, constructor_id)
);

-- Driver-Constructor relationships
CREATE TABLE driver_constructor_seasons (
  id SERIAL PRIMARY KEY,
  season_id VARCHAR(4) REFERENCES seasons(id) ON DELETE CASCADE,
  driver_id VARCHAR(50) REFERENCES drivers(id),
  constructor_id VARCHAR(50) REFERENCES constructors(id),
  
  -- Contract details
  car_number INTEGER,
  is_reserve BOOLEAN DEFAULT false,
  start_race INTEGER, -- Which race they joined (for mid-season changes)
  end_race INTEGER, -- Which race they left (for mid-season changes)
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(season_id, driver_id, constructor_id)
);

-- Telemetry data (for real-time features)
CREATE TABLE telemetry_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id INTEGER REFERENCES races(id) ON DELETE CASCADE,
  driver_id VARCHAR(50) REFERENCES drivers(id),
  lap_number INTEGER,
  sector_number INTEGER,
  
  -- Telemetry data
  timestamp TIMESTAMP WITH TIME ZONE,
  speed DECIMAL(8,2), -- km/h
  throttle DECIMAL(5,2), -- percentage
  brake DECIMAL(5,2), -- percentage
  gear INTEGER,
  rpm INTEGER,
  engine_rpm INTEGER,
  fuel_flow DECIMAL(8,2),
  fuel_remaining DECIMAL(8,2),
  
  -- Position data
  x_position DECIMAL(10,6),
  y_position DECIMAL(10,6),
  z_position DECIMAL(10,6),
  
  -- Weather/track data
  track_temperature DECIMAL(5,2),
  air_temperature DECIMAL(5,2),
  humidity DECIMAL(5,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data sync tracking
CREATE TABLE data_sync_logs (
  id SERIAL PRIMARY KEY,
  sync_type VARCHAR(50) NOT NULL, -- 'season', 'race', 'standings', etc.
  season_id VARCHAR(4) REFERENCES seasons(id),
  race_id INTEGER REFERENCES races(id),
  
  -- Sync details
  status VARCHAR(20) NOT NULL, -- 'started', 'completed', 'failed'
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  
  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cache invalidation tracking
CREATE TABLE cache_invalidations (
  id SERIAL PRIMARY KEY,
  cache_key VARCHAR(255) NOT NULL,
  invalidation_reason VARCHAR(100),
  invalidated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_races_season_round ON races(season_id, round);
CREATE INDEX idx_races_date ON races(race_date);
CREATE INDEX idx_driver_standings_season_race ON driver_standings(season_id, race_id);
CREATE INDEX idx_constructor_standings_season_race ON constructor_standings(season_id, race_id);
CREATE INDEX idx_telemetry_race_driver_lap ON telemetry_data(race_id, driver_id, lap_number);
CREATE INDEX idx_telemetry_timestamp ON telemetry_data(timestamp);
CREATE INDEX idx_sync_logs_season_type ON data_sync_logs(season_id, sync_type);
CREATE INDEX idx_sync_logs_status ON data_sync_logs(status);

-- JSONB indexes for efficient querying
CREATE INDEX idx_races_results_gin ON races USING GIN (race_results);
CREATE INDEX idx_races_qualifying_gin ON races USING GIN (qualifying_results);
CREATE INDEX idx_races_lap_times_gin ON races USING GIN (lap_times);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_constructors_updated_at BEFORE UPDATE ON constructors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_races_updated_at BEFORE UPDATE ON races
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_standings_updated_at BEFORE UPDATE ON driver_standings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_constructor_standings_updated_at BEFORE UPDATE ON constructor_standings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW current_season AS
SELECT * FROM seasons WHERE is_active = true ORDER BY year DESC LIMIT 1;

CREATE VIEW upcoming_races AS
SELECT 
  r.*,
  s.year as season_year,
  c.name as circuit_name,
  c.country as circuit_country
FROM races r
JOIN seasons s ON r.season_id = s.id
JOIN circuits c ON r.circuit_id = c.id
WHERE r.race_date >= CURRENT_DATE
ORDER BY r.race_date ASC;

CREATE VIEW latest_driver_standings AS
SELECT 
  ds.*,
  d.first_name,
  d.last_name,
  d.driver_code,
  d.nationality,
  c.name as constructor_name
FROM driver_standings ds
JOIN drivers d ON ds.driver_id = d.id
JOIN driver_constructor_seasons dcs ON ds.driver_id = dcs.driver_id AND ds.season_id = dcs.season_id
JOIN constructors c ON dcs.constructor_id = c.id
WHERE ds.race_id = (
  SELECT MAX(race_id) 
  FROM driver_standings ds2 
  WHERE ds2.season_id = ds.season_id
)
ORDER BY ds.position ASC;

-- Functions for data management
CREATE OR REPLACE FUNCTION calculate_season_completeness(season_id_param VARCHAR(4))
RETURNS DECIMAL(3,2) AS $$
DECLARE
  total_races INTEGER;
  completed_races INTEGER;
  completeness DECIMAL(3,2);
BEGIN
  -- Count total races in season
  SELECT COUNT(*) INTO total_races
  FROM races
  WHERE season_id = season_id_param;
  
  -- Count completed races (with results)
  SELECT COUNT(*) INTO completed_races
  FROM races
  WHERE season_id = season_id_param 
    AND race_results IS NOT NULL;
  
  -- Calculate completeness
  IF total_races = 0 THEN
    completeness := 0.0;
  ELSE
    completeness := ROUND((completed_races::DECIMAL / total_races::DECIMAL)::DECIMAL, 2);
  END IF;
  
  -- Update season completeness
  UPDATE seasons 
  SET data_completeness = completeness,
      updated_at = NOW()
  WHERE id = season_id_param;
  
  RETURN completeness;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing
INSERT INTO seasons (id, year, name, is_active) VALUES 
('2024', 2024, '2024 Formula 1 World Championship', true),
('2023', 2023, '2023 Formula 1 World Championship', false);

-- Sample circuits
INSERT INTO circuits (id, name, location, country) VALUES
('bahrain', 'Bahrain International Circuit', 'Sakhir', 'Bahrain'),
('jeddah', 'Jeddah Corniche Circuit', 'Jeddah', 'Saudi Arabia'),
('albert_park', 'Albert Park Circuit', 'Melbourne', 'Australia');

-- Sample constructors
INSERT INTO constructors (id, name, nationality) VALUES
('red_bull', 'Red Bull Racing', 'Austrian'),
('ferrari', 'Scuderia Ferrari', 'Italian'),
('mercedes', 'Mercedes', 'German'),
('mclaren', 'McLaren', 'British');

-- Sample drivers
INSERT INTO drivers (id, driver_code, first_name, last_name, nationality) VALUES
('max_verstappen', 'VER', 'Max', 'Verstappen', 'Dutch'),
('charles_leclerc', 'LEC', 'Charles', 'Leclerc', 'Monegasque'),
('lewis_hamilton', 'HAM', 'Lewis', 'Hamilton', 'British'),
('lando_norris', 'NOR', 'Lando', 'Norris', 'British');
