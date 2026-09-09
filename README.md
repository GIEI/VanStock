# StockSimple — Gestione Inventario Mobile

Applicazione fullstack per la gestione dell'inventario di piccole imprese e artigiani con magazzini ambulanti (furgoni), cantieri e depositi fissi.

## Open source

VanStock è distribuito con licenza [AGPL-3.0-or-later](LICENSE). Consulta
[NOTICE](NOTICE), [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md),
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) e [SUPPORT.md](SUPPORT.md) prima di
utilizzare o contribuire al progetto.

## Stack Tecnologico

| Layer       | Tecnologia                        |
|-------------|-----------------------------------|
| Frontend    | Angular 17 PWA (standalone)       |
| UI          | Angular Material                  |
| Scanner     | @zxing/browser (barcode)          |
| Push        | Angular Service Worker + Web Push |
| Backend     | Node.js + Express                 |
| Database    | PostgreSQL 16                     |
| Container   | Docker + Docker Compose           |
| Proxy       | Nginx                             |
| App Android | Kotlin + Jetpack Compose          |

## Funzionalità

- **Prodotti**: CRUD completo con nome, SKU, barcode, quantità, unità, foto, categoria, posizione, prezzo
- **Movimenti**: carico, scarico, trasferimento tra posizioni — aggiornano lo stock in tempo reale
- **Carico furgone**: preparazione massiva del furgone con selezione multipla di prodotti e popup di riepilogo
- **Scanner barcode**: usa la fotocamera del dispositivo (supporta EAN-13, EAN-8, QR, Code128, ecc.)
- **Avvisi scorta minima**: notifica visiva e push quando la quantità scende sotto la soglia configurata
- **Notifiche push**: notifiche Web Push in tempo reale per scorte basse
- **Posizioni**: gestione furgoni, magazzini, cantieri con stato (disponibile/occupato/in manutenzione)
- **Prenotazioni veicoli**: prenotazione furgoni per data e fascia oraria, collegata ai lavori
- **Lavori (cantieri)**: ciclo di vita completo (`aperto` → `in_corso` → `completato`), assegnazione operatori, foto intervento, tracciamento consumi
- **Clienti**: anagrafica clienti collegata ai lavori
- **Fornitori**: anagrafica fornitori con prezzi di acquisto e tempi di consegna
- **Ordini di acquisto**: gestione ordini ai fornitori (`bozza` → `inviato` → `ricevuto`)
- **Report giornaliero**: rapporto operativo giornaliero per operatore
- **Van Report**: riepilogo movimenti giornalieri per furgone, con stampa e condivisione WhatsApp
- **Dashboard**: riepilogo statistiche, alert scorte, movimenti recenti, lavori attivi
- **Margini e analytics**: tracciamento prezzi di acquisto e calcolo margine lordo
- **Multitenancy**: supporto multi-azienda con isolamento completo dei dati
- **PWA**: installabile su Android/iOS come app nativa, funziona offline per i dati in cache
- **App Android nativa**: app Kotlin/Compose per operatori sul campo

## Avvio rapido

```bash
# 1. Crea una configurazione locale (non sovrascrive un file .env esistente)
./scripts/setup.sh

# 2. Avvia l'ambiente di sviluppo
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# 3. Apri il browser
open http://localhost
```

Il database viene inizializzato automaticamente con dati di esempio al primo avvio.

