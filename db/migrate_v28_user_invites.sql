-- v28: email-based invite flow.
--
-- An invite row exists for each user created with status = 'INVITED'. The
-- token is opaque and single-use (accepted_at is set when the invitee sets
-- their password). The user row is created upfront so the seat is consumed
-- immediately (entitlement engine counts INVITED).

CREATE TABLE IF NOT EXISTS user_invites (
  id          SERIAL      PRIMARY KEY,
  user_id     INT         NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  token       VARCHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMP   NOT NULL,
  accepted_at TIMESTAMP   NULL,
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_invites_token   ON user_invites(token);
CREATE INDEX IF NOT EXISTS idx_user_invites_user    ON user_invites(user_id);
