const path    = require('path');
const fs      = require('fs');
const webpush = require('web-push');
const db      = require('./db');

let _vapidKeys  = null;
let _vpConfigured = false;
let _messaging  = null;

async function getVapidKeys() {
  if (_vapidKeys) return _vapidKeys;

  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    _vapidKeys = {
      publicKey:  process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  } else {
    const res = await db.query(
      `SELECT key, value FROM app_settings WHERE key IN ('vapid_public', 'vapid_private')`
    );
    if (res.rows.length === 2) {
      const map = Object.fromEntries(res.rows.map(r => [r.key, r.value]));
      _vapidKeys = { publicKey: map.vapid_public, privateKey: map.vapid_private };
    } else {
      const keys = webpush.generateVAPIDKeys();
      await db.query(
        `INSERT INTO app_settings (key, value)
         VALUES ('vapid_public', $1), ('vapid_private', $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [keys.publicKey, keys.privateKey]
      );
      _vapidKeys = keys;
      console.log('[push] Generated VAPID keys. Public key:', keys.publicKey);
    }
  }

  if (!_vpConfigured) {
    webpush.setVapidDetails(
      'mailto:admin@stocksimple.app',
      _vapidKeys.publicKey,
      _vapidKeys.privateKey
    );
    _vpConfigured = true;
  }

  return _vapidKeys;
}

function getMessaging() {
  if (_messaging) return _messaging;
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      let serviceAccount;

      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
          console.log('[fcm] Loading credentials from environment variable');
        } catch (parseErr) {
          console.error('[fcm] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', parseErr.message);
        }
      }

      const serviceAccountPath =
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        path.join(__dirname, '..', 'firebase-service-account.json');

      if (!serviceAccount && !fs.existsSync(serviceAccountPath)) {
        return null;
      }

      if (!serviceAccount) {
        console.log(`[fcm] Loading credentials from file: ${serviceAccountPath}`);
        serviceAccount = require(serviceAccountPath);
      }

      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log('[fcm] Firebase Admin initialized');
    }
    _messaging = admin.messaging();
  } catch (err) {
    console.warn('[fcm] Firebase Admin not available:', err.message);
  }
  return _messaging;
}

async function sendWebPushToUsers(userIds, { title, body, url, data = {} }) {
  if (!userIds.length) return;
  try {
    await getVapidKeys();

    const subs = await db.query(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ANY($1)`,
      [userIds]
    );
    if (!subs.rows.length) return;

    const payload = JSON.stringify({
      notification: {
        title,
        body,
        icon: '/icons/icon-192x192.png',
        data: { url: url || '/', ...data },
      },
    });

    await Promise.all(
      subs.rows.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        ).catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            db.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]).catch(() => {});
          } else {
            console.error('[push] Send error:', err.message);
          }
        })
      )
    );
  } catch (err) {
    console.error('[push] sendWebPushToUsers error:', err.message);
  }
}

async function sendFcmToUsers(userIds, { title, body, data = {} }) {
  if (!userIds.length) return;
  const messaging = getMessaging();
  if (!messaging) return;
  try {
    const result = await db.query(
      'SELECT token FROM device_tokens WHERE user_id = ANY($1)',
      [userIds]
    );
    if (!result.rows.length) return;

    const messages = result.rows.map(row => ({
      token:        row.token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: { priority: 'high' },
    }));

    const response = await messaging.sendEach(messages);
    response.responses.forEach((res, i) => {
      if (!res.success) {
        const code = res.error?.code;
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          db.query('DELETE FROM device_tokens WHERE token = $1', [result.rows[i].token]).catch(() => {});
        } else {
          console.error('[fcm] Message error:', res.error?.message);
        }
      }
    });
  } catch (err) {
    console.error('[fcm] sendFcmToUsers error:', err.message);
  }
}

async function saveNotifications(companyId, userIds, { type = null, title, body, url, data = {} }) {
  try {
    await Promise.all(
      userIds.map(userId =>
        db.query(
          `INSERT INTO notifications (company_id, user_id, type, title, body, url, data)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [companyId, userId, type, title, body || null, url || null, JSON.stringify(data)]
        )
      )
    );
  } catch (err) {
    console.error('[notify] saveNotifications error:', err.message);
  }
}

/**
 * Sends a push notification (Web Push + FCM) to a specific set of users and
 * saves it to the in-app notifications table.
 */
async function notifyUsers(companyId, userIds, { type, title, body, url, data = {} }) {
  const ids = userIds.filter(Boolean);
  if (!ids.length) return;
  await Promise.all([
    saveNotifications(companyId, ids, { type, title, body, url, data }),
    sendWebPushToUsers(ids, { title, body, url, data }),
    sendFcmToUsers(ids, { title, body, data }),
  ]);
}

/**
 * Sends a push notification (Web Push + FCM) to all users of a company with the given roles.
 */
async function notifyRoles(companyId, roles, { type, title, body, url, data = {} }) {
  try {
    const { rows } = await db.query(
      `SELECT id FROM users WHERE company_id = $1 AND role = ANY($2)`,
      [companyId, roles]
    );
    await notifyUsers(companyId, rows.map(r => r.id), { type, title, body, url, data });
  } catch (err) {
    console.error('[notify] notifyRoles error:', err.message);
  }
}

module.exports = { getVapidKeys, notifyUsers, notifyRoles };
