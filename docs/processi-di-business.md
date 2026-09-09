# StockSimple — Processi di Business

> Versione 2.0 — aggiornato agosto 2026

## Indice

1. [Tipi di utente e permessi](#1-tipi-di-utente-e-permessi)
2. [Entità principali](#2-entita-principali)
3. [Processi di business](#3-processi-di-business)
   - 3.1 Gestione magazzino
   - 3.2 Carico e scarico materiali
   - 3.3 Carico massivo furgone
   - 3.4 Trasferimento tra posizioni
   - 3.5 Gestione lavori (job)
   - 3.6 Firma digitale e chiusura lavoro
   - 3.7 Chat interna per lavoro
   - 3.8 Gestione clienti
   - 3.9 Gestione fornitori
   - 3.10 Ordini di acquisto
   - 3.11 Report operativi
   - 3.12 Avvisi scorte e rifornimento
   - 3.13 Prenotazione veicoli
   - 3.14 Gestione presenze
   - 3.15 Gestione assenze
   - 3.16 Inventario fisico (audit)
   - 3.17 Gestione lotti e scadenze
   - 3.18 Analytics e margini
4. [Routine quotidiane per ruolo](#4-routine-quotidiane-per-ruolo)
5. [Flussi operativi end-to-end](#5-flussi-operativi-end-to-end)

---

## 1. Tipi di utente e permessi

| Funzionalità                                              | User | Admin | Superadmin |
|-----------------------------------------------------------|:----:|:-----:|:----------:|
| Visualizzare prodotti                                     |  V   |   V   |     V      |
| Registrare movimenti (carico/scarico/trasf.)              |  V   |   V   |     V      |
| Vedere i propri movimenti (solo giornata corrente)        |  V   |   V   |     V      |
| Vedere tutti i movimenti (qualsiasi data/operatore)       |  -   |   V   |     V      |
| Accedere a Clienti, Fornitori, Ordini acquisto            |  -   |   V   |     V      |
| Caricare massivamente il furgone                          |  V   |   V   |     V      |
| Scanner barcode                                           |  V   |   V   |     V      |
| Visualizzare i propri lavori                              |  V   |   V   |     V      |
| Aggiornare stato lavoro assegnato                         |  V   |   V   |     V      |
| Registrare arrivo cantiere (con GPS)                      |  V   |   V   |     V      |
| Caricare foto lavori (problem/repair/video)               |  V   |   V   |     V      |
| Chat interna per lavoro                                   |  V   |   V   |     V      |
| Firmare la chiusura del lavoro (firma cliente)            |  V   |   V   |     V      |
| Timbrare (check-in/out/pausa)                             |  V   |   V   |     V      |
| Richiedere correzione timbratura                          |  V   |   V   |     V      |
| Inviare report giornaliero                                |  V   |   V   |     V      |
| Richiedere rifornimento prodotto                          |  V   |   V   |     V      |
| Visualizzare tutti i lavori                               |  -   |   V   |     V      |
| Creare / modificare / eliminare lavori                    |  -   |   V   |     V      |
| Assegnare lavori agli utenti                              |  -   |   V   |     V      |
| Creare / modificare / eliminare prodotti                  |  -   |   V   |     V      |
| Importare prodotti da CSV/XLSX                            |  -   |   V   |     V      |
| Gestire clienti, posizioni, utenti                        |  -   |   V   |     V      |
| Gestire fornitori e ordini di acquisto                    |  -   |   V   |     V      |
| Prenotare veicoli                                         |  -   |   V   |     V      |
| Visualizzare / eliminare report di tutti gli operatori    |  -   |   V   |     V      |
| Gestire presenze del team (approvare correzioni)          |  -   |   V   |     V      |
| Approvare/rifiutare assenze                               |  -   |   V   |     V      |
| Eseguire inventario fisico (audit)                        |  -   |   V   |     V      |
| Gestire margini e analytics                               |  -   |   V   |     V      |
| Import/Export dati aziendali                              |  -   |   V   |     V      |
| Gestire backup e ripristino                               |  -   |   V   |     V      |
| Invitare utenti via email                                 |  -   |   V   |     V      |
| Gestire aziende                                           |  -   |   -   |     V      |
| Gestire abbonamenti e seat licensing                      |  -   |   -   |     V      |

---

## 2. Entità principali

### Prodotto

Rappresenta un articolo fisico a magazzino. Ogni prodotto appartiene a una sola azienda, ha un SKU univoco e può avere stock distribuito in più posizioni (magazzino, furgone, cantiere). Se `tracks_batches = true`, ogni movimentazione richiede numero di lotto e può registrare la data di scadenza.

Campi chiave: `name`, `sku`, `barcode`, `quantity` (totale), `unit`, `min_stock`, `location_id` (posizione principale), `category`, `category_id`, `price`, `photo_url`, `tracks_batches`.

### Movimento

Log immutabile di ogni operazione su un prodotto. Tipi:

- **Carico** — aggiunta di materiale in una posizione (acquisto, ricezione ordine).
- **Scarico** — consumo o uscita di materiale da una posizione (lavoro, scarto).
- **Trasferimento** — spostamento di materiale da una posizione a un'altra.

Ogni movimento aggiorna atomicamente le tabelle `product_stocks` e `products.quantity` in una transazione ACID. Se il nuovo saldo è sotto `min_stock`, viene inviata una notifica push. Per gli scarichi, vengono registrati anche `unit_cost_snapshot` e `unit_price_snapshot` per l'analisi storica dei margini.

### Posizione (Location)

Contenitore fisico o logico di materiale. Tipi: `warehouse`, `van`, `site`, `other`. Le posizioni di tipo `van` hanno uno stato (`disponibile`, `occupato`, `in_manutenzione`) e possono essere prenotate per date e fasce orarie.

### Lavoro (Job)

Intervento o commessa lavorativa. Ciclo di vita:

```
aperto  →  in_corso (accettazione)  →  completato  →  (firma cliente)
                                    →  annullato
```

Può avere un cliente, un responsabile assegnato, una data pianificata, un orario e una priorità (`bassa`, `normale`, `alta`, `urgente`). Tutti i movimenti registrati durante un lavoro vengono collegati al `job_id` per la tracciabilità dei consumi. Il lavoro supporta:
- Foto di tipo `problem` e `repair` (con geolocalizzazione e tipo media)
- Chat interna con messaggi testo e audio
- Firma digitale del cliente
- Tracciamento GPS dei cambi di stato
- Segnalazione materiali mancanti

### Cliente

Anagrafica cliente associabile ai lavori. Contiene nome, telefono, email, indirizzo e note.

### Fornitore

Anagrafica fornitore con dati di contatto e tempi di consegna. Ogni fornitore può essere collegato a uno o più prodotti con il relativo prezzo di acquisto. Il fornitore preferito per un prodotto viene usato come suggerimento negli ordini.

### Ordine di acquisto

Richiesta di approvvigionamento verso un fornitore. Ciclo di vita: `bozza` → `inviato` → `ricevuto`. Contiene righe con prodotto, quantità ordinata/ricevuta e prezzo unitario.

### Prenotazione veicolo

Riserva di un furgone per una data e fascia oraria (`all_day`, `morning`, `afternoon`), opzionalmente collegata a un lavoro. Impedisce conflitti di utilizzo tra operatori diversi. Un lavoro può avere più prenotazioni su furgoni diversi.

### Report giornaliero

Rapporto operativo compilato dall'operatore a fine giornata. Un solo report per utente per giorno (upsert). Gli admin possono visualizzare i report di tutto il team.

### Evento di presenza (Attendance Event)

Timbratura immutabile (event sourcing) con tipo azione, stato risultante, timestamp, GPS e fonte (`mobile`, `web`, `admin`). Le correzioni admin generano nuovi eventi sovrapposti senza modificare quelli esistenti.

### Notifica in-app

Notifica persistente nel centro notifiche dell'app. Include tipo, titolo, corpo, URL di azione e dati arbitrari in formato JSONB.

### Utente

Membro dell'organizzazione con ruolo (`user`, `admin`, `superadmin`) e stato (`ACTIVE`, `INACTIVE`, `INVITED`). Autenticazione via JWT, isolamento multi-tenant per `company_id`. Gli utenti `ACTIVE` e `INVITED` consumano un seat dell'abbonamento aziendale.

---

## 3. Processi di business

### 3.1 Gestione magazzino

**Obiettivo:** Mantenere una fotografia accurata e aggiornata delle scorte fisiche.

**Attività:**

1. Creazione prodotti con SKU, categoria, unità di misura e scorta minima.
2. Definizione delle posizioni (magazzini, furgoni, cantieri).
3. Assegnazione dei prodotti alla posizione di stoccaggio principale.
4. Importazione massiva da file CSV/XLSX per popolare il catalogo iniziale.
5. Esportazione CSV dell'intero catalogo per riconciliazioni o backup.
6. Monitoraggio continuo delle scorte via dashboard con avvisi automatici e notifiche push.
7. Rettifica periodica tramite inventario fisico (audit) per allineare sistema e realtà.

---

### 3.2 Carico e scarico materiali

**Obiettivo:** Tracciare ogni entrata e uscita di materiale.

#### Carico (ricezione materiale)

1. Operatore riceve merce dal fornitore.
2. Registra un movimento di tipo *carico*: prodotto, quantità, posizione di destinazione, prezzo di acquisto (opzionale per il calcolo margini).
3. Il sistema aggiorna il saldo della posizione e il totale del prodotto.

#### Scarico (consumo materiale)

1. Operatore utilizza materiale su un lavoro o cantiere.
2. Registra un movimento di tipo *scarico*: prodotto, quantità, posizione di prelievo, lavoro associato (opzionale).
3. Il sistema verifica la disponibilità, decrementa il saldo.
4. Salva `unit_cost_snapshot` e `unit_price_snapshot` per l'analisi storica dei margini.
5. Se il saldo scende sotto `min_stock`, viene inviata una notifica push agli utenti.

**Uso rapido (Usa 1):** dalla lista prodotti, il pulsante *Usa 1* registra uno scarico di una unità con un singolo tap.

**Filtro prodotti per posizione (Android):** nel form movimenti, selezionando tipo *scarico* e una posizione furgone, la lista prodotti viene filtrata mostrando solo gli articoli presenti in quella posizione.

---

### 3.3 Carico massivo furgone

**Obiettivo:** Preparare un furgone per la giornata trasferendo in blocco il materiale necessario.

**Flusso:**

1. Accedere alla pagina *Carico Furgone* (`/van-load`).
2. Selezionare posizione di origine (es. "Magazzino Principale") e destinazione (es. "Furgone A").
3. La lista mostra tutti i prodotti disponibili nella posizione di origine.
4. Selezionare i prodotti (checkbox) e impostare la quantità desiderata.
5. Cliccare *Carica*: appare un popup di riepilogo.
6. Confermare con *Procedi*: il sistema crea un movimento di trasferimento per ogni prodotto selezionato.

---

### 3.4 Trasferimento tra posizioni

**Obiettivo:** Spostare materiale tra qualsiasi coppia di posizioni.

**Flusso:**

1. Registrare un movimento di tipo *trasferimento* dal form movimenti.
2. Specificare: prodotto, quantità, posizione di partenza, posizione di destinazione.
3. Il sistema verifica la disponibilità nella posizione di partenza.
4. Aggiorna i saldi di entrambe le posizioni in una transazione unica.

---

### 3.5 Gestione lavori (job)

**Obiettivo:** Pianificare e tracciare interventi/commesse, associando personale, clienti e consumi di materiale.

**Flusso completo:**

1. **Creazione** (admin): Definisce titolo, descrizione, indirizzo, cliente, responsabile, data pianificata, orario e priorità.
2. **Apertura**: Il lavoro nasce in stato `aperto`.
3. **Presa in carico** (assegnato o admin): Clicca *Accetta lavoro* → stato `in_corso`, timestamp salvato.
4. **Registra arrivo** (assegnato): Al momento dell'arrivo in cantiere, l'operatore registra l'orario di arrivo tramite il pulsante dedicato. Viene salvato `started_at` con coordinate GPS opzionali.
5. **Foto problema** (opzionale): L'operatore scatta una foto del problema da risolvere (tipo `problem`, con GPS).
6. **Esecuzione**: Registra movimenti di scarico o trasferimento collegati al lavoro. Comunica via chat interna.
7. **Segnala materiali mancanti** (opzionale): Se manca qualcosa, lo segnala con nota.
8. **Foto riparazione** (opzionale): L'operatore scatta una foto del lavoro completato (tipo `repair`, con GPS).
9. **Chiusura**: Clicca *Segna come completato*. Viene salvato `completed_at` con coordinate GPS.
10. **Firma cliente** (opzionale): Il cliente firma digitalmente sul dispositivo. Viene salvato `signed_at` e l'immagine della firma.
11. **Rendicontazione**: Il dettaglio del lavoro mostra tutti i movimenti registrati con prodotti, quantità, date e operatori.

**App Android:** la schermata lavoro mostra una barra di workflow a 3 step (Accettato → Arrivato → Completato) e permette di scattare foto con GPS direttamente dalla fotocamera del dispositivo.

---

### 3.6 Firma digitale e chiusura lavoro

**Obiettivo:** Raccogliere la firma del cliente a chiusura del lavoro come prova di accettazione.

**Flusso:**

1. Lavoro in stato `completato`.
2. Operatore clicca *Firma cliente* nel dettaglio del lavoro.
3. Il cliente firma sul canvas con il dito o lo stilo.
4. Operatore clicca *Conferma firma*.
5. La firma viene salvata come immagine (`customer_signature_url`) e viene registrato `signed_at`.

> **Bug noto:** la generazione del PDF rapportino con più foto/video può risultare non corretta. La firma potrebbe non essere visibile correttamente nel PDF su Android.

---

### 3.7 Chat interna per lavoro

**Obiettivo:** Sostituire comunicazioni informali (WhatsApp) con un canale interno dedicato e documentato per ogni lavoro.

**Flusso:**

1. Aprire il dettaglio lavoro → tab/sezione **Chat**.
2. Inviare messaggi di testo o note vocali.
3. Tutti i partecipanti (ufficio e operatore) vedono la stessa cronologia.
4. La cronologia rimane permanentemente legata al lavoro.

---

### 3.8 Gestione clienti

**Obiettivo:** Centralizzare l'anagrafica dei clienti per associarla ai lavori.

**Attività:**

- Creazione, modifica ed eliminazione di clienti.
- Ricerca clienti per nome.
- Associazione a uno o più lavori.
- Accesso rapido a telefono ed email dal dettaglio lavoro.

---

### 3.9 Gestione fornitori

**Obiettivo:** Gestire l'anagrafica fornitori e i prezzi di acquisto per prodotto.

**Attività:**

1. Creazione fornitore con dati di contatto e giorni di consegna standard.
2. Associazione prodotti al fornitore con prezzo di acquisto e flag "fornitore preferito".
3. Consultazione del catalogo fornitore per valutare il riordino.
4. Utilizzo del fornitore preferito come suggerimento nella creazione ordini di acquisto.

---

### 3.10 Ordini di acquisto

**Obiettivo:** Gestire il processo di approvvigionamento verso i fornitori.

**Flusso:**

1. Admin crea un ordine in stato `bozza` selezionando fornitore e prodotti con quantità e prezzi.
2. Quando l'ordine è pronto, lo passa a `inviato` (comunicazione al fornitore tramite canali esterni).
3. All'arrivo della merce, l'admin riceve l'ordine inserendo le quantità effettive ricevute.
4. Il sistema registra i movimenti di carico corrispondenti e aggiorna lo stock.

---

### 3.11 Report operativi

#### Report giornaliero (operatore)

**Obiettivo:** Documentare le attività della giornata.

- Ogni operatore compila il proprio report a fine giornata con note sulle attività svolte.
- Un solo report per giorno per utente (modificabile finché non scade la giornata).
- Gli admin possono visualizzare e filtrare i report di tutto il team per data o operatore.

#### Van Report (riepilogo furgone)

**Obiettivo:** Avere una fotografia precisa di cosa ha fatto un furgone in una data specifica.

- Selezione furgone e data.
- Riepilogo per prodotto: quantità caricate, scaricate, trasferite in/out.
- **Stampa** del report.
- **Condivisione WhatsApp**: genera un messaggio formattato con il riepilogo dei materiali consumati.

#### Dashboard

**Obiettivo:** Visione d'insieme della situazione in tempo reale.

- Contatori: totale prodotti, prodotti sotto scorta, lavori in corso, valore stock totale.
- Lista avvisi scorte basse con link diretto al prodotto.
- Ultimi movimenti registrati.
- I miei lavori attivi (personalizzato per utente loggato).

---

### 3.12 Avvisi scorte e rifornimento

**Notifica automatica (push):**

- Generata automaticamente dopo ogni scarico o trasferimento che porta il saldo di un prodotto sotto `min_stock`.
- Visibile a tutti gli utenti dell'azienda con notifiche push attive nel browser o come PWA installata.
- Registrata anche nel centro notifiche in-app (persistente).

**Richiesta rifornimento (email):**

- Ogni utente può richiedere il rifornimento di un prodotto dalla pagina di dettaglio.
- Il sistema invia un'email a tutti gli amministratori dell'azienda con nome richiedente, dettagli prodotto, quantità attuale e scorta minima.

---

### 3.13 Prenotazione veicoli

**Obiettivo:** Coordinare l'utilizzo dei furgoni per evitare conflitti tra operatori.

**Flusso:**

1. Admin verifica la disponibilità del furgone nel calendario prenotazioni.
2. Crea una prenotazione specificando furgone, data, fascia oraria e lavoro associato.
3. Il sistema impedisce la doppia prenotazione per la stessa fascia.
4. Al termine del lavoro, l'admin aggiorna lo stato del furgone a `disponibile`.

---

### 3.14 Gestione presenze

**Obiettivo:** Tracciare entrate/uscite degli operatori con un sistema immutabile e verificabile.

**Flusso operatore:**

1. All'ingresso, l'operatore timbra `CHECK_IN` dall'app (con GPS opzionale).
2. All'inizio della pausa, timbra `BREAK_START`.
3. Al rientro dalla pausa, timbra `BREAK_END`.
4. All'uscita, timbra `CHECK_OUT`.

**Flusso correzione:**

1. Se una timbratura manca, l'operatore invia una **richiesta di correzione** con orario e motivazione.
2. L'admin vede la richiesta nella sezione presenze.
3. L'admin approva o rifiuta. Se approvata, viene creato un nuovo evento di timbratura con `source='admin'`.

**Flusso admin:**

1. Dalla sezione **Presenze** l'admin vede lo storico e le anomalie rilevate (ritardi, mancate timbrature).
2. Può configurare le soglie di ritardo.
3. Può consultare il **timesheet** consolidato per periodo.

---

### 3.15 Gestione assenze

**Flusso:**

1. Operatore segnala un'assenza pianificata (ferie, permesso, malattia) con date e motivazione.
2. L'admin vede la richiesta nella sezione **Assenze**.
3. L'admin approva o rifiuta con eventuali note.
4. L'assenza approvata viene tenuta in conto nel calcolo del timesheet.

---

### 3.16 Inventario fisico (audit)

**Obiettivo:** Riconciliare il sistema con la realtà fisica periodicamente.

**Flusso:**

1. Admin apre una sessione di conteggio per una posizione (es. "Furgone A").
2. Conta fisicamente ogni prodotto e inserisce la quantità rilevata.
3. Il sistema calcola le discrepanze tra quantità registrate e contate.
4. L'admin genera movimenti di rettifica automatici per allineare il sistema.
5. Viene prodotto un report delle discrepanze per la documentazione.

---

### 3.17 Gestione lotti e scadenze

**Obiettivo:** Tracciare numero di lotto e data di scadenza per prodotti deperibili o chimici.

**Flusso:**

1. Admin abilita `tracks_batches = true` sul prodotto.
2. All'atto del carico, l'operatore inserisce numero di lotto e data di scadenza.
3. Il sistema mantiene la giacenza per lotto in `product_batches`.
4. All'atto dello scarico, viene specificato il lotto da consumare.
5. Alert automatici possono essere configurati per i lotti prossimi alla scadenza.

---

### 3.18 Analytics e margini

**Obiettivo:** Analizzare la redditività del magazzino e dei lavori.

**Flusso:**

1. Admin consulta la sezione **Margini**.
2. Per ogni prodotto vede: costo medio di acquisto, prezzo di vendita corrente, margine lordo.
3. Grazie agli `unit_cost_snapshot` e `unit_price_snapshot` salvati negli scarichi, i margini storici rimangono accurati anche se i prezzi cambiano in seguito.

---

## 4. Routine quotidiane per ruolo

### 4.1 Utente operativo (user)

Profilo tipico: tecnico, operaio, autista di furgone.

#### Mattina — Preparazione

| Passo | Azione                                              | Dove                          |
|-------|-----------------------------------------------------|-------------------------------|
| 1     | Timbrare l'ingresso (CHECK_IN)                      | App → Timbrature              |
| 2     | Controllare i lavori assegnati per la giornata      | Dashboard → "I miei lavori"   |
| 3     | Verificare disponibilità del furgone                | Prenotazioni veicoli          |
| 4     | Caricare il furgone con il materiale necessario     | Carico Furgone (`/van-load`)  |

#### Durante il lavoro

| Passo | Azione                                               | Dove                                     |
|-------|------------------------------------------------------|------------------------------------------|
| 5     | Accettare il lavoro                                  | Dettaglio lavoro → Accetta               |
| 6     | Registrare l'arrivo in cantiere (con GPS)            | Dettaglio lavoro → Registra arrivo       |
| 7     | Scattare foto del problema (opzionale)               | Dettaglio lavoro → Foto (problem)        |
| 8     | Registrare il materiale utilizzato                   | Dettaglio lavoro → Registra movimento    |
| 9     | Usare lo scanner barcode per trovare i prodotti      | Scanner                                  |
| 10    | Consumo singolo rapido (1 unità)                     | Lista prodotti → "Usa 1"                 |
| 11    | Comunicare con l'ufficio                             | Dettaglio lavoro → Chat                  |
| 12    | Segnalare materiale mancante (se necessario)         | Dettaglio lavoro → Materiali mancanti    |

#### Fine lavoro / Fine giornata

| Passo | Azione                                               | Dove                                    |
|-------|------------------------------------------------------|-----------------------------------------|
| 13    | Scattare foto del lavoro completato (opzionale)      | Dettaglio lavoro → Foto (repair)        |
| 14    | Chiudere il lavoro come "completato"                 | Dettaglio lavoro → Segna completato     |
| 15    | Raccogliere firma del cliente (opzionale)            | Dettaglio lavoro → Firma cliente        |
| 16    | Compilare il report giornaliero                      | Report → Invia rapporto                 |
| 17    | Timbrare l'uscita (CHECK_OUT)                        | App → Timbrature                        |

---

### 4.2 Amministratore (admin)

Profilo tipico: responsabile operativo, capo magazzino, coordinatore.

#### Mattina — Pianificazione

| Passo | Azione                                               | Dove                              |
|-------|------------------------------------------------------|-----------------------------------|
| 1     | Verificare gli avvisi di scorta dalla dashboard      | Dashboard → Avvisi                |
| 2     | Controllare le presenze del team (chi è entrato)     | Presenze → Oggi                   |
| 3     | Controllare lo stato dei lavori in corso             | Lavori → filtra per stato         |
| 4     | Assegnare o aggiornare i lavori della giornata       | Lavori → Crea / Modifica          |
| 5     | Verificare la disponibilità dei furgoni              | Prenotazioni veicoli              |

#### Durante la giornata

| Passo | Azione                                               | Dove                               |
|-------|------------------------------------------------------|------------------------------------|
| 6     | Ricevere materiale da fornitore → registrare carichi | Movimenti → Nuovo (tipo: carico)   |
| 7     | Rispondere a richieste di rifornimento               | Via email ricevuta / Centro notifiche |
| 8     | Aggiungere nuovi prodotti o aggiornare prezzi        | Prodotti → Nuovo / Modifica        |
| 9     | Creare ordini di acquisto per forniture in esaurimento | Ordini acquisto → Nuovo ordine   |
| 10    | Approvare correzioni timbratura degli operatori      | Presenze → Richieste correzione    |
| 11    | Approvare assenze pianificate                        | Assenze → Richieste pending        |

#### Fine settimana / Mese

| Passo | Azione                                               | Dove                              |
|-------|------------------------------------------------------|-----------------------------------|
| 12    | Visualizzare i report giornalieri del team           | Report → filtra per data/utente   |
| 13    | Esportare CSV prodotti per riconciliazione           | Prodotti → Esporta CSV            |
| 14    | Controllare Van Report per ogni furgone              | Van Report                        |
| 15    | Verificare i consumi per lavoro completato           | Dettaglio lavoro → movimenti      |
| 16    | Ricevere ordini di acquisto arrivati                 | Ordini acquisto → Segna ricevuto  |
| 17    | Consultare margini e analytics                       | Margini / Analytics               |
| 18    | Eseguire inventario fisico periodico                 | Audit → Nuova sessione conteggio  |
| 19    | Consultare timesheet del team                        | Timesheet → Seleziona periodo     |

---

### 4.3 Super amministratore (superadmin)

Profilo tipico: responsabile IT, titolare, group manager multi-azienda.

#### Attività periodiche

| Passo | Azione                                         | Dove                            |
|-------|------------------------------------------------|---------------------------------|
| 1     | Gestire le aziende registrate nel sistema      | Amministrazione → Società       |
| 2     | Gestire abbonamenti e seat delle aziende       | Società → Abbonamento           |
| 3     | Creare o disattivare utenti amministratori     | Amministrazione → Utenti        |
| 4     | Configurare logo aziendale                     | Amministrazione → Società       |
| 5     | Importare il catalogo iniziale prodotti        | Prodotti → Importa CSV/XLSX     |
| 6     | Gestire backup e ripristini                    | Import/Export → Backup          |
| 7     | Monitorare l'utilizzo generale della piattaforma | Tutte le sezioni              |

---

## 5. Flussi operativi end-to-end

### Flusso A — Lavoro da apertura a firma cliente

```
Admin crea lavoro con cliente, responsabile e data
       ↓
Admin prenota il furgone per la data del lavoro
       ↓
Operatore vede lavoro in dashboard
       ↓
Mattina: operatore timbra CHECK_IN → carica il furgone
       ↓
Operatore accetta il lavoro → stato "in_corso"
       ↓
Operatore registra arrivo in cantiere (started_at + GPS)
       ↓
Operatore scatta foto problema (opzionale, con GPS)
       ↓
Operatore registra scarichi durante il lavoro (collegati al job)
       ↓
Operatore comunica con l'ufficio via chat interna
       ↓
Operatore scatta foto riparazione (opzionale, con GPS)
       ↓
Operatore segna lavoro "completato" (completed_at + GPS)
       ↓
Cliente firma digitalmente sul dispositivo (signed_at)
       ↓
Sera: operatore compila report giornaliero → timbra CHECK_OUT
       ↓
Admin consulta dettaglio lavoro → vede materiale consumato e foto
       ↓
Admin genera Van Report per verifica furgone
       ↓
Admin consulta margini per analisi redditività lavoro
```

---

### Flusso B — Gestione scorte basse

```
Movimento di scarico riduce stock sotto min_stock
       ↓
Notifica push inviata automaticamente agli utenti
Notifica creata nel centro notifiche in-app
       ↓
Dashboard mostra avviso scorta bassa
       ↓
Operatore clicca "Richiedi rifornimento" (email agli admin)
       ↓
Admin riceve email → crea ordine di acquisto al fornitore preferito
       ↓
Ordine passa da "bozza" a "inviato"
       ↓
Merce ricevuta → admin segna ordine come "ricevuto" e registra carico
       ↓
Stock aggiornato, avviso scompare dalla dashboard
```

---

### Flusso C — Inventario e aggiornamento catalogo

```
Admin esporta CSV prodotti
       ↓
Revisione e aggiornamento prezzi/quantità nel file
       ↓
Admin importa CSV aggiornato (upsert per SKU)
       ↓
Sistema crea prodotti nuovi e aggiorna quelli esistenti
       ↓
Admin esegue inventario fisico per posizione (audit)
       ↓
Sistema calcola discrepanze → genera movimenti di rettifica
       ↓
Stock allineato alla realtà fisica
```

---

### Flusso D — Approvvigionamento da fornitore

```
Admin verifica avvisi scorta in dashboard
       ↓
Apre scheda prodotto → verifica fornitore preferito e prezzo di acquisto
       ↓
Crea ordine di acquisto con righe prodotto/quantità/prezzo
       ↓
Cambia stato ordine in "inviato" (contatta fornitore)
       ↓
Merce arriva → admin apre ordine e clicca "Segna ricevuto"
       ↓
Inserisce quantità effettive → sistema registra carico automaticamente
       ↓
Stock aggiornato su tutte le posizioni
       ↓
Snapshot costo registrato sui futuri scarichi per analisi margini
```

---

### Flusso E — Onboarding nuovo utente via invito

```
Admin accede a Amministrazione → Utenti
       ↓
Clicca "Invita utente" → inserisce email e ruolo
       ↓
Sistema verifica seat disponibili (abbonamento)
       ↓
Backend invia email con link invito (via SMTP aziendale)
Utente creato con status "INVITED" (consuma 1 seat)
       ↓
Utente clicca il link → imposta la propria password
       ↓
Stato cambia da "INVITED" ad "ACTIVE"
       ↓
Utente può accedere al sistema con le proprie credenziali
```

---

### Flusso F — Gestione presenze e correzione timbratura

```
Operatore timbra CHECK_IN all'ingresso (con GPS)
       ↓
... Lavora durante il giorno ...
       ↓
Operatore dimentica di timbrare CHECK_OUT
       ↓
Operatore invia richiesta di correzione: CHECK_OUT alle 17:30, motivazione
       ↓
Admin vede la richiesta in Presenze → Richieste correzione
       ↓
Admin approva → sistema crea evento CHECK_OUT con source='admin'
       ↓
Timesheet risulta completo e corretto
       ↓
L'evento originale "mancato" rimane nello storico come anomalia superata
```

---

*Versione 2.0 — aggiornato agosto 2026*
