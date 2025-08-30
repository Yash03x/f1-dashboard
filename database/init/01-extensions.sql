-- Enable required PostgreSQL extensions for F1 Dashboard
-- These extensions provide enhanced performance and functionality

-- PostGIS for potential geographical features (circuit locations)
CREATE EXTENSION IF NOT EXISTS postgis;

-- pg_trgm for fast text search (driver/team names)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- btree_gin for composite indexes
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create indexes for performance
-- These will be created after Prisma migration