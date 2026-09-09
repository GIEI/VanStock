# StockSimple — Guida all'integrazione via API REST

> Versione 2.0 — aggiornato agosto 2026

> Questa guida descrive le API operative usate da web e mobile con JWT utente.
> Il contratto machine-to-machine ERP è separato in
> [Integration API v1](integrations/openapi-v1.yaml). In questa release sono
> attive le risorse in lettura e l'inbox dei comandi inbound. Il worker può essere
> eseguito con `npm run integration:process-inbox` dalla cartella `backend` e
> processa ricevimenti, scarichi, trasferimenti e rettifiche. Gli upsert di
> anagrafica e ubicazioni restano `needs_mapping` finché non viene definita una
> policy ERP→VanStock.

## Mapping ERP

Prima di inviare un comando di inventario, configura i mapping espliciti con
`POST /api/integrations/mappings` (admin), indicando `integration_key_id`,
`entity_type` (`product` o `location`), `external_id` ERP e `internal_id`
VanStock. Nei payload inbound,
`productId`, `locationId`, `fromLocationId` e `toLocationId` sono gli
identificativi ERP mappati, non gli ID PostgreSQL. Un mapping mancante mette il
comando in `needs_mapping` senza modificare la giacenza.

## Webhook outbound

Un amministratore può configurare un endpoint in `POST /api/integrations/webhooks`.
La risposta espone il segreto una sola volta; ogni richiesta riceve il payload
canonico JSON e gli header `X-VanStock-Event-Id` e `X-VanStock-Signature`
(`sha256=<HMAC>`). Per elaborare le consegne pendenti eseguire:

```bash
cd backend
npm run integration:dispatch-webhooks
```

Il dispatcher applica retry esponenziale fino a dieci tentativi, poi conserva la
consegna in `dead_letter` per analisi. La variabile server
`INTEGRATION_WEBHOOK_SECRET_KEY` è obbligatoria solo quando si creano o inviano webhook.

## Eventi Presenze e mapping Odoo

Le Presenze sono esposte dal gateway come eventi outbound. Non sono disponibili
comandi Presenze inbound: Odoo deve consumare `GET /api/integrations/v1/events`
oppure un webhook e salvare il cursor soltanto dopo avere completato la propria
transazione locale.

I tipi emessi sono:

| Tipo | Quando viene emesso |
|------|---------------------|
| `attendance.event.created` | Timbratura da app/web, inserimento amministrativo o approvazione di una richiesta di modifica |
| `attendance.event.superseded` | Correzione amministrativa che sostituisce un evento precedente |
| `attendance.event.invalidated` | Cancellazione logica amministrativa di un evento |

