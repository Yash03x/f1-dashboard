-- Migration: Initial F1 Dashboard Schema
-- Created: 2024-12-30T12:00:00.000Z

-- UP:
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
  
  -- Pre-loaded data (JSONB for flexibility)
  race_results JSONB,
  qualifying_results JSONB,
  sprint_results JSONB,
  lap_times JSONB,
  pit_stops JSONB,
  fastest_laps JSONB,
  
  -- Metadata
  status VARCHAR(20) DEFAULT 'scheduled',
  weather_data JSONB,
  track_conditions JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(season_id, round)
);

-- Driver standings table
CREATE TABLE driver_standings (
  id SERIAL PRIMARY KEY,
  season_id VARCHAR(4) REFERENCES seasons(id) ON DELETE CASCADE,
  race_id INTEGER REFERENCES races(id) ON DELETE CASCADE,
  driver_id VARCHAR(50) REFERENCES drivers(id),
  
  -- Standings data
  position INTEGER NOT NULL,
  points DECIMAL(10,2) DEFAULT 0,
  wins INTEGER DEFAULT 0,
  podiums INTEGER DEFAULT 0,
  fastest_laps INTEGER DEFAULT 0,
  races_entered INTEGER DEFAULT 0,
  races_finished INTEGER DEFAULT 0,
  dnf_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(season_id, race_id, driver_id)
);

-- Constructor standings table
CREATE TABLE constructor_standings (
  id SERIAL PRIMARY KEY,
  season_id VARCHAR(4) REFERENCES seasons(id) ON DELETE CASCADE,
  race_id INTEGER REFERENCES races(id) ON DELETE CASCADE,
  constructor_id VARCHAR(50) REFERENCES constructors(id),
  
  -- Standings data
  position INTEGER NOT NULL,
  points DECIMAL(10,2) DEFAULT 0,
  wins INTEGER DEFAULT 0,
  podiums INTEGER DEFAULT 0,
  fastest_laps INTEGER DEFAULT 0,
  races_entered INTEGER DEFAULT 0,
  races_finished INTEGER DEFAULT 0,
  dnf_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(season_id, race_id, constructor_id)
);

-- Driver-Constructor season relationships
CREATE TABLE driver_constructor_seasons (
  id SERIAL PRIMARY KEY,
  season_id VARCHAR(4) REFERENCES seasons(id) ON DELETE CASCADE,
  driver_id VARCHAR(50) REFERENCES drivers(id),
  constructor_id VARCHAR(50) REFERENCES constructors(id),
  
  -- Additional data
  car_number INTEGER,
  is_reserve BOOLEAN DEFAULT false,
  start_race INTEGER,
  end_race INTEGER,
  
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
CREATE INDEX idx_races_circuit ON races(circuit_id);
CREATE INDEX idx_races_status ON races(status);

CREATE INDEX idx_driver_standings_season_race ON driver_standings(season_id, race_id);
CREATE INDEX idx_driver_standings_driver ON driver_standings(driver_id);
CREATE INDEX idx_driver_standings_position ON driver_standings(position);

CREATE INDEX idx_constructor_standings_season_race ON constructor_standings(season_id, race_id);
CREATE INDEX idx_constructor_standings_constructor ON constructor_standings(constructor_id);
CREATE INDEX idx_constructor_standings_position ON constructor_standings(position);

CREATE INDEX idx_telemetry_race_driver ON telemetry_data(race_id, driver_id);
CREATE INDEX idx_telemetry_timestamp ON telemetry_data(timestamp);
CREATE INDEX idx_telemetry_lap ON telemetry_data(lap_number);

CREATE INDEX idx_sync_logs_type_status ON data_sync_logs(sync_type, status);
CREATE INDEX idx_sync_logs_created ON data_sync_logs(created_at);

-- Full-text search indexes
CREATE INDEX idx_drivers_search ON drivers USING gin(to_tsvector('english', first_name || ' ' || last_name));
CREATE INDEX idx_constructors_search ON constructors USING gin(to_tsvector('english', name));

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

-- Function to calculate season completeness
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
    
    -- Count completed races
    SELECT COUNT(*) INTO completed_races
    FROM races
    WHERE season_id = season_id_param AND status = 'completed';
    
    -- Calculate completeness
    IF total_races = 0 THEN
        completeness := 0.0;
    ELSE
        completeness := ROUND((completed_races::DECIMAL / total_races::DECIMAL) * 100, 2);
    END IF;
    
    -- Update season record
    UPDATE seasons 
    SET data_completeness = completeness,
        updated_at = NOW()
    WHERE id = season_id_param;
    
    RETURN completeness;
END;
$$ LANGUAGE plpgsql;

-- DOWN:
-- Drop triggers
DROP TRIGGER IF EXISTS update_seasons_updated_at ON seasons;
DROP TRIGGER IF EXISTS update_constructors_updated_at ON constructors;
DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
DROP TRIGGER IF EXISTS update_races_updated_at ON races;
DROP TRIGGER IF EXISTS update_driver_standings_updated_at ON driver_standings;
DROP TRIGGER IF EXISTS update_constructor_standings_updated_at ON constructor_standings;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP FUNCTION IF EXISTS calculate_season_completeness(VARCHAR);

-- Drop tables
DROP TABLE IF EXISTS cache_invalidations;
DROP TABLE IF EXISTS data_sync_logs;
DROP TABLE IF EXISTS telemetry_data;
DROP TABLE IF EXISTS driver_constructor_seasons;
DROP TABLE IF EXISTS constructor_standings;
DROP TABLE IF EXISTS driver_standings;
DROP TABLE IF EXISTS races;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS constructors;
DROP TABLE IF EXISTS circuits;
DROP TABLE IF EXISTS seasons;

-- Drop extensions
DROP EXTENSION IF EXISTS "btree_gin";
DROP EXTENSION IF EXISTS "pg_trgm";
DROP EXTENSION IF EXISTS "uuid-ossp";
