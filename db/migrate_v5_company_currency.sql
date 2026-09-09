-- Migration v5: valuta per società
-- Valute supportate: EUR, USD, GBP, JPY, RUB, CNY
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'EUR';
