# Company Features

Il sistema Company Features abilita o disabilita moduli funzionali per ogni Company.

## Regole di default

- Una nuova Feature è OFF per tutte le Company.
- Una nuova Company ha tutte le Feature OFF.
- `PRESENZE` è stata abilitata per le Company esistenti durante il rollout iniziale, per preservare il comportamento precedente.

## Concetti

| Concetto | Significato |
|---|---|
| Feature | Modulo di business, ad esempio `PRESENZE` o `FATTURAZIONE`. |
| Resource | Target tecnico registrato: menu, route, gruppo API o job. |
| Binding | Associazione di una Resource a una Feature. |
| Company Feature | Stato ON/OFF della Feature per una specifica Company. |

Una Resource può essere associata a una sola Feature. Questo impedisce che uno stesso endpoint o menu riceva regole di abilitazione ambigue.

## Sicurezza

La UI non è un controllo di sicurezza. Il backend usa la Resource richiesta per risolvere la Feature associata e rifiuta la richiesta con:

```json
{
  "error": "Funzionalità non abilitata per questa azienda",
  "code": "FEATURE_NOT_ENABLED",
  "resource": "API_ATTENDANCE_V2"
}
```

Web e mobile ricevono `features` e `resources` da login e `/api/auth/me`, per filtrare menu e route. In caso di `FEATURE_NOT_ENABLED` aggiornano la sessione: il backend resta comunque l’autorità definitiva.

## API SuperAdmin

| Metodo | Endpoint | Scopo |
|---|---|---|
| GET | `/api/features` | elenco catalogo Feature |
| POST | `/api/features` | crea Feature |
| PATCH | `/api/features/:featureKey` | modifica metadati o stato catalogo |
| GET | `/api/features/resources/catalog` | Resource tecniche registrate |
| GET | `/api/features/:featureKey/resources` | Resource di una Feature |
| PUT | `/api/features/:featureKey/resources` | sostituisce le associazioni Resource |
| GET | `/api/companies/:companyId/features` | Feature disponibili e stato Company |
| PUT | `/api/companies/:companyId/features/:featureKey` | abilita/disabilita una Feature |

Tutte le API elencate richiedono ruolo `superadmin`.

## Aggiungere una Feature

1. Registrare nel codice le Resource tecniche che il nuovo modulo usa.
2. Creare la Feature dalla pagina SuperAdmin **Gestione funzionalità**.
3. Associare le Resource alla Feature.
4. Applicare `requireResource(...)` ai gruppi API backend del modulo.
5. Definire le Resource corrispondenti per menu e route web/mobile.
6. Abilitare la Feature solo nelle Company autorizzate.

Non associare URL liberi o endpoint non registrati dal sistema.
