# Onboarding del primo cliente ERP

Questa guida è la checklist operativa per attivare una sincronizzazione tra
l'ERP di un cliente e VanStock. Va usata prima di configurare chiavi, mapping o
processi automatici in produzione.

## Stato attuale della piattaforma

Sono pronti:

- API machine-to-machine `Integration API v1` protetta da `X-Integration-Key`;
- lettura di catalogo, ubicazioni, saldi ed eventi;
- ricezione idempotente di movimenti ERP in inbox;
- elaborazione di ricevimenti, scarichi, trasferimenti e rettifiche;
- mapping esplicito ERP → VanStock per prodotto e ubicazione, associato alla
  singola Integration API key;
- outbox transazionale e webhook outbound firmati, con retry.

Non sono ancora supportati in automatico gli upsert inbound di anagrafiche
prodotto e ubicazioni (`catalog.item.upsert`, `inventory.location.upsert`):
restano nello stato `needs_mapping`. Per il primo cliente questi dati vanno
creati/importati in VanStock e mappati prima dell’avvio dei movimenti.

## Decisioni da prendere con il cliente

Prima dell’implementazione concordare per iscritto:

| Tema | Decisione necessaria |
| --- | --- |
| ERP e versione | Prodotto, versione, cloud/on-premise, API disponibili e referente tecnico. |
| Direzione | ERP → VanStock, VanStock → ERP oppure entrambe. |
| Fonte autorevole | Catalogo, ubicazioni, saldo del magazzino centrale, scorta minima e prezzi. |
| Confini | Quali magazzini, furgoni, cantieri, categorie e aziende sono inclusi. |
| Frequenza | Real-time webhook, polling, batch notturno oppure combinazione. |
| Lotti/scadenze | Quali articoli li richiedono e quale sistema è autorevole. |
| Identificativi | ID esterni immutabili per articolo e ubicazione; non usare nomi come chiave. |
| Gestione conflitti | Chi corregge mapping mancanti, quantità insufficienti, UDM non riconosciute e retry falliti. |
| Sicurezza | IP pubblici, endpoint HTTPS, certificati, responsabile della rotazione segreti. |

La policy di default è descritta in [ADR 0002](adr/0002-integration-data-ownership.md).

## Informazioni da fornire a Codex

Quando sarà il momento, incolla e completa questo blocco. È sufficiente per
riprendere il lavoro senza ricostruire il contesto.

```text
Cliente / company_id VanStock:
ERP (prodotto, versione, cloud o on-premise):
Referente tecnico ERP (nome, email, canale):

Obiettivo della prima fase:
  [ ] ERP -> VanStock movimenti
  [ ] VanStock -> ERP eventi/webhook
  [ ] lettura catalogo/saldi
  [ ] altro:

Ambienti disponibili:
  sandbox ERP:
  produzione ERP:
  URL pubblico VanStock:

Fonte autorevole per:
  catalogo:
  ubicazioni:
  saldo magazzino centrale:
  scorta minima:
  prezzi:
  lotti e scadenze:

Magazzini/ubicazioni inclusi (ID ERP, nome, tipo):
Articoli/categorie esclusi:
UDM ERP e corrispondenza con VanStock:
Regole lotti e scadenze:

Formato/API ERP disponibile (link documentazione, esempi JSON, auth):
Eventi o endpoint richiesti:
Frequenza desiderata e volume stimato:

Endpoint webhook ERP (HTTPS) e modalità di verifica firma:
Vincoli di rete (allowlist IP, VPN, proxy):
Owner operativo degli errori e SLA:
```

Non inviare mai in chat password, API key complete, webhook secret, token o
dump contenenti dati personali. Condividere invece nomi di variabili, prefissi
mascherati e un canale sicuro per i segreti.

## Preparazione tecnica su VanStock

1. Deploy della versione che include le migration `v39`–`v46`; il riavvio del
   backend le applica automaticamente.
2. Configurare la variabile server `INTEGRATION_WEBHOOK_SECRET_KEY` con un
   valore lungo e casuale, solo se verranno creati webhook outbound. Va
   mantenuta durante i deploy: cambiarla renderebbe illeggibili i segreti dei
   webhook già creati.
