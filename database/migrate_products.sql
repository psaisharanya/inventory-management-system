-- Migration script to update products table from single price to cost_price and selling_price
-- Run this in your Supabase SQL editor

-- First, add the new columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2);

-- Migrate existing price data to both columns (assuming cost_price = selling_price for existing data)
UPDATE products SET
  cost_price = price,
  selling_price = price
WHERE cost_price IS NULL OR selling_price IS NULL;

-- Make the new columns NOT NULL after data migration
ALTER TABLE products ALTER COLUMN cost_price SET NOT NULL;
ALTER TABLE products ALTER COLUMN selling_price SET NOT NULL;

-- Optionally drop the old price column after confirming migration is successful
-- ALTER TABLE products DROP COLUMN price;