Lo script mostra una sola volta la password dell'amministratore creato. Conservala
in un gestore di password.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs backend
```

Per un setup manuale, copiare `.env.example` in `.env`, impostare almeno le
variabili obbligatorie e usare lo stesso comando Compose.

## URL

| Servizio    | URL                           |
|-------------|-------------------------------|
| Frontend    | <http://localhost>            |
| Backend API | <http://localhost:3000>       |
| Health      | <http://localhost:3000/api/health> |
| Postgres    | localhost:5432                |

## API REST — Panoramica endpoint

### Auth

| Metodo | Endpoint                       | Descrizione                   |
|--------|--------------------------------|-------------------------------|
| POST   | /api/auth/login                | Login, ritorna JWT            |
| GET    | /api/auth/me                   | Utente autenticato corrente   |
| POST   | /api/auth/forgot-password      | Richiedi link reset password  |
| POST   | /api/auth/reset-password       | Imposta nuova password        |
| POST   | /api/auth/change-password      | Cambia password (autenticato) |

### Prodotti

| Metodo | Endpoint                       | Descrizione               |
|--------|--------------------------------|---------------------------|
| GET    | /api/products                  | Lista (con filtri/search) |
| GET    | /api/products/:id              | Dettaglio + movimenti     |
| GET    | /api/products/barcode/:barcode | Ricerca per barcode       |
| GET    | /api/products/categories       | Lista categorie           |
| GET    | /api/products/export           | Esporta CSV               |
| POST   | /api/products                  | Crea prodotto             |
| POST   | /api/products/import           | Importa CSV/Excel (upsert)|
| PUT    | /api/products/:id              | Aggiorna prodotto         |
| DELETE | /api/products/:id              | Elimina prodotto          |
| POST   | /api/products/:id/photo        | Carica foto               |

### Movimenti

| Metodo | Endpoint           | Descrizione                  |
|--------|--------------------|-----------------------------|
| GET    | /api/movements     | Lista movimenti (con filtri) |
| POST   | /api/movements     | Registra movimento           |
| DELETE | /api/movements/:id | Elimina movimento            |

### Posizioni

| Metodo | Endpoint           | Descrizione            |
|--------|--------------------|------------------------|
| GET    | /api/locations     | Lista posizioni        |
| POST   | /api/locations     | Crea posizione         |
| PUT    | /api/locations/:id | Aggiorna posizione     |
| DELETE | /api/locations/:id | Elimina posizione      |

### Dashboard

| Metodo | Endpoint                        | Descrizione              |
|--------|---------------------------------|--------------------------|
| GET    | /api/dashboard/stats            | Statistiche generali     |
| GET    | /api/dashboard/alerts           | Prodotti sotto scorta    |
| GET    | /api/dashboard/recent-movements | Ultimi movimenti         |

### Clienti

| Metodo | Endpoint          | Descrizione                  |
|--------|-------------------|------------------------------|
| GET    | /api/clients      | Lista clienti (filtro `?q=`) |
| GET    | /api/clients/:id  | Dettaglio cliente            |
| POST   | /api/clients      | Crea cliente                 |
| PUT    | /api/clients/:id  | Aggiorna cliente             |
| DELETE | /api/clients/:id  | Elimina cliente              |

### Lavori

| Metodo | Endpoint                        | Descrizione                        |
|--------|---------------------------------|------------------------------------|
| GET    | /api/jobs                       | Lista lavori (con filtri)          |
| GET    | /api/jobs/:id                   | Dettaglio + movimenti collegati    |
| POST   | /api/jobs                       | Crea lavoro                        |
| PUT    | /api/jobs/:id                   | Aggiorna lavoro                    |
| DELETE | /api/jobs/:id                   | Elimina lavoro                     |
| GET    | /api/jobs/:id/photos            | Lista foto del lavoro              |
| POST   | /api/jobs/:id/photos            | Carica foto (problem/repair)       |
| DELETE | /api/jobs/:id/photos/:photoId   | Elimina foto                       |

### Fornitori

| Metodo | Endpoint                            | Descrizione                    |
|--------|-------------------------------------|--------------------------------|
| GET    | /api/suppliers                      | Lista fornitori                |
| GET    | /api/suppliers/:id                  | Dettaglio fornitore            |
| POST   | /api/suppliers                      | Crea fornitore                 |
| PUT    | /api/suppliers/:id                  | Aggiorna fornitore             |
| DELETE | /api/suppliers/:id                  | Elimina fornitore              |
| GET    | /api/suppliers/:id/products         | Prodotti del fornitore         |
| PUT    | /api/suppliers/:id/products/:pid    | Associa prodotto a fornitore   |
| DELETE | /api/suppliers/:id/products/:pid    | Rimuovi associazione           |

### Ordini di acquisto

| Metodo | Endpoint                              | Descrizione                   |
|--------|---------------------------------------|-------------------------------|
| GET    | /api/purchase-orders                  | Lista ordini                  |
| GET    | /api/purchase-orders/:id              | Dettaglio ordine + righe      |
| POST   | /api/purchase-orders                  | Crea ordine                   |
| PUT    | /api/purchase-orders/:id              | Aggiorna ordine               |
| DELETE | /api/purchase-orders/:id              | Elimina ordine                |
| POST   | /api/purchase-orders/:id/receive      | Segna come ricevuto           |

### Report giornaliero

| Metodo | Endpoint               | Descrizione                          |
|--------|------------------------|--------------------------------------|
| GET    | /api/reports           | Lista report (admin: tutti)          |
| GET    | /api/reports/:date     | Report per data                      |
| POST   | /api/reports           | Invia/aggiorna report giornaliero    |

### Push

| Metodo | Endpoint                  | Descrizione                        |
|--------|---------------------------|------------------------------------|
| GET    | /api/push/vapid-key       | VAPID public key                   |
| POST   | /api/push/subscribe       | Registra subscription Web Push     |
| DELETE | /api/push/unsubscribe     | Cancella subscription              |

### Prenotazioni veicoli

| Metodo | Endpoint                      | Descrizione                     |
|--------|-------------------------------|---------------------------------|
| GET    | /api/vehicle-bookings         | Lista prenotazioni              |
| POST   | /api/vehicle-bookings         | Crea prenotazione               |
| DELETE | /api/vehicle-bookings/:id     | Elimina prenotazione            |

### Analytics & Margini

| Metodo | Endpoint                 | Descrizione                           |
|--------|--------------------------|---------------------------------------|
| GET    | /api/analytics/van-report| Report movimenti furgone per data     |
| GET    | /api/margins             | Margini per prodotto                  |

### Utenti

| Metodo | Endpoint                      | Descrizione                       |
|--------|-------------------------------|-----------------------------------|
| GET    | /api/users                    | Lista utenti (admin+)             |
| POST   | /api/users                    | Crea utente                       |
| PUT    | /api/users/:id                | Aggiorna utente                   |
| DELETE | /api/users/:id                | Elimina utente                    |
| POST   | /api/users/:id/reset-password | Genera link reset (admin)         |

### Aziende

| Metodo | Endpoint              | Descrizione                            |
|--------|-----------------------|----------------------------------------|
| GET    | /api/companies        | Lista aziende (superadmin)             |
| POST   | /api/companies        | Crea azienda                           |
| PUT    | /api/companies/:id    | Aggiorna azienda                       |
| DELETE | /api/companies/:id    | Elimina azienda (cascata)              |
| POST   | /api/companies/:id/logo | Carica logo aziendale                |

## Query parametri — GET /api/products

| Parametro   | Tipo    | Descrizione                    |
|-------------|---------|--------------------------------|
| q           | string  | Ricerca su nome, SKU, barcode  |
| category    | string  | Filtro categoria               |
| location_id | number  | Filtro posizione               |
| low_stock   | boolean | Solo prodotti sotto scorta     |
| page        | number  | Paginazione (default 1)        |
| limit       | number  | Risultati per pagina (max 100) |

## Sviluppo locale (senza Docker)

### Backend

```bash
cd backend
npm install
cp .env.example .env  # adattare i parametri DB
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
# Apri http://localhost:4200
```

### App Android

Aprire la cartella `ANDROID/` con Android Studio e avviare il progetto. Configurare `BASE_URL` nel file `local.properties` o in `app/build.gradle`.

## Struttura del progetto

```text
StockSimple/
├── docker-compose.yml
├── .env.example
├── db/
│   ├── init.sql                      # Schema completo + seed
│   ├── migrate_v2_*.sql              # Stock per posizione
│   ├── migrate_v3_*.sql              # Autenticazione JWT
│   ├── migrate_v4_*.sql              # Logo aziendale
│   ├── migrate_v5_clients_jobs.sql   # Clienti e lavori
│   ├── migrate_v5_company_currency.sql
│   ├── migrate_v6_push.sql           # Notifiche push
│   ├── migrate_v7_daily_reports.sql  # Report giornaliero
│   ├── migrate_v8_suppliers.sql      # Fornitori
│   ├── migrate_v8_jobs_priority.sql
│   ├── migrate_v9_purchase_price.sql
│   ├── migrate_v10_purchase_orders.sql # Ordini acquisto
│   ├── migrate_v11_location_status.sql
│   ├── migrate_v12_vehicle_bookings.sql # Prenotazioni veicoli
│   └── migrate_v13_job_workflow.sql  # Workflow lavori + foto
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── db.js
│       ├── middleware/auth.js
│       └── routes/
│           ├── auth.js
│           ├── analytics.js
│           ├── clients.js
│           ├── companies.js
│           ├── dashboard.js
│           ├── jobs.js
│           ├── locations.js
│           ├── margins.js
│           ├── movements.js
│           ├── products.js
│           ├── purchase-orders.js
│           ├── push.js
│           ├── reports.js
│           ├── suppliers.js
│           ├── users.js
│           └── vehicle-bookings.js
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── angular.json
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── core/
│       │   │   ├── models/
│       │   │   └── services/
│       │   └── pages/
│       │       ├── dashboard/
│       │       ├── products/
│       │       ├── product-detail/
│       │       ├── product-form/
│       │       ├── scanner/
│       │       ├── movements/
│       │       ├── movement-form/
│       │       ├── locations/
│       │       ├── clients/
│       │       ├── jobs/
│       │       ├── suppliers/
│       │       ├── purchase-orders/
│       │       ├── reports/
│       │       ├── van-load/
│       │       ├── van-report/
│       │       ├── users/
│       │       └── companies/
│       └── assets/i18n/           # it, en, es, fr, ja, ru, zh
└── ANDROID/
    └── app/src/main/java/com/stocksimple/app/
        ├── data/
        │   ├── models/
        │   ├── network/
        │   └── repository/
        └── ui/screens/
            ├── dashboard/
            ├── jobs/
            ├── locations/
            ├── login/
            ├── movements/
            ├── products/
            ├── purchaseorders/
            ├── reports/
            ├── scanner/
            ├── suppliers/
            └── vanreport/