3. Verificare backup PostgreSQL e accesso ai log del backend.
4. Creare una Integration API key da amministratore:
   `POST /api/integrations/keys`. Assegnare soltanto gli scope necessari:
   `catalog:read`, `inventory:read`, `events:read`, `commands:write`.
5. Salvare la chiave nel secret manager del cliente: VanStock la mostra una sola
   volta e conserva esclusivamente il suo hash.
6. Creare i mapping con `POST /api/integrations/mappings`, uno per prodotto e
   ubicazione, includendo l’`integration_key_id` della connessione ERP.

Un esempio di mapping amministrativo:

```json
{
  "integration_key_id": "<id della Integration API key>",
  "entity_type": "product",
  "external_id": "ERP-ART-00042",
  "internal_id": 123
}
```

## Contratto operativo

Il contratto completo è [OpenAPI v1](integrations/openapi-v1.yaml).

Base URL:

```text
https://<host>/api/integrations/v1
```

Header richiesti per l’API ERP:

```text
X-Integration-Key: vsk_...
Content-Type: application/json
```

Per `POST /commands` aggiungere un `Idempotency-Key` univoco e persistente lato
ERP. Un retry con la stessa chiave e lo stesso payload è sicuro; con payload
diverso restituisce `409`.

Gli identificativi nel payload di movimento sono quelli esterni mappati:

```json
{
  "schemaVersion": "1.0",
  "commandId": "11111111-1111-4111-8111-111111111111",
  "type": "inventory.receipt",
  "occurredAt": "2026-09-02T10:00:00.000Z",
  "correlationId": "22222222-2222-4222-8222-222222222222",
  "data": {
    "productId": "ERP-ART-00042",
    "locationId": "ERP-WH-CENTRALE",
    "quantity": "10",
    "batchNumber": "LOT-2026-09",
    "expiryDate": "2027-09-01"
  }
}
```

Per articoli con lotti/scadenze, ogni carico deve contenere `batchNumber` e
`expiryDate`. Scarichi e trasferimenti consumano lotti con logica FEFO; una
quantità insufficiente non viene applicata.

## Processi da eseguire quando la sync è attiva

Al momento i worker sono volutamente processi manuali/separati dal backend:

```bash
cd /percorso/StockSimpleApp/backend
npm run integration:process-inbox
npm run integration:dispatch-webhooks
```

Per la produzione del primo cliente, prima del go-live, configurarli come unità
systemd oppure cron con lock anti-esecuzioni sovrapposte e log centralizzati.
Non avviarli finché non esiste una connessione ERP configurata e testata.

## Test di accettazione

Eseguire nell’ambiente sandbox, con dati non produttivi:

- Creazione e revoca di una API key; la chiave revocata deve ricevere `401`.
- Lettura catalogo, ubicazioni e saldi, verificando l’isolamento del tenant.
- Mapping di un articolo e un’ubicazione; una chiave ERP diversa non deve poterlo
  usare.
- Invio di un ricevimento; invio dello stesso comando due volte; verifica di un
  solo movimento e dello stato `completed`.
- Scarico/trasferimento di prodotto tracciato per lotti, verificando FEFO e
  scadenza.
- Mapping mancante e stock insufficiente: nessuna variazione di giacenza e stato
  rispettivamente `needs_mapping`/`failed`.
- Webhook: verifica firma HMAC, retry dopo risposta 5xx e consegna duplicata
  gestita idempotentemente dal consumer ERP.
- Simulazione di riavvio del worker durante una consegna/comando e recupero dopo
  cinque minuti della lease scaduta.

## Go-live e monitoraggio

1. Eseguire il primo allineamento con una finestra concordata e un backup.
2. Iniziare con un solo magazzino e pochi articoli pilota.
3. Monitorare comandi `failed`, `needs_mapping`, `dead_letter` e retry per almeno
   una settimana.
4. Concordare una procedura di rollback: sospensione della API key/webhook,
   senza cancellare inbox e outbox utili all’audit.
5. Solo dopo esito positivo estendere il perimetro ad altri magazzini/articoli.

## Riferimenti nel repository

- [Contratto OpenAPI](integrations/openapi-v1.yaml)
- [API integration](api-integration.md)
- [ADR Integration Gateway](adr/0001-integration-gateway.md)
- [ADR Ownership dati](adr/0002-integration-data-ownership.md)