Tutti usano l'envelope canonico versione `1.0`:

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "schemaVersion": "1.0",
  "type": "attendance.event.created",
  "occurredAt": "2026-09-05T06:30:00.000Z",
  "origin": "vanstock",
  "correlationId": "attendance-request-123",
  "data": {
    "attendanceEventId": "42",
    "userId": "7",
    "action": "CHECK_IN",
    "occurredAt": "2026-09-05T06:30:00.000Z",
    "previousState": "OUT",
    "resultingState": "IN",
    "requestId": "attendance-request-123",
    "source": "mobile",
    "status": "valid",
    "anomalyType": null,
    "supersededEventId": null,
    "overrideRequestId": null
  }
}
```

`action` assume uno dei valori `CHECK_IN`, `CHECK_OUT`, `BREAK_START` o
`BREAK_END`; gli identificativi applicativi sono serializzati come stringhe nel
modello canonico. `correlationId` coincide di
norma con `requestId`, così una catena di correzioni può essere tracciata tra i
due sistemi.

### Proiezione consigliata su `hr.attendance`

Il connettore Odoo deve mantenere un mapping tenant-specifico tra `data.userId`
e `hr.employee.id`. Questo mapping non è gestito dagli attuali mapping
`product`/`location` del gateway e resta quindi responsabilità del connettore.

| Azione VanStock | Operazione Odoo |
|-----------------|-----------------|
| `CHECK_IN` | Crea un record `hr.attendance` con `employee_id` mappato e `check_in = data.occurredAt` |
| `BREAK_START` | Chiude il record aperto impostando `check_out = data.occurredAt` |
| `BREAK_END` | Crea un nuovo record `hr.attendance` con `check_in = data.occurredAt` |
| `CHECK_OUT` | Chiude il record aperto impostando `check_out = data.occurredAt` |

Poiché `hr.attendance` rappresenta intervalli e VanStock conserva un event log,
il connettore deve proiettare una pausa come due intervalli distinti. Per
`attendance.event.superseded` e `attendance.event.invalidated` deve ricalcolare
in ordine cronologico gli intervalli dell'utente nella giornata interessata,
escludendo gli eventi non più validi, invece di applicare una modifica puntuale
alla cieca.

La consegna è `at-least-once`: il consumer deve deduplicare per `eventId` e
conservare anche il legame tra `attendanceEventId` e i record `hr.attendance`
generati. Un evento `created` con `status` diverso da `valid`, con `anomalyType`
valorizzato o senza mapping utente deve essere sospeso per riconciliazione e non
deve produrre intervalli definitivi in Odoo. Gli eventi `superseded` e
`invalidated` devono invece essere sempre acquisiti per rimuovere o ricalcolare
la proiezione già esistente.

## Indice

1. [Introduzione](#1-introduzione)
2. [URL base e formato](#2-url-base-e-formato)
3. [Autenticazione](#3-autenticazione)
4. [Codici di risposta HTTP](#4-codici-di-risposta-http)
5. [Endpoint: Auth](#5-endpoint-auth)
6. [Endpoint: Prodotti](#6-endpoint-prodotti)
7. [Endpoint: Movimenti](#7-endpoint-movimenti)
8. [Endpoint: Posizioni](#8-endpoint-posizioni)
9. [Endpoint: Dashboard](#9-endpoint-dashboard)
10. [Endpoint: Clienti](#10-endpoint-clienti)
11. [Endpoint: Lavori](#11-endpoint-lavori)
12. [Endpoint: Fornitori](#12-endpoint-fornitori)
13. [Endpoint: Ordini di acquisto](#13-endpoint-ordini-di-acquisto)
14. [Endpoint: Report giornaliero](#14-endpoint-report-giornaliero)
15. [Endpoint: Push](#15-endpoint-push)
16. [Endpoint: Notifiche in-app](#16-endpoint-notifiche-in-app)
17. [Endpoint: Prenotazioni veicoli](#17-endpoint-prenotazioni-veicoli)
18. [Endpoint: Analytics e Margini](#18-endpoint-analytics-e-margini)
19. [Endpoint: Utenti](#19-endpoint-utenti)
20. [Endpoint: Aziende e Abbonamenti](#20-endpoint-aziende-e-abbonamenti)
21. [Endpoint: Presenze (Attendance v2)](#21-endpoint-presenze-attendance-v2)
22. [Endpoint: Assenze](#22-endpoint-assenze)
23. [Endpoint: Audit (Inventario fisico)](#23-endpoint-audit-inventario-fisico)
24. [Endpoint: Backup e Import/Export](#24-endpoint-backup-e-importexport)
25. [Endpoint: SMTP e Inviti](#25-endpoint-smtp-e-inviti)
26. [Parametri di query comuni](#26-parametri-di-query-comuni)
27. [Esempi pratici](#27-esempi-pratici)
28. [Limitazioni e note](#28-limitazioni-e-note)

---

## 1. Introduzione

StockSimple espone una REST API JSON che permette a sistemi esterni (ERP, app gestionali, script di automazione, ecc.) di:

- Leggere e scrivere il catalogo prodotti
- Registrare movimenti di magazzino (carico, scarico, trasferimento)
- Gestire lavori, clienti, fornitori e ordini di acquisto
- Interrogare lo stock per posizione
- Gestire utenti, presenze e notifiche
- Eseguire backup e import/export di dati

Tutte le API richiedono autenticazione tramite **JWT Bearer token**, ad eccezione degli endpoint di login e reset password.

---

## 2. URL base e formato

```
Base URL: http://<host>/api
```

In un'installazione Docker standard: `http://localhost/api`

| Header richiesta | Valore               |
|------------------|----------------------|
| `Content-Type`   | `application/json`   |
| `Authorization`  | `Bearer <token>`     |

Tutte le risposte sono in formato **JSON**.

---

## 3. Autenticazione

### Ottenere il token

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@stocksimple.local",
  "password": "Admin1234!"
}
```

**Risposta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@stocksimple.local",
    "name": "Administrator",
    "role": "admin",
    "company_id": 1,
    "company_name": "Demo Company"
  }
}
```

