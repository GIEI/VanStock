# Configurazione esterna per Docker Compose

Docker Compose supporta nativamente un file di variabili esterno con l'opzione
`--env-file`. StockSimple non richiede modifiche ai file Compose per usarlo.

Il file esterno serve alla sostituzione delle variabili nei file Compose e ai
valori passati ai container. Deve contenere almeno `DB_NAME`, `DB_USER`,
`DB_PASSWORD` e `JWT_SECRET`, perché sono richiesti dal backend attuale.

## Uso diretto

Per un ambiente locale con gateway di sviluppo:

```bash
docker compose --env-file /percorso/privato/stocksimple.env \
  -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Per l'ambiente di produzione esistente:

```bash
docker compose --env-file /percorso/privato/stocksimple.env \
  -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

`--env-file` è un'opzione globale di Compose e deve quindi precedere il
comando, ad esempio `up`, `down`, `ps` o `logs`.

## Wrapper facoltativo

Il repository include un wrapper che controlla soltanto la presenza delle
chiavi minime e non stampa, copia o modifica il file selezionato:

```bash
scripts/compose-external-env.sh /percorso/privato/stocksimple.env \
  -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Lo stesso percorso va passato per le operazioni successive:

```bash
scripts/compose-external-env.sh /percorso/privato/stocksimple.env \
  -f docker-compose.yml -f docker-compose.prod.yml ps
```

## Compatibilit\u00e0 e sicurezza

Questo \u00e8 un percorso opt-in. I comandi esistenti senza `--env-file`, inclusi
quelli del deploy corrente, restano invariati e Docker Compose continua a
usare il file `.env` nella directory del progetto secondo il proprio
comportamento standard.

Per la configurazione esterna:

- conservare il file fuori dal repository e limitarne i permessi, ad esempio
  `chmod 600 /percorso/privato/stocksimple.env`;
- includere tutte le variabili usate dalla propria configurazione Compose;
- usare un valore valido per `APP_ENCRYPTION_KEY` se si configurano SMTP o
  integrazioni, anche se il backend storico non la richiede per l'avvio;
- non eseguire `source` sul file e non aggiungerlo a Git.

La rimozione di un `.env` gi\u00e0 tracciato da Git richiede una migrazione separata
e coordinata del server di produzione. Non \u00e8 effettuata da questo wrapper.
