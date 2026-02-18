-- Add JSONB column to store multiple TP levels
-- Format: [{ price: 65000, percent: 50, executed: false }, ...]
ALTER TABLE positions ADD COLUMN IF NOT EXISTS tp_variants JSONB DEFAULT '[]'::jsonb;