Il token ha scadenza configurabile (default: 7 giorni). Includere il token in tutte le richieste successive:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 4. Codici di risposta HTTP

| Codice | Significato                                               |
|--------|-----------------------------------------------------------|
| 200    | Successo                                                  |
| 201    | Risorsa creata                                            |
| 400    | Dati non validi o mancanti                                |
| 401    | Non autenticato (token mancante o scaduto)                |
| 403    | Non autorizzato (ruolo insufficiente)                     |
| 404    | Risorsa non trovata                                       |
| 409    | Conflitto (es. SKU duplicato, doppia prenotazione)        |
| 422    | Quantità insufficiente in magazzino                       |
| 500    | Errore interno del server                                 |

Risposta di errore standard:
```json
{ "error": "Messaggio descrittivo dell'errore" }
```

---

## 5. Endpoint: Auth

| Metodo | Endpoint                       | Auth | Descrizione                   |
|--------|--------------------------------|------|-------------------------------|
| POST   | /api/auth/login                | No   | Login, ritorna JWT            |
| GET    | /api/auth/me                   | Sì   | Utente autenticato corrente   |
| POST   | /api/auth/forgot-password      | No   | Richiedi link reset password  |
| POST   | /api/auth/reset-password       | No   | Imposta nuova password        |
| POST   | /api/auth/change-password      | Sì   | Cambia password (autenticato) |

---

## 6. Endpoint: Prodotti

| Metodo | Endpoint                        | Ruolo   | Descrizione                      |
|--------|---------------------------------|---------|----------------------------------|
| GET    | /api/products                   | user+   | Lista prodotti (con filtri)       |
| GET    | /api/products/:id               | user+   | Dettaglio prodotto + movimenti    |
| GET    | /api/products/barcode/:barcode  | user+   | Ricerca per barcode               |
| GET    | /api/products/categories        | user+   | Lista categorie                   |
| GET    | /api/products/export            | admin+  | Esporta CSV                       |
| POST   | /api/products                   | admin+  | Crea prodotto                     |
| POST   | /api/products/import            | admin+  | Importa CSV/Excel (upsert per SKU)|
| PUT    | /api/products/:id               | admin+  | Aggiorna prodotto                 |
| DELETE | /api/products/:id               | admin+  | Elimina prodotto                  |
| POST   | /api/products/:id/photo         | admin+  | Carica foto prodotto              |
| POST   | /api/products/:id/restock       | user+   | Richiedi rifornimento (email)     |

### Parametri GET /api/products

| Parametro   | Tipo    | Descrizione                         |
|-------------|---------|-------------------------------------|
| `q`         | string  | Ricerca su nome, SKU, barcode        |
| `category`  | string  | Filtro categoria                     |
| `location_id` | number | Filtro posizione                   |
| `low_stock` | boolean | Solo prodotti sotto scorta           |
| `page`      | number  | Paginazione (default: 1)             |
| `limit`     | number  | Risultati per pagina (default: 50, max: 100) |

---

## 7. Endpoint: Movimenti

| Metodo | Endpoint           | Ruolo  | Descrizione                       |
|--------|--------------------|--------|-----------------------------------|
| GET    | /api/movements     | user+  | Lista movimenti (con filtri)      |
| POST   | /api/movements     | user+  | Registra movimento                |
| DELETE | /api/movements/:id | admin+ | Elimina movimento                 |

### Body POST /api/movements

```json
{
  "product_id": 1,
  "type": "scarico",
  "quantity": 5,
  "from_location_id": 2,
  "to_location_id": null,
  "job_id": 10,
  "purchase_price": null,
  "notes": "Usato per lavoro cantiere X",
  "batch_number": "LOT-2024-01",
  "expiry_date": "2025-12-31"
}
```

> I campi `batch_number` e `expiry_date` sono rilevanti solo per prodotti con `tracks_batches = true`.

---

## 8. Endpoint: Posizioni

| Metodo | Endpoint           | Ruolo  | Descrizione              |
|--------|--------------------|--------|--------------------------|
| GET    | /api/locations     | user+  | Lista posizioni           |
| POST   | /api/locations     | admin+ | Crea posizione            |
| PUT    | /api/locations/:id | admin+ | Aggiorna posizione        |
| DELETE | /api/locations/:id | admin+ | Elimina posizione         |

---

## 9. Endpoint: Dashboard

