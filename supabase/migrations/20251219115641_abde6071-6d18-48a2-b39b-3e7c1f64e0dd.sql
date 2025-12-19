-- Add resource_snapshot column
ALTER TABLE products_resources
  ADD COLUMN resource_snapshot TEXT;

-- Add timestamp for when snapshot was taken
ALTER TABLE products_resources
  ADD COLUMN snapshot_at TIMESTAMPTZ;

-- Comment on columns
COMMENT ON COLUMN products_resources.resource_snapshot IS 'Base64 encoded snapshot/screenshot of the resource';
COMMENT ON COLUMN products_resources.snapshot_at IS 'Timestamp when snapshot was captured';