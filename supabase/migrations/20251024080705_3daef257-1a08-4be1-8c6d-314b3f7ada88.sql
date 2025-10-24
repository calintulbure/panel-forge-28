-- Add index on validated column for better query performance
CREATE INDEX IF NOT EXISTS idx_products_validated ON products(validated);