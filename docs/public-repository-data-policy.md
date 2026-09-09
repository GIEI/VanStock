# Dati esclusi dal repository pubblico

Il repository contiene solo codice, configurazioni di esempio e directory
vuote necessarie all'avvio. Non devono essere versionati:

- file `.env` e qualsiasi segreto applicativo;
- account di servizio Firebase o altre credenziali cloud;
- `SITOWEB/config.php` con le credenziali SMTP del form contatti;
- backup del database, file caricati dagli utenti e log applicativi.

Per il sito PHP, copiare `SITOWEB/config.example.php` in `SITOWEB/config.php`
e compilare i valori soltanto sul server che ospita il sito.

Per le notifiche Android, impostare `FIREBASE_SERVICE_ACCOUNT_JSON` nel file
di configurazione esterno usato da Docker Compose. Il valore deve essere il
JSON completo dell'account di servizio e non deve essere aggiunto al repository.

Queste esclusioni proteggono il contenuto del branch corrente. Prima di
pubblicare un repository già esistente, creare un repository pubblico nuovo da
uno snapshot sanitizzato: i file rimossi possono comunque essere presenti nella
cronologia privata precedente.
