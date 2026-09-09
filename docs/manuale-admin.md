# StockSimple — Manuale Amministratore

> Versione 2.0 — aggiornato agosto 2026

## Indice

1. [Ruoli e permessi](#1-ruoli-e-permessi)
2. [Primo avvio e credenziali iniziali](#2-primo-avvio-e-credenziali-iniziali)
3. [Navigazione — gruppo Amministrazione](#3-navigazione--gruppo-amministrazione)
4. [Gestione utenti e inviti](#4-gestione-utenti-e-inviti)
5. [Abbonamento e seat licensing](#5-abbonamento-e-seat-licensing)
6. [Gestione posizioni e prenotazioni veicoli](#6-gestione-posizioni-e-prenotazioni-veicoli)
7. [Gestione clienti](#7-gestione-clienti)
8. [Gestione fornitori](#8-gestione-fornitori)
9. [Ordini di acquisto](#9-ordini-di-acquisto)
10. [Report giornalieri](#10-report-giornalieri)
11. [Gestione presenze (Attendance)](#11-gestione-presenze-attendance)
12. [Assenze del personale](#12-assenze-del-personale)
13. [Analytics e margini](#13-analytics-e-margini)
14. [Inventario fisico (Audit)](#14-inventario-fisico-audit)
15. [Notifiche push](#15-notifiche-push)
16. [Gestione azienda](#16-gestione-azienda)
17. [Configurazione SMTP per-azienda](#17-configurazione-smtp-per-azienda)
18. [Import/Export dati](#18-importexport-dati)
19. [Backup automatici e ripristino](#19-backup-automatici-e-ripristino)
20. [Configurazione ambiente (.env)](#20-configurazione-ambiente-env)
21. [Avvio e gestione dei container Docker](#21-avvio-e-gestione-dei-container-docker)
22. [Migrazioni del database](#22-migrazioni-del-database)
23. [Aggiornamento dell'applicazione](#23-aggiornamento-dellapplicazione)
24. [Multitenancy — gestione più aziende (superadmin)](#24-multitenancy--gestione-piu-aziende-superadmin)
25. [Troubleshooting](#25-troubleshooting)

---

## 1. Ruoli e permessi

StockSimple prevede tre livelli di accesso:

| Ruolo        | Descrizione                    | Permessi principali                                              |
|--------------|--------------------------------|------------------------------------------------------------------|
| `user`       | Operatore di magazzino         | Prodotti (sola lettura), propri movimenti, propri lavori, timbrature |
| `admin`      | Amministratore aziendale       | Tutto ciò che fa `user` + gestione completa dati aziendali       |
| `superadmin` | Amministratore di piattaforma  | Accesso completo a tutte le aziende, gestione multitenancy       |

### Matrice dettagliata

| Azione                                                       | user | admin | superadmin |
|--------------------------------------------------------------|:----:|:-----:|:----------:|
| Visualizzare prodotti                                        |  ✓   |   ✓   |     ✓      |
| Registrare movimenti / Usa 1                                 |  ✓   |   ✓   |     ✓      |
| Vedere i propri movimenti (solo oggi)                        |  ✓   |   ✓   |     ✓      |
| Vedere tutti i movimenti (qualsiasi data/utente)             |  -   |   ✓   |     ✓      |
| Visualizzare i propri lavori                                 |  ✓   |   ✓   |     ✓      |
| Aggiornare stato lavoro assegnato                            |  ✓   |   ✓   |     ✓      |
| Caricare foto lavori / registrare arrivo                     |  ✓   |   ✓   |     ✓      |
| Chat interna lavoro                                          |  ✓   |   ✓   |     ✓      |
| Firma cliente                                                |  ✓   |   ✓   |     ✓      |
| Timbrare (check-in/out/pausa)                                |  ✓   |   ✓   |     ✓      |
| Richiedere correzione timbratura                             |  ✓   |   ✓   |     ✓      |
| Inviare report giornaliero                                   |  ✓   |   ✓   |     ✓      |
| Carico massivo furgone                                       |  ✓   |   ✓   |     ✓      |
| Richiedere rifornimento prodotto                             |  ✓   |   ✓   |     ✓      |
| Visualizzare tutti i lavori                                  |  -   |   ✓   |     ✓      |
| Creare/modificare/eliminare lavori                           |  -   |   ✓   |     ✓      |
| Assegnare lavori agli utenti                                 |  -   |   ✓   |     ✓      |
| Creare/modificare/eliminare prodotti                         |  -   |   ✓   |     ✓      |
| Importare/esportare CSV prodotti                             |  -   |   ✓   |     ✓      |
| Accedere a Clienti, Fornitori, Ordini acquisto               |  -   |   ✓   |     ✓      |
| Gestire posizioni e prenotazioni veicoli                     |  -   |   ✓   |     ✓      |
| Visualizzare/eliminare report giornalieri di tutti           |  -   |   ✓   |     ✓      |
| Filtrare Van Report per operatore                            |  -   |   ✓   |     ✓      |
| Gestire presenze del team (approvare correzioni)             |  -   |   ✓   |     ✓      |
| Approvare/rifiutare assenze                                  |  -   |   ✓   |     ✓      |
| Gestire margini e analytics                                  |  -   |   ✓   |     ✓      |
| Eseguire inventario fisico (audit)                           |  -   |   ✓   |     ✓      |
| Import/Export dati aziendali                                 |  -   |   ✓   |     ✓      |
| Gestire backup e ripristino                                  |  -   |   ✓   |     ✓      |
| Gestire utenti della propria azienda                         |  -   |   ✓   |     ✓      |
| Invitare utenti via email                                    |  -   |   ✓   |     ✓      |
| Configurare SMTP aziendale                                   |  -   |   ✓   |     ✓      |
| Creare aziende                                               |  -   |   -   |     ✓      |
| Gestire abbonamenti e seat licensing                         |  -   |   -   |     ✓      |
| Gestire utenti di qualsiasi azienda                          |  -   |   -   |     ✓      |
| Caricare/aggiornare logo aziendale                           |  -   |   -   |     ✓      |

---

## 2. Primo avvio e credenziali iniziali

Al primo avvio del backend, lo script `seed-admin.js` crea automaticamente:

- Un'azienda di default
- Un utente amministratore

Le credenziali vengono configurate tramite le variabili d'ambiente nel file `.env`:

```env
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASS=scegli_una_password_univoca
DEFAULT_COMPANY_NAME=Demo Company
```

Le credenziali iniziali vengono anche stampate nei log del container backend:

```bash
docker compose logs backend | grep -i admin
```

> **Cambiare immediatamente la password** dell'account admin al primo accesso.

---

## 3. Navigazione — gruppo Amministrazione

Nella barra laterale, le voci riservate agli admin sono raggruppate sotto un menu collassabile **Amministrazione** (visibile solo ad admin e superadmin):

- **Clienti**
- **Fornitori**
- **Ordini acquisto**
- **Posizioni**
- **Utenti**
- **Società** (solo superadmin)

Gli utenti con ruolo `user` non vedono queste voci nel menu e vengono reindirizzati alla dashboard se tentano l'accesso diretto tramite URL.

---

## 4. Gestione utenti e inviti

### 4.1 Creare un nuovo utente (direttamente)

1. Dalla sezione **Amministrazione → Utenti** cliccare **+ Nuovo utente**.
2. Compilare: email, nome, password (min 8 caratteri), ruolo.
3. Salvare.

Un `admin` può creare utenti con ruolo `user` o `admin`. Solo il `superadmin` può creare altri `superadmin`.

### 4.2 Invitare un utente via email

1. Dalla sezione **Utenti** cliccare **Invita utente**.
2. Inserire email e ruolo desiderato.
3. Il sistema invia un'email con un link di invito (richiede configurazione SMTP).
4. L'utente invitato clicca il link, imposta la propria password e accede.

> Lo stato dell'utente invitato è `INVITED` e consuma un seat finché non accetta o viene annullato.

### 4.3 Modificare un utente

Dalla lista utenti cliccare l'icona a matita. È possibile modificare: nome, ruolo, stato attivo/disattivato e password.

### 4.4 Disattivare un utente

Invece di eliminare un utente, è consigliato **disattivarlo** (toggle `Attivo`). Un utente disattivato (stato `INACTIVE`) non può accedere al sistema ma il suo storico movimenti viene conservato e non consuma più un seat.

### 4.5 Generare un link di reset password

1. Dalla lista utenti cliccare l'icona **Reset password** accanto all'utente.
2. Il sistema genera un link valido per 24 ore.
3. Copiare il link e inviarlo all'utente tramite il proprio canale.

### 4.6 Foto profilo utente

Ogni utente può avere una foto profilo (`photo_url`). Può essere impostata dall'admin dal pannello utenti.

### 4.7 Eliminare un utente

Cliccare l'icona del cestino. L'operazione è irreversibile. Non è possibile eliminare il proprio account.

---

## 5. Abbonamento e seat licensing

Ogni azienda ha un **abbonamento** (`subscriptions`) che controlla:

| Campo        | Descrizione                                             |
|--------------|---------------------------------------------------------|
| `plan_type`  | Tipo di piano (`BASIC`, o piani superiori)              |
| `max_seats`  | Numero massimo di utenti attivi (`ACTIVE` o `INVITED`)  |
| `status`     | `ACTIVE`, `TRIAL`, `SUSPENDED`, `PAST_DUE`             |
| `expires_at` | Data di scadenza (null = nessuna scadenza)              |

Il piano **BASIC** (default) include 5 seat. Quando si raggiunge il limite, non è possibile creare o invitare nuovi utenti finché non si libera un seat (disattivando un utente) o si aggiorna il piano.

La gestione dei piani è riservata ai **superadmin** dalla sezione Società.

---

## 6. Gestione posizioni e prenotazioni veicoli

### Gestire le posizioni

1. Dalla sezione **Amministrazione → Posizioni** cliccare **+ Nuova posizione**.
2. Compilare: nome, tipo (`warehouse`, `van`, `site`, `other`), targa (per furgoni), descrizione, indirizzo.
3. Salvare.

**Nota:** prima di eliminare una posizione verificare che non abbia stock residuo. I prodotti con quella posizione come primaria verranno impostati a "nessuna posizione".

### Stato delle posizioni

| Stato              | Quando usarlo                         |
|--------------------|---------------------------------------|
| `disponibile`      | Furgone/posizione libera              |
| `occupato`         | In uso su un lavoro                   |
| `in_manutenzione`  | Fuori servizio                        |

### Prenotazioni veicoli

I furgoni possono essere prenotati per data e fascia oraria per evitare conflitti:

1. Dalla sezione **Prenotazioni** cliccare **+ Nuova prenotazione**.
2. Selezionare il furgone, la data, la fascia oraria (`tutto il giorno`, `mattina`, `pomeriggio`).
3. Collegare opzionalmente la prenotazione a un lavoro.
4. Salvare. Il sistema impedisce doppie prenotazioni per la stessa fascia.

> Un lavoro può avere più prenotazioni furgone (es. mattina e pomeriggio su furgoni diversi).

---

## 7. Gestione clienti

1. Dalla sezione **Amministrazione → Clienti** cliccare **+ Nuovo cliente**.
2. Compilare: nome (obbligatorio), telefono, email, indirizzo, note.
3. Salvare.

I clienti possono essere associati ai lavori al momento della creazione o modifica del lavoro. Dal dettaglio cliente è visibile la lista di tutti i lavori associati.

---

## 8. Gestione fornitori

### Creare un fornitore

1. Dalla sezione **Amministrazione → Fornitori** cliccare **+ Nuovo fornitore**.
2. Compilare: nome (obbligatorio), referente, telefono, email, sito web, indirizzo, note, giorni di consegna.
3. Salvare.

### Associare prodotti a un fornitore

Dal dettaglio fornitore:

1. Cliccare **+ Aggiungi prodotto**.
2. Selezionare il prodotto e inserire il prezzo di acquisto.
3. Impostare **Fornitore preferito** se si tratta della fonte principale per quel prodotto.
4. Salvare.

Ogni prodotto può avere più fornitori. Il fornitore preferito è evidenziato e viene usato come suggerimento negli ordini di acquisto.

---

## 9. Ordini di acquisto

### Creare un ordine

1. Dal menu **Ordini acquisto** cliccare **+ Nuovo ordine**.
2. Selezionare il fornitore.
3. Aggiungere le righe con prodotto, quantità ordinata e prezzo unitario.
4. Salvare come **bozza** o passare subito a **inviato**.

### Ciclo di vita

```
bozza  →  inviato  →  ricevuto
```

### Ricevere un ordine

1. Aprire l'ordine in stato `inviato`.
2. Cliccare **Segna come ricevuto**.
3. Inserire le quantità effettivamente ricevute per ogni riga.
4. Confermare: il sistema registra automaticamente i movimenti di carico e aggiorna lo stock.

---

## 10. Report giornalieri

Gli admin possono visualizzare i report giornalieri di tutti gli operatori:

1. Dal menu **Report** selezionare la data o l'operatore.
2. Il report mostra: note dell'operatore, lavori completati nella giornata, movimenti registrati.

Utile per il controllo delle attività giornaliere del team e per la fatturazione.

### Eliminare un report

Gli admin possono eliminare un report giornaliero (ad esempio se compilato per errore):

1. Aprire il report dalla lista.
2. Cliccare il pulsante **Elimina** (icona cestino).
3. Confermare l'eliminazione.

---

## 11. Gestione presenze (Attendance)

StockSimple include un modulo completo di gestione presenze basato su **event sourcing** (log immutabile degli eventi).

### Come funziona

Il sistema registra ogni azione di timbratura come un evento immutabile con:
- Tipo di azione (`CHECK_IN`, `CHECK_OUT`, `BREAK_START`, `BREAK_END`)
- Stato risultante (`OUT`, `IN`, `BREAK`, `PENDING_REVIEW`, `LOCKED`)
- Timestamp, GPS, device ID, fonte (`mobile`, `web`, `admin`)

### Pannello admin presenze

Dalla sezione **Presenze** (admin), è possibile:

- Visualizzare lo storico giornaliero di tutti gli operatori
- Vedere anomalie rilevate automaticamente (entrata tardiva, uscita anticipata, ecc.)
- Gestire le **richieste di correzione** degli operatori:
  1. L'operatore invia una richiesta di correzione con motivazione
  2. L'admin approva o rifiuta dalla sezione presenze
  3. Se approvata, viene creato un evento di correzione collegato alla richiesta originale

### Soglie di ritardo

L'admin può configurare le soglie per la rilevazione automatica delle anomalie (es. ritardo entrata > X minuti).

### Timesheet

Il timesheet consolida le presenze per periodo (settimana/mese) mostrando:
- Ore lavorate per giorno
- Totale settimanale/mensile
- Anomalie da gestire

---

## 12. Assenze del personale

Gli operatori possono segnalare assenze pianificate (ferie, permessi, malattia). Gli admin gestiscono le richieste dalla sezione **Assenze**:

| Stato       | Significato                              |
|-------------|------------------------------------------|
| `pending`   | Richiesta in attesa di revisione         |
| `approved`  | Assenza approvata                        |
| `rejected`  | Assenza rifiutata                        |

---

## 13. Analytics e margini

### Van Report

Riepilogo movimenti giornalieri per furgone. Accessibile anche agli utenti `user` per il proprio furgone.

### Margini per prodotto

La sezione **Margini** (admin) mostra:

- Prezzo di acquisto medio ponderato per prodotto
- Prezzo di vendita
- Margine lordo percentuale e assoluto

I movimenti di scarico registrano uno **snapshot del costo unitario** e del **prezzo di vendita** al momento della transazione, garantendo l'accuratezza dell'analisi storica anche se i prezzi cambiano in seguito.

### Analytics avanzate

La sezione Analytics include:
- Report movimenti per furgone (`/api/analytics/van-report`)
- Storico consumi per lavoro

---

## 14. Inventario fisico (Audit)

La funzionalità di **rettifica inventario** permette di riconciliare il sistema con la realtà fisica:

1. Aprire una sessione di conteggio per una specifica posizione.
2. Contare fisicamente i prodotti e inserire le quantità rilevate.
3. Il sistema calcola automaticamente le discrepanze tra quantità registrate e contate.
4. Generare movimenti di rettifica per allineare il sistema alla realtà.

> Questa funzionalità è accessibile dalla sezione **Audit** (solo admin).

---

## 15. Notifiche push

### Come funzionano

Il sistema invia automaticamente notifiche push a tutti gli utenti dell'azienda che le hanno attivate quando:
- Un prodotto scende sotto la soglia minima di scorta

### Attivazione (per ogni utente)

Ogni utente deve attivare autonomamente le notifiche dalla barra laterale (pulsante **Attiva notifiche scorte**). L'attivazione richiede il consenso del browser.

### Prerequisiti tecnici

- L'app deve essere aperta nel browser o installata come PWA.
- Il browser deve avere i permessi per le notifiche attivi per il dominio dell'app.
- Per Edge: verificare che il **Tracking prevention** in `edge://settings/privacy` non sia su *Strict*.
- L'app deve essere servita su HTTPS in produzione.
- Il database deve contenere le chiavi VAPID generate (`vapid_public_key` e `vapid_private_key` in `app_settings`).

---

## 16. Gestione azienda

### Dati aziendali

Dalla sezione **Amministrazione → Società** è possibile modificare:
- Nome aziendale
- Valuta (`EUR`, `USD`, ecc.)

### Logo aziendale (solo superadmin)

1. Aprire la propria azienda dalla sezione Società.
2. Caricare il logo tramite il pulsante apposito.
3. Formato consigliato: PNG con sfondo trasparente, max 2 MB.

Il logo viene mostrato nell'interfaccia dell'app.

---

## 17. Configurazione SMTP per-azienda

Per inviare email di invito utente e rifornimento, ogni azienda può configurare il proprio server SMTP:

1. Dalla sezione **Impostazioni → SMTP** (admin) compilare:
   - Host, porta, SSL/TLS
   - Username e password (cifrata con AES-256-GCM)
   - Email mittente e nome mittente
2. Salvare e testare la configurazione.

> La password SMTP è cifrata a riposo nel database e non viene mai restituita in chiaro dalle API.

---

## 18. Import/Export dati

### Export manuale

Dalla sezione **Import/Export** (admin), il pulsante **Esporta dati** scarica un archivio `.zip` contenente:
- `data.json` — tutti i dati dell'azienda (prodotti, movimenti, lavori, ecc.)
- `uploads/` — tutte le foto e i file allegati

### Import

Per importare dati in una nuova istanza o ripristinare:
1. Caricare il file `.zip` precedentemente esportato.
2. Confermare: le tabelle vengono ripopolate e le foto ripristinate.

### Export prodotti (CSV)

Dalla lista prodotti, il pulsante **Esporta CSV** scarica l'inventario in formato CSV.

### Import prodotti (CSV/Excel)

Il pulsante **Importa** permette il caricamento di file `.csv` o `.xlsx` con upsert per SKU (aggiorna i prodotti esistenti, crea i nuovi).

---

## 19. Backup automatici e ripristino

Il backend include un sistema di **backup automatici** configurabile:

| Componente       | Descrizione                                       |
|------------------|---------------------------------------------------|
| Database         | Dump PostgreSQL compresso (`db_<ts>.sql.gz`)      |
| File uploads     | Archivio compresso (`uploads_<ts>.tar.gz`)        |
| Manifest         | File JSON con metadati del backup                 |
| Frequenza        | Configurabile; primo backup dopo 60s dall'avvio   |
| Disabilitazione  | `DISABLE_AUTO_BACKUP=1` nel file `.env`           |

### Verifica backup

```bash
docker exec stocksimple-backend ls /app/backups
```

### Ripristino da backup automatico

1. Dalla sezione **Import/Export → Backup automatici** (superadmin) selezionare il backup desiderato.
2. Cliccare **Ripristina** e confermare l'operazione distruttiva.
3. Riavviare il container backend dopo il ripristino:

```bash
docker restart stocksimple-backend
```

### Backup manuale

```bash
# Dump completo
docker compose exec db pg_dump -U stockuser stocksimple > backup_$(date +%Y%m%d_%H%M%S).sql

# Ripristino
cat backup_20240101_120000.sql | docker compose exec -T db psql -U stockuser stocksimple
```

---

## 20. Configurazione ambiente (.env)

```bash
cp .env.example .env
```

### Variabili principali

| Variabile               | Default                    | Descrizione                                        |
|-------------------------|----------------------------|----------------------------------------------------|
| `POSTGRES_DB`           | `stocksimple`              | Nome del database PostgreSQL                       |
| `POSTGRES_USER`         | `stockuser`                | Utente del database                                |
| `POSTGRES_PASSWORD`     | —                          | Password del database (**obbligatoria in prod**)   |
| `JWT_SECRET`            | `dev-secret-...`           | Chiave JWT — **cambiare in produzione**             |
| `JWT_EXPIRES`           | `7d`                       | Durata del token di sessione                       |
| `DEFAULT_ADMIN_EMAIL`   | `admin@example.com`        | Email admin al primo avvio                         |
| `DEFAULT_ADMIN_PASS`    | —                           | Password admin obbligatoria al primo avvio         |
| `DEFAULT_COMPANY_NAME`  | `Demo Company`             | Nome azienda creata al primo avvio                 |
| `FRONTEND_URL`          | `http://localhost`         | URL base del frontend (link reset password, invite) |
| `UPLOAD_DIR`            | `./uploads`                | Directory per foto prodotti, loghi, foto lavori    |
| `DISABLE_AUTO_BACKUP`   | (non impostato)            | Impostare a `1` per disabilitare i backup auto     |

### Sicurezza in produzione

- Impostare `JWT_SECRET` con un valore casuale lungo almeno 32 caratteri.
- Impostare `POSTGRES_PASSWORD` con una password sicura.
- Cambiare `DEFAULT_ADMIN_PASS` o cambiare la password admin dopo il primo avvio.
- Assicurarsi che il backend non sia esposto direttamente su internet (usare Nginx come proxy).

---

## 21. Avvio e gestione dei container Docker

### Avvio

```bash
# Prima volta (build + avvio)
docker compose up -d --build

# Avvii successivi
docker compose up -d
```

### Verifica stato

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

### Arresto

```bash
docker compose down
```

### Arresto con eliminazione dati (reset completo)

```bash
# ATTENZIONE: elimina il volume del database
docker compose down -v
```

### URL dei servizi

| Servizio     | URL                              |
|--------------|----------------------------------|
| Frontend     | http://localhost                 |
| Backend API  | http://localhost:3000            |
| Health check | http://localhost:3000/api/health |
| PostgreSQL   | localhost:5432                   |

### Dati persistenti (montati su filesystem host)

Con la configurazione `docker-compose.dev.yml`, uploads e backup vengono montati in `./data/` sul filesystem host e sopravvivono a `docker compose down -v`.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

---

## 22. Migrazioni del database

Le nuove installazioni partono da `init.sql` che include già tutto lo schema aggiornato. Per installazioni esistenti, applicare le migrazioni incrementali:

```bash
cat db/migrate_v16_job_chat.sql | docker compose exec -T db psql -U stockuser stocksimple
```

### Cronologia migrazioni

| Migrazione                      | Contenuto                                           |
|---------------------------------|-----------------------------------------------------|
| `init.sql`                      | Schema iniziale completo                            |
| `migrate_v2_*`                  | Tabella `product_stocks` (stock per posizione)      |
| `migrate_v3_auth`               | Autenticazione JWT, `users`, `companies`            |
| `migrate_v4_company_logo`       | Logo aziendale                                      |
| `migrate_v5_clients_jobs`       | `clients`, `jobs`                                   |
| `migrate_v5_company_currency`   | Valuta aziendale                                    |
| `migrate_v6_push`               | `push_subscriptions`, `app_settings`                |
| `migrate_v7_daily_reports`      | `daily_reports`                                     |
| `migrate_v8_suppliers`          | `suppliers`, `product_suppliers`                    |
| `migrate_v8_jobs_priority`      | Priorità sui lavori                                 |
| `migrate_v9_purchase_price`     | Prezzo di acquisto sui movimenti                    |
| `migrate_v10_purchase_orders`   | `purchase_orders`, `purchase_order_items`           |
| `migrate_v11_location_status`   | Stato sulle posizioni                               |
| `migrate_v12_vehicle_bookings`  | `vehicle_bookings`                                  |
| `migrate_v13_job_workflow`      | `job_photos`, workflow lavori, firma cliente        |
| `migrate_v14_job_signature`     | Firma digitale cliente                              |
| `migrate_v14_ore_lavorate`      | Ore lavorate (deprecato da v23)                     |
| `migrate_v15_attendance`        | `attendance`, `attendance_requests` (v1)            |
| `migrate_v16_job_chat`          | `job_messages` (chat interna per lavoro)            |
| `migrate_v17_batches`           | `product_batches`, tracciamento lotti e scadenze    |
| `migrate_v18_work_shifts`       | Turni di lavoro                                     |
| `migrate_v19_word_template`     | Template Word per rapportini                        |
| `migrate_v20_geolocation`       | GPS su `job_photos` e `job_state_changes`           |
| `migrate_v21_job_photos_geo`    | Geolocalizzazione aggiuntiva foto lavori            |
| `migrate_v22_attendance_v2`     | `attendance_events`, `attendance_override_requests` (event sourcing) |
| `migrate_v23_late_thresholds`   | Soglie di ritardo configurabili                     |
| `migrate_v24_movement_status`   | Stato sui movimenti                                 |
| `migrate_v25_subscriptions`     | `subscriptions` (seat licensing)                    |
| `migrate_v26_users_status`      | `users.status` (`ACTIVE`/`INACTIVE`/`INVITED`)      |
| `migrate_v27_company_smtp`      | `company_smtp_settings` (SMTP per azienda)          |
| `migrate_v28_user_invites`      | Sistema inviti utente via email                     |
| `migrate_v29_job_photos_media`  | Tipo media (`image`/`video`) su `job_photos`        |
| `migrate_v30_job_product_missing` | Segnalazione materiali mancanti                  |
| `migrate_v31_job_state_changes_signed` | Firma su cambio stato lavoro               |
| `migrate_v32_job_product_missing_note` | Note su materiali mancanti                 |
| `migrate_v33_notifications`     | `notifications` (centro notifiche in-app)           |
| `migrate_v34_movement_cost_snapshot` | Snapshot costo/prezzo su movimenti (storico margini) |
| `migrate_v35_attendance_dismiss` | Dismissione anomalie presenze                      |
| `migrations/021_user_absences`  | `user_absences` (gestione assenze)                  |
| `migrations/022_user_photo`     | Foto profilo utente                                 |

---

## 23. Aggiornamento dell'applicazione

```bash
# 1. Scaricare le ultime modifiche
git pull origin main

# 2. Ricostruire i container
docker compose up -d --build

# 3. Verificare i log
docker compose logs -f backend
```

---

## 24. Multitenancy — gestione più aziende (superadmin)

StockSimple supporta più aziende nello stesso database. Ogni azienda ha i propri prodotti, posizioni, utenti, lavori, fornitori e ordini completamente isolati.

### Creare una nuova azienda

1. Accedere con un account `superadmin`.
2. Dalla sezione **Amministrazione → Società** cliccare **+ Nuova azienda**, inserire il nome e salvare.
3. Il sistema crea automaticamente un abbonamento `BASIC` con 5 seat per la nuova azienda.

### Creare il primo admin di una nuova azienda

1. Andare in **Amministrazione → Utenti**.
2. Cliccare **+ Nuovo utente**.
3. Selezionare l'azienda di destinazione dal menu a tendina (visibile solo ai superadmin).
4. Assegnare il ruolo `admin`.
5. Salvare e comunicare le credenziali all'amministratore dell'azienda.

### Isolamento dei dati

Ogni chiamata API viene filtrata automaticamente per `company_id`. Un utente `admin` di un'azienda non può vedere o modificare i dati di un'altra azienda.

---

## 25. Troubleshooting

### Il container backend non si avvia

```bash
docker compose logs backend
```

Cause comuni: database non ancora pronto (attendere e riprovare), variabili `.env` mancanti.

### Il database non accetta connessioni

```bash
docker compose exec db psql -U stockuser -d stocksimple -c "SELECT 1;"
```

### Reset completo (sviluppo)

```bash
docker compose down -v
docker compose up -d --build
```

Elimina tutti i dati e riparte con i dati seed.

### Lo scanner barcode non funziona

- Verificare che l'app sia servita su HTTPS (requisito browser per la fotocamera).
- Controllare che il browser abbia i permessi per la fotocamera.
- Usare Chrome o Firefox aggiornati.

### Upload foto non funziona

- Verificare che la directory `uploads/` esista e sia scrivibile.
- Verificare che il file non superi il limite (5 MB per prodotti, 2 MB per loghi).

### Notifiche push non arrivano

- Verificare che l'utente abbia attivato le notifiche tramite il pulsante nella barra laterale.
- Verificare i permessi del browser per il dominio dell'app.
- Per Edge: controllare il Tracking Prevention (`edge://settings/privacy`).
- Verificare che il backend abbia le chiavi VAPID generate (`app_settings` nel database deve contenere `vapid_public_key` e `vapid_private_key`).

### Errore 500 su invia rapporto o notifiche

Il database potrebbe non avere le tabelle necessarie se è stato ricreato da uno schema obsoleto. Applicare le migrazioni mancanti:

```bash
cat db/migrate_v6_push.sql | docker compose exec -T db psql -U stockuser stocksimple
cat db/migrate_v7_daily_reports.sql | docker compose exec -T db psql -U stockuser stocksimple
```

### Inviti email non vengono inviati

- Verificare che la configurazione SMTP sia presente e corretta nella sezione **Impostazioni → SMTP**.
- Verificare i log del backend per errori di connessione SMTP.
- Verificare che `FRONTEND_URL` sia impostato correttamente nel file `.env` (usato per generare i link degli inviti).

---

*Versione 2.0 — aggiornato agosto 2026*
