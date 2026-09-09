# Company Features — checklist di rilascio

Usare almeno due Company di prova: Company A con Feature ON e Company B con la stessa Feature OFF. Preparare inoltre un utente `admin`, un utente standard e un `superadmin`.

## Catalogo e configurazione

- [ ] Il superadmin crea una nuova Feature con un codice valido e univoco.
- [ ] La nuova Feature risulta OFF per tutte le Company esistenti.
- [ ] Una Company appena creata vede tutte le Feature OFF.
- [ ] Il superadmin associa Resource registrate; una Resource non registrata è rifiutata.
- [ ] L’abilitazione/disabilitazione viene registrata nell’audit log.
- [ ] Un admin o user normale non può usare le API SuperAdmin.

## Backend e sicurezza

- [ ] Company A con Feature ON può chiamare tutte le API del modulo.
- [ ] Company B con Feature OFF riceve `403` e `FEATURE_NOT_ENABLED` su ogni API del modulo.
- [ ] Una chiamata diretta, senza menu o client ufficiale, non aggira il blocco.
- [ ] Un utente di Company A non può leggere o modificare la configurazione di Company B.
- [ ] Una Resource senza Feature abilitata non concede accesso.
- [ ] I job associati alla Resource non producono dati o notifiche per Company OFF.

## Web

- [ ] Login Company A: menu del modulo visibile secondo il ruolo.
- [ ] Login Company B: menu del modulo assente.
- [ ] URL diretto verso una route del modulo OFF viene reindirizzato alla dashboard.
- [ ] Disabilitazione durante una sessione: la prima risposta `FEATURE_NOT_ENABLED` aggiorna il menu e riporta alla dashboard.
- [ ] Logout/login con Company diversa non mantiene Resource della sessione precedente.

## Mobile

- [ ] Login Company A: tab e route del modulo disponibili.
- [ ] Login Company B: tab assente e route diretta reindirizzata alla dashboard.
- [ ] Disabilitazione durante una sessione: la prima risposta `FEATURE_NOT_ENABLED` ricarica l’utente e ricostruisce la navigazione.
- [ ] Logout/login con Company diversa non conserva tab o route precedenti.

## Regressione PRESENZE

- [ ] Company esistente con PRESENZE ON continua a usare QR, Attendance, assenze, turni e monitor.
- [ ] Company con PRESENZE OFF non può usare API V1, API V2, timesheet, assenze o turni.
- [ ] Il job anomalie non genera notifiche per Company PRESENZE OFF.
- [ ] Le altre funzioni non associate a PRESENZE restano disponibili.

## Migration e rollout

- [ ] Applicazione migration su database vuoto.
- [ ] Applicazione migration su database popolato.
- [ ] Verifica che le Company esistenti ricevano PRESENZE ON una sola volta.
- [ ] Verifica che la migration sia idempotente al riavvio backend.
- [ ] Piano di rollback verificato su staging prima della produzione.
