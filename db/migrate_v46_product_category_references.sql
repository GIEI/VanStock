-- v46: complete the transition from free-text product categories to category_id.
-- Safe to run repeatedly: existing links are never overwritten.

INSERT INTO product_categories (company_id, name)
SELECT DISTINCT company_id, TRIM(category)
FROM products
WHERE category_id IS NULL
  AND category IS NOT NULL
  AND TRIM(category) <> ''
ON CONFLICT (company_id, LOWER(name)) DO NOTHING;

UPDATE products product
SET category_id = category.id
FROM product_categories category
WHERE product.company_id = category.company_id
  AND product.category_id IS NULL
  AND product.category IS NOT NULL
  AND TRIM(product.category) <> ''
  AND LOWER(category.name) = LOWER(TRIM(product.category));
