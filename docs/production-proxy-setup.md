# Proxy Nginx per la produzione

La configurazione di produzione non è inclusa nel repository. Prima di avviare
l'override `docker-compose.prod.yml`, creare il file locale ignorato da Git:

```bash
mkdir -p config
cp config/nginx.prod.example.conf config/nginx.prod.conf
```

Sostituire in `config/nginx.prod.conf`:

- `example.com`, `www.example.com` e `app.example.com` con i domini scelti;
- i percorsi dei certificati TLS con quelli presenti nel mount `nginx/certs`.

Conservare chiavi e certificati soltanto nella directory locale `nginx/certs`,
che non deve essere aggiunta a Git. Verificare il file prima del riavvio:

```bash
docker run --rm \
  -v "$PWD/config/nginx.prod.conf:/etc/nginx/nginx.conf:ro" \
  nginx:alpine nginx -t
```

Poi avviare la produzione con il file di configurazione esterno appropriato:

```bash
docker compose --env-file /percorso/privato/vanstock.env \
  -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Questo documento descrive una nuova installazione. Non applicare questi comandi
alla VPS esistente finché non è stata completata la migrazione coordinata della
configurazione corrente.
