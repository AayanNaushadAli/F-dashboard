-- Add full_name column to profiles table
alter table profiles add column full_name text;

-- Update RLS if necessary (usually existing policies cover updates to 'own' rows)
-- No change needed for RLS if "Users can update own profile" policy exists.