| Metodo | Endpoint                           | Ruolo  | Descrizione                        |
|--------|------------------------------------|--------|------------------------------------|
| GET    | /api/dashboard/stats               | user+  | Statistiche generali               |
| GET    | /api/dashboard/alerts              | user+  | Prodotti sotto scorta              |
| GET    | /api/dashboard/recent-movements    | user+  | Ultimi movimenti                   |

---

## 10. Endpoint: Clienti

| Metodo | Endpoint          | Ruolo  | Descrizione                     |
|--------|-------------------|--------|---------------------------------|
| GET    | /api/clients      | admin+ | Lista clienti (filtro `?q=`)    |
| GET    | /api/clients/:id  | admin+ | Dettaglio cliente               |
| POST   | /api/clients      | admin+ | Crea cliente                    |
| PUT    | /api/clients/:id  | admin+ | Aggiorna cliente                |
| DELETE | /api/clients/:id  | admin+ | Elimina cliente                 |

---

## 11. Endpoint: Lavori

| Metodo | Endpoint                          | Ruolo   | Descrizione                            |
|--------|-----------------------------------|---------|----------------------------------------|
| GET    | /api/jobs                         | user+   | Lista lavori (con filtri)              |
| GET    | /api/jobs/:id                     | user+   | Dettaglio + movimenti collegati        |
| POST   | /api/jobs                         | admin+  | Crea lavoro                            |
| PUT    | /api/jobs/:id                     | admin+  | Aggiorna lavoro                        |
| DELETE | /api/jobs/:id                     | admin+  | Elimina lavoro                         |
| POST   | /api/jobs/:id/accept              | user+   | Accetta lavoro (→ in_corso)            |
| POST   | /api/jobs/:id/arrive              | user+   | Registra arrivo (started_at + GPS)     |
| POST   | /api/jobs/:id/complete            | user+   | Segna completato (completed_at + GPS)  |
| POST   | /api/jobs/:id/cancel              | admin+  | Annulla lavoro                         |
| POST   | /api/jobs/:id/signature           | user+   | Salva firma cliente                    |
| GET    | /api/jobs/:id/photos              | user+   | Lista foto del lavoro                  |
| POST   | /api/jobs/:id/photos              | user+   | Carica foto (problem/repair)           |
| DELETE | /api/jobs/:id/photos/:photoId     | user+   | Elimina foto                           |
| GET    | /api/jobs/:id/messages            | user+   | Lista messaggi chat del lavoro         |
| POST   | /api/jobs/:id/messages            | user+   | Invia messaggio (testo o audio)        |
| GET    | /api/jobs/:id/state-changes       | user+   | Storico cambi di stato con GPS         |
| POST   | /api/jobs/:id/missing-products    | user+   | Segnala materiale mancante             |
| GET    | /api/jobs/:id/missing-products    | user+   | Lista materiali mancanti               |

### Filtri GET /api/jobs

| Parametro     | Tipo   | Descrizione                    |
|---------------|--------|--------------------------------|
| `status`      | string | Filtra per stato               |
| `assigned_to` | number | Filtra per operatore assegnato |
| `client_id`   | number | Filtra per cliente             |
| `date_from`   | date   | Data inizio intervallo         |
| `date_to`     | date   | Data fine intervallo           |
| `priority`    | string | Filtra per priorità            |

---

## 12. Endpoint: Fornitori

| Metodo | Endpoint                            | Ruolo  | Descrizione                     |
|--------|-------------------------------------|--------|---------------------------------|
| GET    | /api/suppliers                      | admin+ | Lista fornitori                 |
| GET    | /api/suppliers/:id                  | admin+ | Dettaglio fornitore             |
| POST   | /api/suppliers                      | admin+ | Crea fornitore                  |
| PUT    | /api/suppliers/:id                  | admin+ | Aggiorna fornitore              |
| DELETE | /api/suppliers/:id                  | admin+ | Elimina fornitore               |
| GET    | /api/suppliers/:id/products         | admin+ | Prodotti del fornitore          |
| PUT    | /api/suppliers/:id/products/:pid    | admin+ | Associa prodotto a fornitore    |
| DELETE | /api/suppliers/:id/products/:pid    | admin+ | Rimuovi associazione            |

---

## 13. Endpoint: Ordini di acquisto

