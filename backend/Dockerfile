FROM node:20-slim

WORKDIR /app

# Install LibreOffice for Word→PDF conversion, plus PostgreSQL 16 client/tar/gzip for backups
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    curl ca-certificates gnupg \
    tar gzip \
    && install -d /usr/share/postgresql-common/pgdg \
    && curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
       -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
    && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list \
    && apt-get update && apt-get install -y --no-install-recommends postgresql-client-16 \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install --omit=dev

COPY src/ ./src/

RUN mkdir -p /app/uploads /app/backups

EXPOSE 3000

CMD ["node", "src/index.js"]
