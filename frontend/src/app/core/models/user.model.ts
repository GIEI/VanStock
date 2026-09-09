export const SUPPORTED_CURRENCIES: { code: string; label: string }[] = [
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'GBP', label: 'Pound Sterling (£)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
  { code: 'RUB', label: 'Russian Ruble (₽)' },
  { code: 'CNY', label: 'Chinese Yuan (¥)' },
];

export interface Company {
  id:                   number;
  name:                 string;
  logo_url?:            string | null;
  word_template_url?:   string | null;
  currency:             string;
  created_at:           string;
}

export interface User {
  id:           number;
  company_id:   number;
  company_name?: string;
  email:        string;
  name:         string;
  role:         'superadmin' | 'admin' | 'user';
  is_active:    boolean;
  photo_url?:   string | null;
  created_at:   string;
}

export interface AuthUser {
  id:                number;
  company_id:        number;
  company_name:      string;
  company_logo_url?: string | null;
  company_currency:  string;
  email:             string;
  name:              string;
  role:              'superadmin' | 'admin' | 'user';
  photo_url?:        string | null;
  features?:         string[];
  resources?:        string[];
}