| Metodo | Endpoint                               | Ruolo  | Descrizione                    |
|--------|----------------------------------------|--------|--------------------------------|
| GET    | /api/purchase-orders                   | admin+ | Lista ordini                   |
| GET    | /api/purchase-orders/:id               | admin+ | Dettaglio ordine + righe       |
| POST   | /api/purchase-orders                   | admin+ | Crea ordine                    |
| PUT    | /api/purchase-orders/:id               | admin+ | Aggiorna ordine                |
| DELETE | /api/purchase-orders/:id               | admin+ | Elimina ordine                 |
| POST   | /api/purchase-orders/:id/receive       | admin+ | Segna come ricevuto            |

---

## 14. Endpoint: Report giornaliero

| Metodo | Endpoint           | Ruolo  | Descrizione                            |
|--------|--------------------|--------|----------------------------------------|
| GET    | /api/reports       | user+  | Lista report (admin: tutti; user: solo propri) |
| GET    | /api/reports/:date | user+  | Report per data (`YYYY-MM-DD`)         |
| POST   | /api/reports       | user+  | Invia/aggiorna report giornaliero      |
| DELETE | /api/reports/:id   | admin+ | Elimina report                         |

---

## 15. Endpoint: Push

| Metodo | Endpoint                  | Ruolo  | Descrizione                         |
|--------|---------------------------|--------|-------------------------------------|
| GET    | /api/push/vapid-key       | user+  | VAPID public key                    |
| POST   | /api/push/subscribe       | user+  | Registra subscription Web Push      |
| DELETE | /api/push/unsubscribe     | user+  | Cancella subscription               |

---

## 16. Endpoint: Notifiche in-app

| Metodo | Endpoint                          | Ruolo  | Descrizione                           |
|--------|-----------------------------------|--------|---------------------------------------|
| GET    | /api/notifications                | user+  | Lista notifiche (con filtro `unread`) |
| PATCH  | /api/notifications/:id/read       | user+  | Segna notifica come letta             |
| PATCH  | /api/notifications/read-all       | user+  | Segna tutte come lette                |

---

## 17. Endpoint: Prenotazioni veicoli

| Metodo | Endpoint                      | Ruolo  | Descrizione                     |
|--------|-------------------------------|--------|---------------------------------|
| GET    | /api/vehicle-bookings         | admin+ | Lista prenotazioni              |
| POST   | /api/vehicle-bookings         | admin+ | Crea prenotazione               |
| DELETE | /api/vehicle-bookings/:id     | admin+ | Elimina prenotazione            |

### Body POST /api/vehicle-bookings

```json
{
  "location_id": 3,
  "job_id": 10,
  "date": "2026-08-15",
  "period": "all_day",
  "notes": "Furgone per cantiere X"
}
```

Valori `period` ammessi: `all_day`, `morning`, `afternoon`.

---

## 18. Endpoint: Analytics e Margini

| Metodo | Endpoint                  | Ruolo  | Descrizione                              |
|--------|---------------------------|--------|------------------------------------------|
| GET    | /api/analytics/van-report | admin+ | Report movimenti furgone per data        |
| GET    | /api/margins              | admin+ | Margini per prodotto                     |

### Parametri GET /api/analytics/van-report

| Parametro     | Tipo   | Descrizione                     |
|---------------|--------|---------------------------------|
| `location_id` | number | ID del furgone (obbligatorio)   |
| `date`        | date   | Data (`YYYY-MM-DD`, obbligatoria) |
| `user_id`     | number | Filtra per operatore (solo admin) |

---

## 19. Endpoint: Utenti

| Metodo | Endpoint                      | Ruolo      | Descrizione                       |
|--------|-------------------------------|------------|-----------------------------------|
| GET    | /api/users                    | admin+     | Lista utenti                      |
| POST   | /api/users                    | admin+     | Crea utente                       |
| PUT    | /api/users/:id                | admin+     | Aggiorna utente                   |
| DELETE | /api/users/:id                | admin+     | Elimina utente                    |
| POST   | /api/users/:id/reset-password | admin+     | Genera link reset (admin)         |

---

## 20. Endpoint: Aziende e Abbonamenti

### Aziende

| Metodo | Endpoint                | Ruolo      | Descrizione                            |
|--------|-------------------------|------------|----------------------------------------|
| GET    | /api/companies          | superadmin | Lista aziende                          |
| POST   | /api/companies          | superadmin | Crea azienda                           |
| PUT    | /api/companies/:id      | superadmin | Aggiorna azienda                       |
| DELETE | /api/companies/:id      | superadmin | Elimina azienda (cascata)              |
| POST   | /api/companies/:id/logo | superadmin | Carica logo aziendale                  |

