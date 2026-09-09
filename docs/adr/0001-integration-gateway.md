# ADR 0001 — Integration Gateway con Outbox/Inbox transazionali

## Stato

Accettato — 2026-09-02.

## Contesto

VanStock deve integrare prodotti, posizioni, scorte, lotti e movimenti con ERP cloud e on-premise. Le API operative esistenti sono pensate per utenti autenticati e non costituiscono un contratto di integrazione: alcune scritture aggiornano proiezioni di stock diverse e gli effetti esterni non sono persistiti insieme alla transazione di magazzino.

## Decisione

Viene introdotto un Integration Gateway separato dalle API UI:

- `/api/integrations/*` per la configurazione amministrativa;
- `/api/integrations/v1/*` per client macchina autenticati;
- webhook inbound dedicati;
- un modello canonico versionato, indipendente dalle tabelle PostgreSQL;
- un inbox idempotente per i comandi ricevuti;
- un transactional outbox PostgreSQL inserito nella stessa transazione del dominio;
- worker separati per polling, webhook outbound e retry.

La consegna è `at-least-once`. Ogni comando e ogni evento hanno un identificatore stabile, quindi consumer e handler devono essere idempotenti.

Il modello Outbox/Inbox è la garanzia di affidabilità. Redis/BullMQ non viene introdotto nella prima versione: potrà essere aggiunto come meccanismo di dispatch, senza sostituire la persistenza PostgreSQL.

## Conseguenze

- Le route esistenti `/api/products` e `/api/movements` non saranno esposte come API ERP.
- Le scritture inventariali devono passare da un unico servizio di dominio prima dell'attivazione di comandi ERP.
- Il worker non può eseguire chiamate HTTP mentre mantiene una transazione PostgreSQL aperta.
- Retry, dead letter e replay sono parte del prodotto e devono essere auditabili.
- La prima integrazione utilizza API key scoped per server-to-server; OAuth client credentials resta un'estensione guidata dai requisiti dei partner.
