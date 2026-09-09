# StockSimple — Architettura dell'applicazione

> Versione 2.0 — aggiornato agosto 2026

## Indice

1. [Panoramica](#1-panoramica)
2. [Stack tecnologico](#2-stack-tecnologico)
3. [Struttura dei container Docker](#3-struttura-dei-container-docker)
4. [Flusso delle richieste](#4-flusso-delle-richieste)
5. [Backend — Node.js/Express](#5-backend--nodejs-express)
6. [Frontend — Angular PWA](#6-frontend--angular-pwa)
7. [App Android — Kotlin/Compose](#7-app-android--kotlincompose)
8. [Database — PostgreSQL](#8-database--postgresql)
9. [Autenticazione e autorizzazione](#9-autenticazione-e-autorizzazione)
10. [Multitenancy](#10-multitenancy)
11. [Gestione stock per posizione](#11-gestione-stock-per-posizione)
12. [Notifiche push (Web Push)](#12-notifiche-push-web-push)
13. [Centro notifiche in-app](#13-centro-notifiche-in-app)
14. [Sistema presenze (event sourcing)](#14-sistema-presenze-event-sourcing)
15. [Geolocalizzazione e tracciamento GPS](#15-geolocalizzazione-e-tracciamento-gps)
16. [Lotti e scadenze prodotti](#16-lotti-e-scadenze-prodotti)
17. [Margini e cost snapshot](#17-margini-e-cost-snapshot)
18. [Seat licensing e abbonamenti](#18-seat-licensing-e-abbonamenti)
19. [Backup automatici](#19-backup-automatici)
20. [SMTP per-azienda e inviti](#20-smtp-per-azienda-e-inviti)
21. [Schema del database (completo)](#21-schema-del-database-completo)
22. [Struttura del repository](#22-struttura-del-repository)
23. [Vincoli tecnici noti](#23-vincoli-tecnici-noti)

---

## 1. Panoramica

StockSimple è un'applicazione web fullstack containerizzata con architettura a tre livelli:

```
Browser / App PWA / App Android
              |
              | HTTPS
              v
          [Nginx]  ← proxy statico + reverse proxy
              |
              +--> /api/*      -->  [Node.js / Express]  -->  [PostgreSQL]
              |
              +--> /uploads/*  -->  [Node.js / Express]  (file statici)
              |
              +--> /*          -->  Angular SPA (file statici serviti da Nginx)
```

Tutti i componenti web girano come container Docker orchestrati da Docker Compose.
L'app Android comunica direttamente con il backend tramite Retrofit (HTTP/JSON).

---

## 2. Stack tecnologico

| Layer                | Tecnologia              | Versione     |
|----------------------|-------------------------|--------------|
| Frontend framework   | Angular                 | 17           |
| UI components        | Angular Material        | 17           |
| Scanner barcode      | @zxing/browser          | latest       |
| PWA / Service Worker | Angular Service Worker  | 17           |
| Internazionalizzazione | ngx-translate         | —            |
| Backend runtime      | Node.js                 | 20 LTS       |
| Backend framework    | Express                 | 4            |
| Autenticazione       | JWT (jsonwebtoken)      | HS256        |
| Hash password        | bcryptjs                | —            |
| Upload file          | multer                  | —            |
| Import/Export        | xlsx                    | —            |
| Notifiche push       | web-push (VAPID)        | —            |
| Email                | nodemailer              | —            |
| Crittografia         | Node.js crypto (AES-256-GCM) | —       |
| Database             | PostgreSQL              | 16           |
| ORM / Query          | pg (node-postgres)      | —            |
| Reverse proxy        | Nginx                   | 1.25 alpine  |
| Containerizzazione   | Docker + Docker Compose | —            |
| App Android          | Kotlin + Jetpack Compose| —            |
| HTTP Android         | Retrofit + OkHttp       | —            |
| Immagini Android     | Coil                    | —            |

---

## 3. Struttura dei container Docker

```
docker-compose.yml
├── db          PostgreSQL 16
│               porta: 5432
│               volume: postgres_data (o ./data/ con docker-compose.dev.yml)
│
├── backend     Node.js / Express
│               porta: 3000 (interna, non esposta)
│               volumes:
│                 - uploads/ (foto prodotti, loghi, foto lavori, audio chat)
│                 - backups/ (backup automatici)
│               dipende da: db
│
└── frontend    Nginx (serve build Angular + reverse proxy)
                porta: 80 → host
                dipende da: backend
```

Il container `frontend` fa anche da reverse proxy: le richieste verso `/api/*` e `/uploads/*` vengono inoltrate al container `backend:3000`.

### nginx.conf (logica di proxy)

```nginx
location /api/ {
    proxy_pass http://backend:3000;
}
location /uploads/ {
    proxy_pass http://backend:3000;
}
location / {
    try_files $uri $uri/ /index.html;  # SPA routing
}
```

---

## 4. Flusso delle richieste

### Richiesta autenticata tipica

```
1. Browser invia GET /api/products
   Authorization: Bearer <JWT>

2. Nginx riceve la richiesta su porta 80
   → la instrada a backend:3000/api/products

3. Express:
   a. Middleware requireAuth verifica il JWT
   b. Estrae company_id, user_id, role dal payload
   c. Il route handler esegue query SQL filtrata per company_id
   d. Risponde con JSON

4. Nginx ritorna la risposta al browser
```

### Login

```
1. POST /api/auth/login  { email, password }
2. Backend verifica hash bcrypt
3. Se valido, genera JWT firmato con JWT_SECRET (HS256)
4. Risponde con { token, user }
5. Frontend salva il token in localStorage
6. Ogni richiesta successiva include: Authorization: Bearer <token>
```

---

## 5. Backend — Node.js/Express

### Struttura `backend/src/`

```
src/
├── index.js                  Entry point — configura Express, monta i router
├── db.js                     Pool di connessione a PostgreSQL (pg)
├── middleware/
│   └── auth.js               JWT middleware + requireRole guard
├── routes/
│   ├── admin.js              /api/admin/*
│   ├── admin-attendance.js   /api/admin/attendance/* (gestione presenze admin)
│   ├── analytics.js          /api/analytics/* (van report)
│   ├── attendance.js         /api/attendance/* (v1)
│   ├── attendance-v2.js      /api/attendance/* (v2 event sourcing)
│   ├── audit.js              /api/audit/* (inventario fisico)
│   ├── auth.js               /api/auth/*
│   ├── backups.js            /api/backups/* (backup automatici)
│   ├── badge.js              /api/badge/* (QR badge timbrature)
│   ├── clients.js            /api/clients/*
│   ├── companies.js          /api/companies/* (solo superadmin)
│   ├── dashboard.js          /api/dashboard/*
│   ├── data-transfer.js      /api/import-export/* (import/export dati)
│   ├── inventory.js          /api/inventory/* (rettifica inventario)
│   ├── invites.js            /api/invites/* (inviti utente)
│   ├── jobs.js               /api/jobs/* (lavori + foto + chat + stato)
│   ├── locations.js          /api/locations/*
│   ├── margins.js            /api/margins/*
│   ├── movements.js          /api/movements/*
│   ├── notifications.js      /api/notifications/* (centro notifiche in-app)
│   ├── products.js           /api/products/*
│   ├── purchase-orders.js    /api/purchase-orders/*
│   ├── push.js               /api/push/* (VAPID, subscribe/unsubscribe)
│   ├── reports.js            /api/reports/* (report giornaliero)
│   ├── smtp-settings.js      /api/smtp-settings/*
│   ├── subscriptions.js      /api/subscriptions/* (piani e seat)
│   ├── suppliers.js          /api/suppliers/*
│   ├── system.js             /api/system/* (health, versione)
│   ├── timeline.js           /api/timeline/*
│   ├── timesheet.js          /api/timesheet/*
│   ├── user-absences.js      /api/absences/*
│   ├── users.js              /api/users/*
│   └── vehicle-bookings.js   /api/vehicle-bookings/*
└── scripts/
    └── seed-admin.js         Crea azienda e admin al primo avvio
```

### Pattern di ogni route

Ogni router:
1. Importa `requireAuth` e lo applica come middleware globale.
2. Filtra sempre i dati per `req.user.company_id` (isolamento multitenancy).
3. Usa `async/await` con `try/catch` e `next(err)` per la gestione errori.
4. L'error handler globale in `index.js` ritorna JSON `{ error: message }`.

### Operazioni sui movimenti (transazionali)

La rotta `POST /api/movements` usa una transazione PostgreSQL esplicita:

```
BEGIN
  LOCK products FOR UPDATE
  Verifica stock disponibile nella posizione di origine
  Aggiorna product_stocks (+ batch_number/expiry_date se tracks_batches)
  Aggiorna products.quantity (SUM da product_stocks)
  INSERT movements (con unit_cost_snapshot e unit_price_snapshot)
  (opzionale) Invia notifica push se stock < min_stock
  (opzionale) INSERT notifications per centro notifiche in-app
COMMIT  (oppure ROLLBACK in caso di errore)
```

---

## 6. Frontend — Angular PWA

### Struttura `frontend/src/app/`

```
app/
├── core/
│   ├── models/
│   │   ├── product.model.ts
│   │   ├── location.model.ts
│   │   ├── job.model.ts
│   │   ├── client.model.ts
│   │   ├── supplier.model.ts
│   │   ├── purchase-order.model.ts
│   │   └── dashboard.model.ts
│   └── services/
│       ├── api.service.ts              HTTP client base (intercettore JWT)
│       ├── auth.service.ts
│       ├── product.service.ts
│       ├── movement.service.ts
│       ├── location.service.ts
│       ├── dashboard.service.ts
│       ├── job.service.ts
│       ├── client.service.ts
│       ├── supplier.service.ts
│       ├── purchase-order.service.ts
│       ├── report.service.ts
│       ├── push-notification.service.ts
│       ├── company.service.ts
│       └── user.service.ts
└── pages/
    ├── login/
    ├── forgot-password/
    ├── reset-password/
    ├── dashboard/
    ├── products/
    ├── product-detail/
    ├── product-form/
    ├── scanner/
    ├── movements/
    ├── movement-form/
    ├── locations/
    ├── van-load/               Carico massivo furgone
    ├── van-report/             Report movimenti furgone
    ├── clients/
    ├── jobs/
    ├── job-detail/             Dettaglio lavoro + chat + foto + firma
    ├── suppliers/
    ├── purchase-orders/
    ├── reports/                Report giornaliero operatore
    ├── users/
    └── companies/
```

### Componenti standalone

Tutti i componenti usano il pattern Angular **standalone** (senza NgModules). Il routing è definito tramite `app.routes.ts` con lazy loading per ogni pagina.

### Internazionalizzazione

L'app supporta più lingue tramite file JSON in `assets/i18n/`:
`it.json`, `en.json`, `es.json`, `fr.json`, `ja.json`, `ru.json`, `zh.json`

La lingua viene rilevata automaticamente dalle preferenze del browser e può essere cambiata dall'utente.

### Navigazione — controllo accesso per ruolo

Le voci *Clienti, Fornitori, Ordini acquisto* sono nascoste nel menu per gli utenti con ruolo `user` tramite il flag `adminOnly` sulle voci di navigazione. Un `adminGuard` su Angular protegge anche le rotte corrispondenti, impedendo l'accesso diretto tramite URL.

Le voci di amministrazione sono raggruppate sotto un menu collassabile **Amministrazione** nella sidebar.

### PWA e caching

Il Service Worker Angular (ngsw) gestisce:
- Cache degli asset statici (JS, CSS, icone)
- Cache delle risorse dell'API per uso offline
- Aggiornamento automatico in background
- Ricezione notifiche push (via `SwPush`)

---

## 7. App Android — Kotlin/Compose

L'app Android è una client nativa che consuma le stesse API REST del frontend web.

### Struttura `MOBILE/app/src/main/java/com/stocksimple/app/`

```
├── data/
│   ├── models/         Data class Kotlin (Product, Job, Movement, ...)
│   ├── network/        Retrofit interface + interceptors (JWT)
│   └── repository/     Repository con safeCall wrapper (gestione errori)
└── ui/
    ├── screens/
    │   ├── dashboard/
    │   ├── jobs/       JobListScreen, JobDetailScreen (workflow + foto + chat)
    │   ├── locations/
    │   ├── login/
    │   ├── movements/  MovementsScreen + form con filtro prodotti per posizione
    │   ├── products/
    │   ├── purchaseorders/
    │   ├── reports/    Report giornaliero
    │   ├── scanner/
    │   ├── suppliers/
    │   └── vanreport/
    └── theme/
```

### Funzionalità specifiche Android

- **Fotocamera**: scatto foto per lavori tramite `FileProvider` + `TakePicture` contract
- **Geolocalizzazione**: le foto e i cambi di stato del lavoro registrano le coordinate GPS
- **Workflow lavori**: barra di stato a 3 step (Accettato → Arrivato → Completato)
- **Chat interna**: messaggi di testo e audio per lavoro
- **Filtro prodotti per posizione**: nel form movimenti, selezionando "scarico" da un furgone, la lista prodotti mostra solo quelli presenti in quella posizione
- **Timbrature**: check-in/check-out con GPS
- **Design system unificato**: card SurfaceWhite con `elevation = 1dp`, `RoundedCornerShape(16dp)`, TopAppBar bianca, sfondo `BackgroundLight (#F1F5F9)`
- **Notifiche FCM**: ricezione push per scorte basse

### Requisiti minimi

- Android 8.0 (API 26) o superiore
- Connessione di rete al backend (locale o internet)
- Per sviluppo USB: `adb reverse tcp:3000 tcp:3000`

---

## 8. Database — PostgreSQL

La connessione è gestita tramite un pool `pg.Pool` configurato in `db.js`.

```javascript
const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.POSTGRES_DB,
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});
```

### Trigger automatici `updated_at`

Le tabelle principali hanno trigger `BEFORE UPDATE` che aggiornano automaticamente la colonna `updated_at`:
`locations`, `products`, `clients`, `jobs`, ecc.

---

## 9. Autenticazione e autorizzazione

### JWT

- Algoritmo: **HS256**
- Scadenza: configurabile via `JWT_EXPIRES` (default: 7 giorni)
- Payload: `{ id, company_id, company_name, email, name, role }`
- Header HTTP: `Authorization: Bearer <token>`
- Storage frontend: `localStorage`

### Middleware `requireAuth`

```
Header Authorization presente?  →  No  →  401
JWT valido e non scaduto?        →  No  →  401
                                 →  Sì  →  req.user = payload JWT → next()
```

### Guard `requireRole(...roles)`

```
req.user.role in roles?  →  No  →  403
                         →  Sì  →  next()
```

### Reset password

Due flussi distinti:

| Flusso                  | Generato da | Validità |
|-------------------------|-------------|----------|
| Forgot password (email) | Utente      | 1 ora    |
| Reset manuale           | Admin       | 24 ore   |

I token sono generati con `crypto.randomBytes(32)` e salvati con scadenza in `users.reset_token` e `users.reset_token_expires`.

---

## 10. Multitenancy

Ogni record di dati è associato a una `company_id`. Il backend filtra automaticamente ogni query per la company dell'utente autenticato.

```sql
-- Esempio: lista prodotti
WHERE p.company_id = $1  -- $1 = req.user.company_id
```

Il `superadmin` non ha `company_id` fisso e può accedere a tutte le aziende. Le rotte sensibili usano `requireRole('superadmin')`.

---

## 11. Gestione stock per posizione

Lo stock è tracciato su due livelli:

| Tabella             | Granularità | Uso                                    |
|---------------------|-------------|----------------------------------------|
| `products.quantity` | Totale      | Visualizzazione rapida, avvisi scorta  |
| `product_stocks`    | Per posizione | Trasferimenti, dettaglio posizione   |

Quando viene registrato un movimento, il backend:
1. Aggiorna la riga in `product_stocks` per la/le posizione/i coinvolte.
2. Ricalcola `products.quantity` come `SUM(product_stocks.quantity)` per quel prodotto.
3. Se il totale è sceso sotto `min_stock`, invia notifiche push agli utenti dell'azienda.

**Vincolo:** `product_stocks.quantity >= 0` è verificato a livello database. Il backend verifica la disponibilità prima di eseguire la transazione.

---

## 12. Notifiche push (Web Push)

Le notifiche push usano il protocollo **Web Push** con chiavi VAPID.

### Flusso di attivazione

```
1. Frontend richiede GET /api/push/vapid-key  → ottiene public key
2. Verifica Notification.permission (richiede consenso utente se necessario)
3. SwPush.requestSubscription(publicKey)  → browser contatta FCM/WNS per la subscription
4. Frontend invia la subscription a POST /api/push/subscribe
5. Backend salva endpoint + chiavi in push_subscriptions
```

### Invio notifiche

```
Movimento scarico/trasferimento
        ↓
Backend verifica: nuovo_stock < min_stock?
        ↓
Carica tutte le push_subscriptions dell'azienda
        ↓
web-push.sendNotification() per ciascuna subscription
```

### Compatibilità browser

| Browser | Servizio push | Note |
|---------|---------------|------|
| Chrome | FCM (Firebase Cloud Messaging) | Richiede accesso a `fcm.googleapis.com` |
| Edge (Chromium) | FCM | Tracking Prevention *Strict* può bloccare |
| Firefox | Mozilla Push Service | — |
| Safari ≥ 16 | Apple Push Service | Richiede HTTPS |

---

## 13. Centro notifiche in-app

Oltre alle push notification, il sistema mantiene un centro notifiche in-app nella tabella `notifications`. Le notifiche in-app:

- Sono persistenti (non scompaiono al riavvio del browser)
- Vengono marcate come lette con `read_at`
- Possono contenere un URL di azione (`url`) e dati arbitrari (`data` JSONB)
- Sono accessibili tramite l'icona campanella nell'interfaccia

---

## 14. Sistema presenze (event sourcing)

Il sistema presenze v2 utilizza un modello **event sourcing** con una macchina a stati:

### Stati utente

```
OUT → CHECK_IN → IN → CHECK_OUT → OUT
IN  → BREAK_START → BREAK → BREAK_END → IN
Qualsiasi stato → PENDING_REVIEW (anomalia) → LOCKED (admin lock)
```

### Tabella `attendance_events`

Ogni timbratura è un record immutabile con:
- `detected_action`: `CHECK_IN`, `CHECK_OUT`, `BREAK_START`, `BREAK_END`
- `resulting_state`: stato risultante dopo l'azione
- `previous_state`: stato precedente
- `request_id`: UUID unico per idempotenza
- `source`: `mobile`, `web`, `admin`
- `gps_lat`, `gps_lng`: coordinate opzionali
- `anomaly_type`: tipo di anomalia rilevata (ritardo, doppia timbratura, ecc.)
- `status`: `valid`, `invalid`, `reviewed`, `superseded`

### Correzioni (override requests)

Quando l'admin approva una richiesta di correzione, viene creato un nuovo `attendance_event` con `source='admin'` e `status='valid'`, collegato alla richiesta originale tramite `resulting_event_id`.

---

## 15. Geolocalizzazione e tracciamento GPS

Il sistema registra opzionalmente le coordinate GPS in più punti:

| Tabella              | Campo               | Quando                                    |
|----------------------|---------------------|-------------------------------------------|
| `job_photos`         | `latitude`, `longitude`, `location_address` | Scatto foto lavoro |
| `job_state_changes`  | `latitude`, `longitude`, `location_address` | Cambio stato lavoro (arrivo, completamento) |
| `attendance_events`  | `gps_lat`, `gps_lng` | Timbratura da mobile                     |

La geolocalizzazione è opzionale: se il dispositivo non ha accesso al GPS o l'utente non concede il permesso, i campi vengono lasciati null.

---

## 16. Lotti e scadenze prodotti

I prodotti con `tracks_batches = true` supportano il tracciamento dei lotti:

### Tabella `product_batches`

- Una riga per combinazione `(product_id, location_id, batch_number)`
- Contiene `expiry_date` e `quantity` residua nel lotto
- Constraint: `quantity >= 0`

### Movimenti con lotto

Quando viene registrato un movimento su un prodotto che traccia i lotti:
- `movements.batch_number` e `movements.expiry_date` vengono salvati per la storia
- La giacenza per lotto viene aggiornata in `product_batches`

---

## 17. Margini e cost snapshot

Per garantire l'accuratezza dell'analisi storica dei margini anche quando i prezzi cambiano:

### Al momento dello scarico

Il backend registra nella riga del movimento:
- `unit_cost_snapshot`: costo unitario medio ponderato al momento dello scarico
- `unit_price_snapshot`: prezzo di vendita al momento dello scarico

### Calcolo costo medio ponderato

```sql
SELECT SUM(quantity * purchase_price) / SUM(quantity)
FROM movements
WHERE product_id = $1 AND type = 'carico' AND purchase_price IS NOT NULL
  AND created_at <= <timestamp_scarico>
```

### API margini

`GET /api/margins` restituisce per ogni prodotto:
- Costo medio acquisto
- Prezzo di vendita corrente
- Margine lordo (assoluto e percentuale)

---

## 18. Seat licensing e abbonamenti

### Tabella `subscriptions`

Una riga per azienda (UNIQUE su `company_id`):

| Campo       | Valori possibili                          |
|-------------|-------------------------------------------|
| `plan_type` | `BASIC` (default), altri piani futuri     |
| `max_seats` | Numero massimo utenti attivi (default: 5) |
| `status`    | `ACTIVE`, `TRIAL`, `SUSPENDED`, `PAST_DUE` |
| `expires_at` | Data scadenza (null = nessuna scadenza)  |

### Conteggio seat

Vengono conteggiati gli utenti con `status IN ('ACTIVE', 'INVITED')`. Gli utenti `INACTIVE` non consumano seat.

### Entitlement engine

Il backend verifica i seat disponibili prima di:
- Creare un nuovo utente
- Accettare un invito

Se il limite è raggiunto, la richiesta viene rifiutata con errore 402/403.

---

## 19. Backup automatici

Il backend include un job di backup automatico:

| Componente   | Percorso                       | Formato              |
|--------------|--------------------------------|----------------------|
| Database     | `/app/backups/db_<ts>.sql.gz`  | pg_dump compresso    |
| Upload files | `/app/backups/uploads_<ts>.tar.gz` | Archivio compresso |
| Manifest     | `/app/backups/<ts>.manifest.json` | Metadati           |

Il primo backup viene eseguito 60 secondi dopo l'avvio. I backup successivi seguono la configurazione interna.

Disabilitazione: `DISABLE_AUTO_BACKUP=1` nel file `.env`.

---

## 20. SMTP per-azienda e inviti

### Tabella `company_smtp_settings`

Una riga per azienda con host, porta, SSL, username e `password_enc` (AES-256-GCM con IV casuale, mai restituita in chiaro dalle API).

### Flusso invito utente

```
Admin crea invito (POST /api/invites)
        ↓
Backend genera token unico + scadenza
        ↓
Backend recupera SMTP aziendale
        ↓
Invio email con link: FRONTEND_URL/accept-invite?token=<token>
        ↓
Utente apre link → imposta password → stato cambia da INVITED ad ACTIVE
```

---

## 21. Schema del database (completo)

```
companies
├── id (PK), name, logo_url, currency, created_at

subscriptions
├── id (PK), company_id (FK, UNIQUE), plan_type, max_seats, expires_at, status

users
├── id (PK), company_id (FK), email (UNIQUE), password_hash, name
├── role CHECK IN ('superadmin','admin','user')
├── is_active, status CHECK IN ('ACTIVE','INACTIVE','INVITED')
├── reset_token, reset_token_expires, photo_url, created_at

company_smtp_settings
├── id (PK), company_id (FK, UNIQUE), host, port, secure, username
├── password_enc (AES-256-GCM), from_email, from_name

locations
├── id (PK), company_id (FK), name
├── type CHECK IN ('warehouse','van','site','other')
├── status CHECK IN ('disponibile','occupato','in_manutenzione')
├── plate, address, description

product_categories
├── id (PK), company_id (FK), name
├── UNIQUE (company_id, LOWER(name))

products
├── id (PK), company_id (FK), name, sku (UNIQUE per company), barcode
├── description, quantity (totale), unit, min_stock
├── location_id (FK, posizione primaria), category, category_id (FK)
├── photo_url, price, notes, tracks_batches (BOOLEAN)

product_stocks
├── product_id (FK) ─┐ PK composita
├── location_id (FK) ─┘
├── quantity (>= 0)

product_batches
├── id (PK), company_id (FK), product_id (FK), location_id (FK)
├── batch_number, expiry_date, quantity (>= 0)
├── UNIQUE (product_id, location_id, batch_number)

product_suppliers
├── product_id (FK) ─┐ PK composita
├── supplier_id (FK) ─┘
├── purchase_price, is_preferred, notes

clients
├── id (PK), company_id (FK), name, phone, email, address, notes

jobs
├── id (PK), company_id (FK), client_id (FK), title, description, address
├── assigned_to (FK → users)
├── scheduled_date (DATE)
├── scheduled_time CHECK IN ('morning','afternoon','all_day','custom')
├── scheduled_time_custom (TIME)
├── status CHECK IN ('aperto','in_corso','completato','annullato')
├── priority CHECK IN ('bassa','normale','alta','urgente')
├── started_at, completed_at, signed_at, customer_signature_url

job_photos
├── id (PK), company_id (FK), job_id (FK)
├── type CHECK IN ('problem','repair')
├── media_type CHECK IN ('image','video')
├── url, filename, created_by
├── latitude, longitude, location_address

job_state_changes
├── id (PK), company_id (FK), job_id (FK)
├── change_type CHECK IN ('accept','arrived','completed','rejected')
├── latitude, longitude, location_address
├── changed_by (FK → users), notes, created_at, signed (BOOLEAN)

job_messages
├── id (PK), company_id (FK), job_id (FK), sender_id (FK → users)
├── content (TEXT), type CHECK IN ('text','audio')
├── audio_url, audio_duration (FLOAT)

movements
├── id (PK), product_id (FK), type CHECK IN ('carico','scarico','trasferimento')
├── quantity (> 0), from_location_id (FK), to_location_id (FK)
├── job_id (FK), purchase_price, notes, created_by
├── batch_number, expiry_date
├── unit_cost_snapshot, unit_price_snapshot

suppliers
├── id (PK), company_id (FK), name, contact_name, phone, email
├── website, address, notes, delivery_days

purchase_orders
├── id (PK), company_id (FK), supplier_id (FK)
├── status CHECK IN ('bozza','inviato','ricevuto')
├── notes, ordered_at, received_at, created_by

purchase_order_items
├── id (PK), purchase_order_id (FK), product_id (FK)
├── quantity_ordered, quantity_received, unit_price

vehicle_bookings
├── id (PK), company_id (FK), location_id (FK), job_id (FK)
├── date (DATE), period CHECK IN ('all_day','morning','afternoon')
├── booked_by (FK → users), notes

app_settings
├── key (PK), value (TEXT)

push_subscriptions
├── id (PK), user_id (FK), company_id (FK)
├── endpoint, p256dh, auth
├── UNIQUE (user_id, endpoint)

notifications
├── id (PK), company_id (FK), user_id (FK)
├── type, title, body, url, data (JSONB), read_at

daily_reports
├── id (PK), company_id (FK), user_id (FK), report_date (DATE), notes
├── UNIQUE (user_id, report_date)

attendance (v1 — legacy, solo lettura)
├── id (PK), company_id (FK), user_id (FK), date (DATE)
├── morning_in, morning_out, afternoon_in, afternoon_out, status

attendance_requests (v1 — legacy)
├── id (PK), company_id (FK), user_id (FK), type, requested_at
├── reason, status, reviewed_by (FK), reviewed_at

attendance_events (v2 — event sourcing)
├── id (PK), company_id (FK), user_id (FK), occurred_at (TIMESTAMPTZ)
├── detected_action CHECK IN ('CHECK_IN','CHECK_OUT','BREAK_START','BREAK_END')
├── resulting_state CHECK IN ('OUT','IN','BREAK','PENDING_REVIEW','LOCKED')
├── previous_state, request_id (UNIQUE per user), qr_token_id, device_id
├── gps_lat, gps_lng, source CHECK IN ('mobile','web','admin')
├── status CHECK IN ('valid','invalid','reviewed','superseded')
├── anomaly_type, notes, created_by (FK)

attendance_override_requests
├── id (PK), company_id (FK), user_id (FK)
├── requested_action, requested_at (TIMESTAMPTZ), reason
├── status CHECK IN ('pending','approved','rejected')
├── reviewed_by (FK), reviewed_at, review_notes
├── resulting_event_id (FK → attendance_events)

user_absences
├── id (PK), company_id (FK), user_id (FK)
├── type, start_date, end_date, reason, status
├── reviewed_by (FK), reviewed_at
```

---

## 22. Struttura del repository

```
StockSimpleApp/
├── .env.example
├── docker-compose.yml
├── docker-compose.dev.yml        Volumi host per uploads/backups
├── docker-compose.prod.yml       Configurazione produzione
├── config/
│   └── nginx.prod.example.conf   Template proxy produzione
├── nginx.dev.conf                Sviluppo
├── README.md
├── AGENTS.md                     Guidelines AI coding
├── docs/
│   ├── architettura.md
│   ├── manuale-utente.md
│   ├── manuale-admin.md
│   ├── api-integration.md
│   └── processi-di-business.md
├── db/
│   ├── init.sql                  Schema completo (usato nelle nuove installazioni)
│   ├── migrate_v*.sql            Migrazioni incrementali (v2 → v35)
│   └── migrations/               Migrazioni aggiuntive (021_user_absences, ecc.)
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── db.js
│       ├── middleware/auth.js
│       ├── routes/               33 file route
│       └── scripts/seed-admin.js
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── angular.json
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── core/             models/ + services/
│       │   └── pages/            Tutte le pagine Angular
│       └── assets/
│           └── i18n/             it, en, es, fr, ja, ru, zh
└── MOBILE/
    └── app/src/main/java/com/stocksimple/app/
        ├── data/                 models/, network/, repository/
        └── ui/screens/           Tutte le schermate Android
```

---

## 23. Vincoli tecnici noti

| Vincolo                        | Dettaglio                                                                   |
|--------------------------------|-----------------------------------------------------------------------------|
| HTTPS obbligatorio (prod)      | Fotocamera (barcode scanner), Web Push, Geolocalizzazione richiedono HTTPS  |
| Max upload foto                | 5 MB per foto prodotti/lavori, 2 MB per loghi aziendali                     |
| Paginazione prodotti           | Max 100 risultati per pagina (parametro `limit`)                            |
| Movimenti non reversibili      | L'eliminazione di un movimento non inverte automaticamente lo stock          |
| SKU univoco per azienda        | Constraint DB: `UNIQUE (company_id, sku)` su `products`                     |
| Report giornaliero             | Un solo report per utente per giorno (upsert con UNIQUE su user_id + date)  |
| Timbrature immutabili          | Le timbrature v2 sono event sourcing: non si modificano, si aggiunge override |
| Seat licensing                 | Piano BASIC: max 5 utenti ACTIVE/INVITED. Superabile solo aggiornando piano |
| Token sessione                 | JWT salvato in localStorage; non c'è refresh token                          |
| Backup automatici              | Richiedono che il container abbia accesso al volume `/app/backups`           |
| PDF rapportino                 | Noto bug: più foto/video generano PDF non corretto                          |
| Firma cliente                  | Noto: la firma potrebbe non essere visibile correttamente nel PDF su Android |

---

*Versione 2.0 — aggiornato agosto 2026*