### Abbonamenti

| Metodo | Endpoint                        | Ruolo      | Descrizione                          |
|--------|---------------------------------|------------|--------------------------------------|
| GET    | /api/subscriptions/:company_id  | superadmin | Dettaglio abbonamento azienda        |
| PUT    | /api/subscriptions/:company_id  | superadmin | Aggiorna piano, seat, stato, scadenza |

---

## 21. Endpoint: Presenze (Attendance v2)

### Timbrature

| Metodo | Endpoint                            | Ruolo  | Descrizione                                 |
|--------|-------------------------------------|--------|---------------------------------------------|
| POST   | /api/attendance/event               | user+  | Registra evento timbratura (check-in/out)   |
| GET    | /api/attendance/today               | user+  | Stato attuale dell'utente (OUT/IN/BREAK)    |
| GET    | /api/attendance/history             | user+  | Storico eventi (propri)                     |

### Richieste correzione

| Metodo | Endpoint                                  | Ruolo  | Descrizione                            |
|--------|-------------------------------------------|--------|----------------------------------------|
| POST   | /api/attendance/override-requests         | user+  | Invia richiesta correzione timbratura  |
| GET    | /api/attendance/override-requests         | user+  | Lista proprie richieste                |

### Admin presenze

| Metodo | Endpoint                                           | Ruolo  | Descrizione                                 |
|--------|----------------------------------------------------|--------|---------------------------------------------|
| GET    | /api/admin/attendance                              | admin+ | Presenze di tutto il team per data          |
| GET    | /api/admin/attendance/override-requests            | admin+ | Richieste di correzione in attesa           |
| POST   | /api/admin/attendance/override-requests/:id/approve | admin+ | Approva richiesta di correzione            |
| POST   | /api/admin/attendance/override-requests/:id/reject  | admin+ | Rifiuta richiesta di correzione            |

### Body POST /api/attendance/event

```json
{
  "request_id": "uuid-univoco",
  "occurred_at": "2026-08-11T09:00:00+02:00",
  "action": "CHECK_IN",
  "gps_lat": 45.4654,
  "gps_lng": 9.1866,
  "device_id": "device-123",
  "source": "mobile"
}
```

> `request_id` deve essere un UUID univoco per garantire l'idempotenza: inviare due volte la stessa richiesta con lo stesso `request_id` non crea duplicati.

---

## 22. Endpoint: Assenze

| Metodo | Endpoint                          | Ruolo  | Descrizione                          |
|--------|-----------------------------------|--------|--------------------------------------|
| GET    | /api/absences                     | user+  | Lista proprie assenze                |
| POST   | /api/absences                     | user+  | Richiedi assenza                     |
| GET    | /api/absences/admin               | admin+ | Tutte le assenze del team            |
| PATCH  | /api/absences/:id/approve         | admin+ | Approva assenza                      |
| PATCH  | /api/absences/:id/reject          | admin+ | Rifiuta assenza                      |

---

## 23. Endpoint: Audit (Inventario fisico)

| Metodo | Endpoint                        | Ruolo  | Descrizione                              |
|--------|---------------------------------|--------|------------------------------------------|
| GET    | /api/audit                      | admin+ | Lista sessioni di inventario             |
| POST   | /api/audit                      | admin+ | Avvia nuova sessione di conteggio        |
| GET    | /api/audit/:id                  | admin+ | Dettaglio sessione + discrepanze         |
| POST   | /api/audit/:id/count            | admin+ | Inserisce conteggio per prodotto         |
| POST   | /api/audit/:id/apply            | admin+ | Applica rettifiche automatiche           |

---

## 24. Endpoint: Backup e Import/Export

### Import/Export

| Metodo | Endpoint                    | Ruolo  | Descrizione                                      |
|--------|-----------------------------|--------|--------------------------------------------------|
| GET    | /api/import-export/export   | admin+ | Esporta tutti i dati aziendali (.zip)            |
| POST   | /api/import-export/import   | admin+ | Importa dati da .zip precedentemente esportato   |

### Backup automatici

| Metodo | Endpoint                     | Ruolo      | Descrizione                              |
|--------|------------------------------|------------|------------------------------------------|
| GET    | /api/backups                 | admin+     | Lista backup disponibili                 |
| POST   | /api/backups/:id/restore     | superadmin | Ripristina un backup specifico           |

