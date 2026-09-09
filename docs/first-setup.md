# Primo avvio

Questa procedura è pensata per una nuova installazione. Non eseguire lo script
su un checkout che contiene già un file `.env`: lo script si ferma senza
modificare nulla.

## Prerequisiti

- Docker Engine con Docker Compose v2;
- OpenSSL, usato solo per generare segreti locali casuali.

## Ambiente locale

Dalla directory del repository:

```bash
./scripts/setup.sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Lo script chiede i dati iniziali e genera automaticamente password database,
chiave JWT e chiave di cifratura se vengono lasciate vuote. Crea `.env` con
permessi riservati all'utente corrente e visualizza una sola volta la password
dell'amministratore.

L'applicazione è disponibile su <http://localhost>.

## Configurazione già esistente

Lo script non aggiorna né rigenera `.env`. Per una configurazione esterna alla
checkout, inclusa la futura migrazione di un server esistente, seguire
[Configurazione esterna per Docker Compose](external-compose-config.md).
