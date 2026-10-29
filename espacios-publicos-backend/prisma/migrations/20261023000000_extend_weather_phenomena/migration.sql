-- Extend the catalog without changing historical weather alerts.
ALTER TYPE "WeatherPhenomenon" ADD VALUE IF NOT EXISTS 'OLA_DE_CALOR';
ALTER TYPE "WeatherPhenomenon" ADD VALUE IF NOT EXISTS 'OLA_DE_FRIO';
ALTER TYPE "WeatherPhenomenon" ADD VALUE IF NOT EXISTS 'GRANIZO';
ALTER TYPE "WeatherPhenomenon" ADD VALUE IF NOT EXISTS 'TORMENTA_ELECTRICA';
ALTER TYPE "WeatherPhenomenon" ADD VALUE IF NOT EXISTS 'HURACAN';
ALTER TYPE "WeatherPhenomenon" ADD VALUE IF NOT EXISTS 'NIEVE';
