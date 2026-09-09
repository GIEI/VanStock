-- Daily reports table
CREATE TABLE IF NOT EXISTS daily_reports (
    id          SERIAL PRIMARY KEY,
    company_id  INT  NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id     INT  NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, report_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_reports_company ON daily_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_user    ON daily_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date    ON daily_reports(report_date);
