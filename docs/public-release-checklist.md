# Checklist per il rilascio pubblico

Non rendere pubblico l’attuale repository privato: i file rimossi dal branch
possono essere ancora presenti nella cronologia precedente.

## Prima dello snapshot

- [ ] `oss-prep` è aggiornato e la CI è verde.
- [ ] `scripts/verify-public-tree.sh` passa.
- [ ] una nuova installazione è verificata con `./scripts/setup.sh` e Docker
  Compose in sviluppo;
- [ ] i template locale per Nginx, sito e Firebase sono compilati solo fuori da
  Git;
- [ ] non sono presenti dati clienti, backup, upload o log.

## Pubblicazione

1. Creare un nuovo repository GitHub **vuoto** e pubblico.
2. Creare uno snapshot pulito dal contenuto di `oss-prep`, senza copiare la
   cartella `.git` né gli hook locali.
3. Inizializzare una nuova cronologia Git e pubblicare il primo commit nel
   nuovo repository.
4. Configurare nel nuovo repository la CI e la security policy.
5. Verificare il clone pubblico in una directory vuota prima dell’annuncio.

## Produzione esistente

- mantenere il repository privato e la VPS sulla relativa cronologia;
- non puntare la VPS al repository pubblico senza una migrazione pianificata;
- mantenere segreti, certificati, Firebase e backup esclusivamente fuori da
  Git;
- ruotare le credenziali eventualmente esposte nello storico privato prima di
  condividere accessi a terzi.