```

## Icone PWA

```bash
cd frontend
npx pwa-asset-generator logo.png src/assets/icons
```

## Scanner barcode

- Su **smartphone Android/iOS**: seleziona automaticamente la fotocamera posteriore
- Richiede **HTTPS** in produzione (localhost funziona in sviluppo)
- Formati supportati: EAN-13, EAN-8, UPC-A, UPC-E, Code-128, Code-39, QR Code, Data Matrix e altri
- Fallback manuale: inserimento diretto del codice senza fotocamera

## TO-DO

1. Inventario Fisico e Riconciliazione (Audit) (IMPLEMENTATO 07/04/2026) non è stato testato
Attualmente il sistema si basa sulla fiducia nei movimenti registrati. Una funzione di "Rettifica Inventario" permetterebbe di:

Aprire una sessione di conteggio per una specifica posizione (es. Furgone 1).
Scansionare tutti i prodotti presenti fisicamente.
Generare automaticamente movimenti di rettifica per allineare il sistema alla realtà, con un report delle discrepanze.
2. Firma Digitale e Rapportini PDF (IMPLEMENTATO 07/04/2026: da testare bene su Android)
Per i lavori (Cantieri), potresti implementare la chiusura del lavoro con firma del cliente direttamente sul tablet/smartphone:

Cattura della firma tramite canvas.
Generazione automatica di un Rapportino d'Intervento PDF che include: descrizione, materiali consumati, foto del prima/dopo e firma.
Invio automatico via Email o WhatsApp al cliente. (da valutare asap)
3. Integrazione Mappe e Ottimizzazione Percorsi
Sfruttando gli indirizzi già presenti nei Lavori (Cantieri) e nei Clienti:

Visualizzazione su mappa di tutti i lavori programmati per la giornata.
Suggerimento del percorso ottimale per l'operatore, riducendo tempi di spostamento e consumo di carburante.
4. Gestione Lotti e Scadenze (implementato il 9 aprile 2026: da testare)
Fondamentale se l'app venisse usata per prodotti deperibili o chimici (es. sigillanti, resine, vernici):

Tracciamento del Numero di Lotto e della Data di Scadenza per ogni carico.
Alert specifici quando un prodotto in magazzino è prossimo alla scadenza (non solo sotto scorta).
5. Portale Cliente "Light"
Un'area ad accesso limitato per i tuoi clienti dove possono:

Vedere lo stato dei lavori in corso.
Scaricare i rapportini firmati e vedere le foto degli interventi completati.
Richiedere un nuovo intervento (che diventerebbe un lavoro in stato bozza per l'admin).
6. Manutenzione Attrezzature (Asset Management)
Oltre ai prodotti consumabili, potresti gestire i beni capitali (trapani, scale, generatori):

Registro delle scadenze di manutenzione (es. "Revisione Trapano ogni 12 mesi").
Assegnazione degli asset ai furgoni/operatori per sapere sempre chi ha cosa in carico (evitando smarrimenti).
7. Previsione Riordini basata su AI/Dati Storici
Invece di basarsi solo sulla scorta minima fissa:

Analisi dei movimenti passati per prevedere quando un prodotto finirà.
Generazione automatica di Ordini d'Acquisto in Bozza per il fornitore preferito, anticipando i picchi di lavoro stagionali.
8. Messaggistica Interna per Singolo Lavoro (implementata il 9 aprile da testare su mobile)
Sostituire WhatsApp con una chat interna dedicata:

Ogni "Lavoro" ha la sua bacheca dove l'ufficio e l'operatore possono scambiarsi note, messaggi vocali e istruzioni specifiche.
Tutta la cronologia rimane legata al cantiere per consultazioni future.
9. Bridge verso la Fatturazione Elettronica
Automatizzare il passaggio tra magazzino e contabilità:

Esportazione dei flussi di acquisto (ordini ricevuti) o consumo (materiali usati sui cantieri) verso gestionali come FattureInCloud, QuickBooks o formati standard XML.
10. Modalità "Offline-First" Avanzata
Migliorare l'attuale gestione PWA/Android:

Permettere all'operatore di registrare scarichi e scattare foto anche in cantieri interrati o senza segnale.
Sincronizzazione automatica intelligente e risoluzione dei conflitti non appena torna disponibile la connessione.

## Note di manutenzione

Se inserisco più foto e/o video il rapportino in pdf è sbagliato.
La firma non si vede bene.

-- CMD VARI

1) Get-Content .\db\migrate_v19_word_template.sql | docker exec -i stocksimple-db psql -U stockuser -d stocksimple

o

/usr/local/bin/docker exec -i stocksimple-db psql -U stockuser -d stocksimple < db/migrations/021_user_absences.sql

1) docker compose up -d --build

2) dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true  

3) adb reverse tcp:3000 tcp:3000

Verifica end-to-end

docker compose up --build — backend pronto su :3000, scheduler arma il primo backup dopo 60s
Verifica file su volume: docker exec stocksimple-backend ls /app/backups → db_<ts>.sql.gz, uploads_<ts>.tar.gz, <ts>.manifest.json
UI: come superadmin in /import-export vedi sezione "Backup automatici" con il backup
Export manuale: pulsante "Esporta dati" → scarica .zip, ispeziona con unzip -l: dovrebbe contenere data.json + uploads/...
Import: in altra istanza, carica .zip → tabelle ripopolate, foto job visibili
Restore auto-backup: click "Ripristina" → richiede conferma destruttiva → DB sovrascritto, file in /app/uploads ripristinati
Disable: DISABLE_AUTO_BACKUP=1 nell'env → nessun nuovo backup
Nota: il restore in produzione richiede idealmente un riavvio del container backend (le connessioni del pool sono mantenute). Aggiungiamo restart: unless-stopped già presente in compose, quindi docker restart stocksimple-backend dopo un restore è la prassi consigliata.

docker exec -i stocksimple-db psql -U stockuser stocksimple <<'SQL'
CREATE TABLE IF NOT EXISTS product_categories (
  id         SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_company_name
  ON product_categories (company_id, LOWER(name));
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL;
SQL

docker exec -i stocksimple-db psql -U stockuser stocksimple < db/migrate_categories.sql

## per usare la cartella DATA per i backup

Ora riavvia con i nuovi mount (Docker creerà le cartelle automaticamente):

docker compose -f docker-compose.yml -f docker-compose.dev.yml down
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
./db/migrate_local.sh
D'ora in poi down -v può cancellare solo postgres_data — uploads e backup sono in ./data/ sul filesystem e sopravvivono a qualsiasi operazione Docker.

Sulla VPS devi spostare i dati esistenti prima di riavviare:

# Copia i dati dai vecchi volumi alle nuove cartelle host

docker run --rm \
  -v stocksimpleapp_uploads_data:/src/uploads \
  -v stocksimpleapp_backups_data:/src/backups \
  -v $(pwd)/data:/dst \
  alpine sh -c "cp -a /src/uploads /dst/ && cp -a /src/backups /dst/"
Poi fai il deploy normale senza -v.

## PER CREARE UTENTE SUPERADMIN

docker exec stocksimple-backend node -e "
const bcrypt = require('bcryptjs');
const db = require('./src/db');
(async () => {
  const hash = await bcrypt.hash('Admin123!', 10);
  // Get or create company
  let { rows } = await db.query('SELECT id FROM companies LIMIT 1');
  let companyId;
  if (rows.length) {
    companyId = rows[0].id;
  } else {
    const r = await db.query(\"INSERT INTO companies (name) VALUES ('StockSimple Demo') RETURNING id\");
    companyId = r.rows[0].id;
  }
  await db.query(
    \`INSERT INTO users (company_id, email, password_hash, name, role)
     VALUES (\$1, \$2, \$3, 'Administrator', 'superadmin')
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'superadmin'\`,
    [companyId, 'admin@example.com', hash]
  );
  console.log('Done. company_id=' + companyId);
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
"

# template per prompt con agenti
### DA QUI

Vorrei sviluppare una nuova funzionalità per il progetto.
Di seguito trovi i dettagli della feature:

---
### Specifiche della Feature
[INSERISCI QUI LA DESCRIZIONE DETTAGLIATA DELLA FEATURE. Es: "Aggiungere un pulsante nell'app mobile e nella webapp per scaricare il PDF dell'inventario magazzino."]
---

Agisci da **Project Manager e Coordinatore degli Agenti**. Segui rigorosamente questo flusso di lavoro per l'implementazione:

---

### FLUSSO DI LAVORO OBBLIGATORIO

#### FASE 1: Decomposizione dei Task e Inizio Sviluppo
1. **Analisi:** Analizza i requisiti e dividi la feature in sub-task specifici per ogni agente competente:
   - `backend-developer`: per API, tabelle/query PostgreSQL e logica server.
   - `frontend-developer`: per l'interfaccia WAP.
   - `mobile-developer`: per l'interfaccia Flutter.
2. **Esecuzione Rispettando i Permessi:** Fai eseguire i task agli agenti rispettando le restrizioni delle cartelle definite nei loro file di configurazione (`.md` / `.toml`).
   - *Nota:* Se un agente client ha bisogno di un'API non ancora esistente, fai intervenire PRIMA il `backend-developer`.

---

#### FASE 2: QA Testing e Ciclo di Refactoring (Max 3 Iterazioni)
Una volta completato lo sviluppo, passa la palla al `qa-agent` per la verifica.
Inizia il seguente **Ciclo di Test/Fix**:

- **A.** Il `qa-agent` deve scrivere/eseguire i test ed eseguire la suite di verifica per individuare bug, regressioni o edge case.
- **B.** **Se il `qa-agent` NON trova bug (VERIFICA SUPERATA):** Procedi subito alla **FASE 3**.
- **C.** **Se il `qa-agent` trova dei bug (VERIFICA FALLITA):**
  - Il `qa-agent` assegna la risoluzione del bug all'agente di sviluppo responsabile (`backend-developer`, `frontend-developer` o `mobile-developer`).
  - L'agente sviluppatore corregge il codice (rispettando sempre il proprio scope di cartelle).
  - Il `qa-agent` ri-esegue la verifica.

> ⚠️ **REGOLE DEL CICLO DI FIX:**
> - Puoi ripetere questo ciclo di correzione/ri-verifica fino a un **MASSIMO DI 3 TENTATIVI (3 iterazioni)**.
> - Se al termine del 3° tentativo il bug **persiste ancora**, **INTERRUMPI IL FLUSSO** e genera un **BUG REPORT DETTAGLIATO** per l'utente, specificando:
>   1. Descrizione del bug e severity.
>   2. Passi per riprodurlo e log/errori riscontrati dal QA.
>   3. Tentativi di risoluzione già effettuati e perché sono falliti.
>   4. File impattati e suggerimenti per l'intervento umano.

---

#### FASE 3: Chiusura e Documentazione
Se la verifica del `qa-agent` ha successo (con o senza fix nei 3 tentativi):
1. Invocare l'agente `docs-keeper`.
2. L'agente `docs-keeper` deve analizzare le modifiche apportate alla webapp e all'app mobile e aggiornare la documentazione utente nella cartella `docs/`.
3. Invia all'utente un riepilogo finale del lavoro svolto da ciascun agente.


### a qui