---

## 25. Endpoint: SMTP e Inviti

### Impostazioni SMTP

| Metodo | Endpoint              | Ruolo  | Descrizione                              |
|--------|-----------------------|--------|------------------------------------------|
| GET    | /api/smtp-settings    | admin+ | Legge configurazione SMTP aziendale      |
| PUT    | /api/smtp-settings    | admin+ | Salva/aggiorna configurazione SMTP       |
| POST   | /api/smtp-settings/test | admin+ | Invia email di test per verificare SMTP |

### Inviti

| Metodo | Endpoint               | Ruolo  | Descrizione                            |
|--------|------------------------|--------|----------------------------------------|
| POST   | /api/invites           | admin+ | Invia invito via email a nuovo utente  |
| GET    | /api/invites           | admin+ | Lista inviti inviati                   |
| DELETE | /api/invites/:id       | admin+ | Cancella invito in sospeso             |
| POST   | /api/invites/accept    | No     | Accetta invito e imposta password      |

---

## 26. Parametri di query comuni

| Parametro   | Tipo    | Applicabile a             | Descrizione                  |
|-------------|---------|---------------------------|------------------------------|
| `page`      | number  | Liste paginate             | Pagina corrente (default: 1) |
| `limit`     | number  | Liste paginate             | Elementi per pagina (max 100)|
| `q`         | string  | Prodotti, Clienti, ecc.   | Ricerca testuale full-text   |
| `date_from` | date    | Movimenti, Lavori, Report  | Data inizio (`YYYY-MM-DD`)   |
| `date_to`   | date    | Movimenti, Lavori, Report  | Data fine (`YYYY-MM-DD`)     |
| `user_id`   | number  | Movimenti, Report          | Filtra per utente (solo admin)|

---

## 27. Esempi pratici

### Registrare uno scarico su un lavoro

```bash
curl -X POST http://localhost/api/movements \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 42,
    "type": "scarico",
    "quantity": 3,
    "from_location_id": 5,
    "job_id": 17,
    "notes": "Installazione presa elettrica"
  }'
```

### Ottenere i prodotti sotto scorta

```bash
curl "http://localhost/api/products?low_stock=true" \
  -H "Authorization: Bearer <token>"
```

### Creare un lavoro

```bash
curl -X POST http://localhost/api/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Impianto elettrico villa Rossi",
    "client_id": 3,
    "assigned_to": 7,
    "scheduled_date": "2026-08-15",
    "scheduled_time": "morning",
    "priority": "alta",
    "address": "Via Roma 1, Milano"
  }'
```

### Registrare un check-in con GPS

```bash
curl -X POST http://localhost/api/attendance/event \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "occurred_at": "2026-08-11T08:30:00+02:00",
    "action": "CHECK_IN",
    "gps_lat": 45.4654,
    "gps_lng": 9.1866,
    "source": "mobile"
  }'
```

### Caricare una foto di un lavoro

```bash
curl -X POST http://localhost/api/jobs/17/photos \
  -H "Authorization: Bearer <token>" \
  -F "photo=@/path/to/foto.jpg" \
  -F "type=problem" \
  -F "latitude=45.4654" \
  -F "longitude=9.1866"
```

### Ricerca prodotto per barcode

```bash
curl "http://localhost/api/products/barcode/8001796003108" \
  -H "Authorization: Bearer <token>"
```

---

## 28. Limitazioni e note

| Limite                        | Valore / Dettaglio                                            |
|-------------------------------|---------------------------------------------------------------|
| Paginazione prodotti          | Max 100 per pagina (`limit`)                                  |
| Upload foto prodotti          | Max 5 MB per file                                             |
| Upload logo aziendale         | Max 2 MB per file                                             |
| Formati upload                | Immagini (JPEG, PNG, WebP), video (MP4) per le foto lavori    |
| Token JWT                     | Scadenza 7 giorni (configurabile, nessun refresh token)       |
| Movimenti                     | Non reversibili automaticamente: eliminarli non inverte stock |
| Idempotenza timbrature        | Usare `request_id` univoco per ogni evento di timbratura      |
| Multitenancy                  | Ogni API filtra automaticamente per `company_id` dell'utente  |
| Rate limiting                 | Non implementato: proteggere il backend con Nginx o firewall  |
| CORS                          | Configurato per le origini definite nel backend               |

---

*Versione 2.0 — aggiornato agosto 2026*
