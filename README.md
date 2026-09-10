# VanStock

VanStock è una piattaforma open source per la gestione degli interventi in campo e dei prodotti, scorte e materiali operativi di aziende con magazzini, furgoni e cantieri.

Comprende una web app per l'amministrazione e un'app Flutter per gli operatori sul campo.

## Licenza e contributi

VanStock è distribuito con licenza [AGPL-3.0-or-later](LICENSE). Prima di utilizzare o contribuire al progetto, consulta [NOTICE](NOTICE), [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) e [SUPPORT.md](SUPPORT.md).

## Funzionalità principali

- catalogo prodotti con SKU, barcode, categorie, immagini, lotti e scadenze;
- giacenze per magazzino, furgone o cantiere e movimenti di carico, scarico e trasferimento;
- avvisi di sotto-scorta e di scadenza, inventario fisico e riconciliazione;
- pianificazione di lavori, materiali richiesti, clienti, foto, firma e rapportini;
- gestione di fornitori, ordini di acquisto e carico furgone;
- presenze, assenze, pianificazione e prenotazioni dei veicoli;
- report, esportazione/importazione dati, backup e notifiche;
- multi-tenancy con ruoli e autorizzazioni;
- API REST e Integration Gateway per l'integrazione con ERP esterni.

Per le funzionalità rivolte agli utenti, consulta il [manuale utente](docs/manuale-utente.md) e il [manuale amministratore](docs/manuale-admin.md).

## Architettura

| Area                  | Tecnologia                          |
|-----------------------|-------------------------------------|
| Web app               | Angular 17, Angular Material e PWA  |
| App mobile            | Flutter, Material 3, Riverpod e Dio |
| API                   | Node.js e Express                   |
| Database              | PostgreSQL 16                       |
| Notifiche mobile      | Firebase Cloud Messaging            |
| Reverse proxy         | Nginx                               |
| Distribuzione locale  | Docker Engine e Docker Compose      |

L'app Flutter è presente in [`MOBILE/`](MOBILE) e supporta Android, iOS, web, Windows, macOS e Linux. Kotlin è usato soltanto dai file nativi Android generati da Flutter, non è lo stack dell'app mobile.

## Avvio rapido con Docker

### Prerequisiti

- Docker Engine con Docker Compose v2;
- OpenSSL, usato dallo script per generare segreti casuali.

Da una nuova clone del repository:

```bash
./scripts/setup.sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Lo script crea un file `.env` locale senza sovrascriverne uno esistente e chiede i dati della prima azienda e del primo amministratore. Genera automaticamente le password e le chiavi lasciate vuote, poi mostra una sola volta la password dell'amministratore: conservala in un password manager.

Al termine, apri <http://localhost>. L'health check dell'API è disponibile su <http://localhost:3000/api/health>.

Per consultare i log del backend:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f backend
```

Per configurazioni Compose esterne al checkout o per un server esistente, segui la guida [Configurazione esterna per Docker Compose](docs/external-compose-config.md). Per l'installazione iniziale completa, consulta [Primo avvio](docs/first-setup.md).

## Sviluppo

### Web app e API

```bash
# API
cd backend
npm ci
npm run dev

# In un secondo terminale, web app
cd frontend
npm ci
npm start
```

Il backend legge prima `backend/.env`, poi `.env` nella radice del progetto. Per lo sviluppo locale senza Docker, configura PostgreSQL e le variabili necessarie prima di avviarlo. Il file [`.env.example`](.env.example) contiene soltanto valori di esempio: non usarli in produzione.

### App Flutter

```bash
cd MOBILE
flutter pub get
flutter run --dart-define=BACKEND_BASE_URL=http://10.0.2.2:3000/api
```

L'URL predefinito è adatto all'emulatore Android. Per un dispositivo fisico o un ambiente diverso, imposta `BACKEND_BASE_URL` con l'URL raggiungibile dell'API, ad esempio `https://app.example.com/api`.

## Verifiche

```bash
# Test backend
cd backend
npm test

# Analisi e test Flutter
cd MOBILE
flutter analyze
flutter test

# Controllo che il repository pubblico non contenga file riservati o generati
./scripts/verify-public-tree.sh
```

## API e integrazioni

La web app e l'app mobile usano API REST JSON protette da JWT. La documentazione operativa è in [docs/api-integration.md](docs/api-integration.md).

Per integrazioni machine-to-machine con ERP, il contratto stabile è [Integration API v1](docs/integrations/openapi-v1.yaml). L'architettura e la procedura di onboarding sono documentate rispettivamente in [docs/adr/0001-integration-gateway.md](docs/adr/0001-integration-gateway.md) e [docs/onboarding-primo-cliente-erp.md](docs/onboarding-primo-cliente-erp.md).

## Struttura del repository

```text
.
├── backend/       API Node.js/Express, servizi e test
├── frontend/      web app Angular
├── MOBILE/        app Flutter multipiattaforma
├── db/            schema PostgreSQL e migrazioni
├── docs/          guide operative, architettura e contratti API
├── scripts/       setup e controlli del repository
├── config/        esempi di configurazione Nginx
├── SITOWEB/       sito informativo PHP
└── docker-compose.yml
```

## Sicurezza e dati

Non versionare file `.env`, credenziali Firebase, certificati, backup o upload reali. I valori di configurazione distribuiti nel repository sono esempi sicuri da sostituire per ogni installazione. Per segnalazioni di sicurezza, segui la [security policy](SECURITY.md).

## Supporto

Le modalità di supporto e contribuzione sono descritte in [SUPPORT.md](SUPPORT.md) e [CONTRIBUTING.md](CONTRIBUTING.md).
