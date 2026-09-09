-- Migration: populate product_categories from existing free-text category values
-- Run ONCE on the production database after deploying the new schema.

-- Step 1: insert distinct category values per company
INSERT INTO product_categories (company_id, name)
  SELECT DISTINCT company_id, category
  FROM products
  WHERE category IS NOT NULL AND TRIM(category) != ''
ON CONFLICT DO NOTHING;

-- Step 2: link existing products to the new category rows
UPDATE products p
SET category_id = pc.id
FROM product_categories pc
WHERE pc.company_id = p.company_id
  AND LOWER(pc.name) = LOWER(p.category)
  AND p.category IS NOT NULL
  AND p.category_id IS NULL;
