# StockSimple — Manuale Utente

> Versione 2.0 — aggiornato agosto 2026

## Indice

1. [Introduzione](#1-introduzione)
2. [Accesso all'applicazione](#2-accesso-allapplicazione)
3. [Dashboard](#3-dashboard)
4. [Prodotti](#4-prodotti)
5. [Movimenti di magazzino](#5-movimenti-di-magazzino)
6. [Carico furgone](#6-carico-furgone)
7. [Scanner barcode](#7-scanner-barcode)
8. [Lavori (cantieri)](#8-lavori-cantieri)
9. [Clienti](#9-clienti)
10. [Fornitori](#10-fornitori)
11. [Ordini di acquisto](#11-ordini-di-acquisto)
12. [Report giornaliero](#12-report-giornaliero)
13. [Van Report](#13-van-report)
14. [Posizioni](#14-posizioni)
15. [Timbrature e presenze](#15-timbrature-e-presenze)
16. [Centro notifiche](#16-centro-notifiche)
17. [Notifiche push](#17-notifiche-push)
18. [Cambio password](#18-cambio-password)
19. [Installazione come app (PWA)](#19-installazione-come-app-pwa)
20. [App Android](#20-app-android)
21. [Utilizzo offline](#21-utilizzo-offline)

---

## 1. Introduzione

StockSimple è un'applicazione web per la gestione dell'inventario pensata per piccole imprese e artigiani con magazzini mobili (furgoni), cantieri e depositi fissi. Permette di:

- Tracciare in tempo reale la posizione e la quantità di ogni articolo in magazzino
- Registrare carichi, scarichi e trasferimenti di materiali
- Gestire lavori (cantieri/interventi) dal preventivo alla firma del cliente
- Ricevere avvisi automatici quando le scorte scendono sotto la soglia minima
- Timbrare l'ingresso e l'uscita con controllo presenze integrato
- Comunicare internamente tramite chat per singolo lavoro

L'app funziona da browser su qualsiasi dispositivo (PC, tablet, smartphone) e può essere installata come app nativa (PWA) su Android e iOS. È disponibile anche un'app Android nativa.

---

## 2. Accesso all'applicazione

### Login

1. Aprire il browser e navigare all'indirizzo fornito dall'amministratore (es. `http://localhost` o il dominio aziendale).
2. Inserire **email** e **password** nei campi appositi.
3. Cliccare **Accedi**.

Il token di sessione rimane valido per 7 giorni. Alla scadenza verrà richiesto un nuovo accesso.

### Password dimenticata

1. Nella schermata di login cliccare **Hai dimenticato la password?**
2. Inserire la propria email e cliccare **Invia**.
3. Seguire il link ricevuto, inserire la nuova password (minimo 8 caratteri) e confermare.

> Se non si riceve l'email, contattare l'amministratore per ottenere un link di reset manuale (valido 24 ore).

---

## 3. Dashboard

La dashboard è la schermata principale che appare dopo il login. Mostra:

| Sezione              | Contenuto                                                                 |
|----------------------|---------------------------------------------------------------------------|
| Statistiche          | Totale prodotti, valore magazzino, prodotti sotto scorta, lavori attivi   |
| I miei lavori        | Lavori assegnati all'utente loggato in stato `aperto` o `in_corso`        |
| Avvisi scorta        | Prodotti la cui quantità è scesa sotto il livello minimo                   |
| Movimenti recenti    | Gli ultimi movimenti registrati nel sistema                               |

Cliccare su un prodotto negli avvisi per accedere direttamente alla sua scheda.

---

## 4. Prodotti

### 4.1 Lista prodotti

Dalla voce di menu **Prodotti** si accede all'elenco completo degli articoli del proprio magazzino.

**Filtri disponibili:**

| Filtro            | Descrizione                                             |
|-------------------|---------------------------------------------------------|
| Ricerca testuale  | Cerca su nome, SKU e barcode                           |
| Categoria         | Filtra per categoria merceologica                       |
| Posizione         | Mostra solo i prodotti presenti in una determinata posizione |
| Solo scorta bassa | Mostra solo gli articoli sotto la soglia minima         |

I risultati sono paginati (50 articoli per pagina di default, max 100).

### 4.2 Dettaglio prodotto

Cliccando su un prodotto si apre la scheda di dettaglio con:

- Dati anagrafici (nome, SKU, barcode, categoria, unità di misura, prezzo di vendita, note)
- Quantità totale e distribuzione per posizione
- Soglia di scorta minima
- Fornitore preferito e prezzo di acquisto
- Foto del prodotto
- Storico degli ultimi movimenti
- Gestione lotti e scadenze (se abilitata sul prodotto)

### 4.3 Aggiungere un prodotto (solo admin)

1. Cliccare il pulsante **+ Nuovo prodotto**.
2. Compilare i campi obbligatori: **Nome** e **SKU** (codice univoco interno).
3. Compilare i campi facoltativi:
   - Barcode (per lo scanner)
   - Descrizione
   - Quantità iniziale e posizione
   - Unità di misura (pz, m, kg, l, ecc.)
   - Soglia scorta minima
   - Categoria
   - Prezzo di vendita
   - Note
   - **Traccia lotti** — attivare per prodotti con numero di lotto e data di scadenza
4. Cliccare **Salva**.

> Lo SKU deve essere univoco all'interno della propria azienda.

### 4.4 Modificare un prodotto (solo admin)

1. Aprire il dettaglio del prodotto.
2. Cliccare l'icona a matita (Modifica).
3. Apportare le modifiche necessarie.
4. Cliccare **Salva**.

### 4.5 Caricare la foto

Nella scheda di modifica del prodotto è possibile caricare una foto (formati immagine standard, max 5 MB) tramite il pulsante **Carica foto**.

### 4.6 Gestione lotti e scadenze

Quando il flag **Traccia lotti** è attivo su un prodotto, ogni movimento (carico/scarico) può riportare:

- **Numero di lotto** — codice identificativo del lotto fisico
- **Data di scadenza** — per avvisi di prossima scadenza

I lotti correnti per posizione sono visibili nella tabella `product_batches`. Questa funzionalità è utile per prodotti deperibili o chimici (sigillanti, resine, vernici).

### 4.7 Richiedere rifornimento

Dalla scheda prodotto, il pulsante **Richiedi rifornimento** invia un'email automatica a tutti gli amministratori dell'azienda con:

- Nome del richiedente
- Dettagli del prodotto
- Quantità attuale vs soglia minima

### 4.8 Esportare e importare prodotti (solo admin)

**Esporta CSV** — dalla lista prodotti, il pulsante **Esporta** scarica un file CSV con tutti i prodotti.

**Importa da CSV/Excel** — il pulsante **Importa** permette di caricare un file `.csv` o `.xlsx` per aggiungere o aggiornare prodotti in blocco (upsert per SKU).

### 4.9 Usa 1 (consumo rapido)

Dalla lista prodotti il pulsante **Usa 1** registra uno scarico di una unità con un singolo tap, senza aprire il form movimenti. Ideale per operativi in campo.

### 4.10 Eliminare un prodotto (solo admin)

Dall'elenco o dal dettaglio, usare l'icona del cestino. L'operazione è irreversibile.

---

## 5. Movimenti di magazzino

I movimenti aggiornano in tempo reale le quantità in magazzino. Esistono tre tipi:

| Tipo              | Descrizione                                  | Campi richiesti                                      |
|-------------------|----------------------------------------------|------------------------------------------------------|
| **Carico**        | Aggiunge merce a una posizione               | Prodotto, quantità, posizione di destinazione         |
| **Scarico**       | Rimuove merce da una posizione               | Prodotto, quantità, posizione di origine              |
| **Trasferimento** | Sposta merce da una posizione a un'altra     | Prodotto, quantità, posizione origine e destinazione  |

### 5.1 Registrare un movimento

1. Dal menu cliccare **Movimenti** → **Nuovo movimento**.
2. Selezionare il **tipo** di movimento.
3. Selezionare la **posizione di origine** (per scarico/trasferimento).
4. Scegliere il **prodotto** — se il tipo è *scarico* e si è selezionato un furgone, la lista mostra solo i prodotti presenti in quella posizione.
5. Inserire la **quantità**.
6. Selezionare la posizione di destinazione (per carico/trasferimento).
7. (Opzionale) Compilare:
   - **Note**
   - **Lavoro** associato (il materiale verrà contabilizzato nel lavoro)
   - **Prezzo di acquisto** (per carico — utile per il calcolo dei margini)
   - **Numero lotto** e **data di scadenza** (se il prodotto traccia i lotti)
8. Cliccare **Registra**.

Il sistema verifica che la quantità disponibile nella posizione di origine sia sufficiente prima di confermare. Ogni scarico/trasferimento che porta il saldo sotto `min_stock` genera automaticamente una notifica push.

### 5.2 Lista movimenti

La lista mostra i movimenti con possibilità di filtrare per prodotto, tipo e intervallo di date.

> **Nota per gli utenti operativi:** gli utenti con ruolo `user` visualizzano solo i propri movimenti e solo quelli della giornata corrente. Gli admin vedono tutti i movimenti di tutti gli operatori senza restrizioni di data.

### 5.3 Eliminare un movimento

Tramite il cestino nella lista. **Attenzione:** l'eliminazione non inverte automaticamente le quantità. Usare solo per correggere errori e poi inserire il movimento corretto.

---

## 6. Carico furgone

Il carico massivo furgone permette di preparare un furgone per la giornata selezionando più prodotti in una sola operazione.

1. Dal menu cliccare **Carico Furgone**.
2. Selezionare la **posizione di origine** (es. "Magazzino Principale").
3. Selezionare la **posizione di destinazione** (es. "Furgone A").
4. La lista mostra tutti i prodotti disponibili nella posizione di origine.
5. Selezionare i prodotti con la checkbox e impostare la quantità desiderata.
6. Cliccare **Carica** — appare un popup di riepilogo.
7. Confermare con **Procedi**: viene creato un trasferimento per ogni prodotto selezionato.

---

## 7. Scanner barcode

Lo scanner usa la fotocamera del dispositivo per leggere codici a barre e QR code.

### Come usarlo

1. Dal menu cliccare **Scanner**.
2. Al primo utilizzo il browser chiede il permesso di accedere alla fotocamera: cliccare **Consenti**.
3. Inquadrare il codice a barre: al riconoscimento il sistema apre il prodotto corrispondente.

### Formati supportati

EAN-13, EAN-8, UPC-A, UPC-E, Code-128, Code-39, QR Code, Data Matrix e altri.

### Inserimento manuale

Se la fotocamera non è disponibile, è possibile digitare il codice nel campo di testo e premere Invio.

> L'app deve essere servita su **HTTPS** in produzione per accedere alla fotocamera. In sviluppo (localhost) funziona senza HTTPS.

---

## 8. Lavori (cantieri)

I lavori rappresentano interventi, commesse o cantieri assegnati agli operatori.

### 8.1 Lista lavori

Dalla voce di menu **Lavori** si vede la lista. Gli utenti operativi vedono solo i lavori assegnati a loro; gli admin vedono tutto.

**Filtri:** stato, operatore assegnato, cliente, date, priorità.

### 8.2 Stati e priorità

**Stati disponibili:**

| Stato        | Significato                                  |
|--------------|----------------------------------------------|
| `aperto`     | Lavoro creato, in attesa di presa in carico   |
| `in_corso`   | Lavoro accettato, operatore al lavoro         |
| `completato` | Lavoro chiuso con successo                   |
| `annullato`  | Lavoro cancellato                            |

**Priorità disponibili:**

| Priorità  | Significato                    |
|-----------|--------------------------------|
| `bassa`   | Non urgente                    |
| `normale` | Standard (default)             |
| `alta`    | Da gestire in giornata         |
| `urgente` | Da gestire immediatamente      |

### 8.3 Dettaglio lavoro

Il dettaglio mostra: dati del lavoro, cliente, responsabile, data pianificata, orario, stato attuale, priorità, movimenti di materiale collegati, foto e chat.

### 8.4 Workflow (ciclo di vita)

```
Aperto  →  In corso (accettazione + registra arrivo)  →  Completato  →  (Firma cliente)
                                                       →  Annullato
```

**Azioni disponibili nel dettaglio:**

| Pulsante               | Disponibile quando      | Effetto                                            |
|------------------------|-------------------------|----------------------------------------------------|
| **Accetta lavoro**     | Stato `aperto`          | Imposta `in_corso`, salva il timestamp             |
| **Registra arrivo**    | Stato `in_corso`        | Registra `started_at` con opzionale GPS            |
| **Segna completato**   | Stato `in_corso`        | Imposta `completato`, salva `completed_at`          |
| **Firma cliente**      | Stato `completato`      | Apre il canvas per la firma digitale del cliente   |
| **Annulla**            | Stati `aperto`/`in_corso` | Imposta `annullato`                              |

Ogni cambio di stato con geolocalizzazione abilitata registra coordinate GPS nella tabella `job_state_changes`.

### 8.5 Foto dell'intervento

Dalla scheda lavoro è possibile caricare foto per documentare il lavoro:

- **Tipo "problem"** — foto del problema riscontrato (scattata prima dell'intervento).
- **Tipo "repair"** — foto del lavoro completato.
- **Video** — è possibile allegare anche video (se supportato dalla configurazione).

Cliccare l'icona fotocamera per scattare direttamente o caricare un file. Le foto registrano opzionalmente le coordinate GPS e l'indirizzo. Le foto sono visibili nella galleria e possono essere eliminate.

### 8.6 Firma digitale del cliente

Al completamento di un lavoro, è possibile raccogliere la firma del cliente direttamente sul tablet/smartphone:

1. Cliccare **Firma cliente** nel dettaglio del lavoro.
2. Il cliente firma sul canvas con il dito o lo stilo.
3. Cliccare **Conferma firma**.
4. La firma viene salvata come immagine e il lavoro riceve il timestamp `signed_at`.

### 8.7 Chat interna del lavoro

Ogni lavoro ha una **chat interna** accessibile dalla scheda di dettaglio. Permette la comunicazione tra l'ufficio e l'operatore sul campo:

- **Messaggi di testo** — visibili a tutti i partecipanti del lavoro.
- **Messaggi audio** — è possibile registrare e inviare note vocali.
- La cronologia rimane legata al lavoro per consultazioni future.

### 8.8 Movimenti collegati a un lavoro

Quando si registra un movimento (scarico o trasferimento), è possibile associarlo al lavoro corrente tramite il campo **Lavoro**. I materiali consumati appaiono nel dettaglio del lavoro per la rendicontazione.

### 8.9 Materiali mancanti

Nel dettaglio lavoro è possibile segnalare un **materiale mancante** con nota opzionale. Questo avvisa l'amministratore di eventuali prodotti necessari non disponibili in cantiere.

### 8.10 Creare un lavoro (solo admin)

1. Cliccare **+ Nuovo lavoro**.
2. Compilare:
   - **Titolo** (obbligatorio)
   - Descrizione e indirizzo del cantiere
   - Cliente
   - Responsabile assegnato
   - Data pianificata
   - Orario (`tutto il giorno`, `mattina`, `pomeriggio`, `personalizzato`)
   - Priorità
3. Salvare. Il lavoro nasce in stato `aperto`.

---

## 9. Clienti

> Sezione visibile e accessibile solo agli utenti con ruolo **admin** o **superadmin**.

L'anagrafica clienti è accessibile dalla sezione **Amministrazione → Clienti**.

- **Lista clienti** — ricerca per nome con filtro rapido.
- **Dettaglio cliente** — nome, telefono, email, indirizzo, note e lista lavori associati.
- **Crea/modifica/elimina** — solo admin.

---

## 10. Fornitori

> Sezione visibile e accessibile solo agli utenti con ruolo **admin** o **superadmin**.

L'anagrafica fornitori è accessibile dalla sezione **Amministrazione → Fornitori**.

- **Lista fornitori** — ricerca per nome.
- **Dettaglio fornitore** — dati di contatto, giorni di consegna, prodotti associati con prezzo di acquisto.
- **Crea/modifica/elimina** — solo admin.
- **Associa prodotti** — dal dettaglio fornitore è possibile collegare i prodotti con il relativo prezzo di acquisto e impostare il fornitore preferito.

---

## 11. Ordini di acquisto

> Sezione visibile e accessibile solo agli utenti con ruolo **admin** o **superadmin**.

Gli ordini di acquisto permettono di gestire il riordino ai fornitori.

### Ciclo di vita

```
bozza  →  inviato  →  ricevuto
```

### Come creare un ordine

1. Dalla sezione **Ordini acquisto** cliccare **+ Nuovo ordine**.
2. Selezionare il fornitore.
3. Aggiungere i prodotti con le quantità da ordinare e il prezzo unitario.
4. Salvare come **bozza** o cambiare stato in **inviato**.

### Ricezione ordine

Quando la merce arriva, aprire l'ordine e cliccare **Segna come ricevuto**. È possibile inserire le quantità effettivamente ricevute (possono differire da quelle ordinate). Il sistema registra automaticamente i movimenti di carico.

---

## 12. Report giornaliero

Il report giornaliero è un rapporto operativo compilato dall'operatore a fine giornata.

1. Dal menu cliccare **Report**.
2. Il form mostra la data corrente e i lavori completati durante la giornata.
3. Aggiungere eventuali **note** sull'attività svolta.
4. Cliccare **Invia rapporto**.

Solo un report per giorno per utente (upsert automatico). Gli admin possono vedere i report di tutti gli operatori.

---

## 13. Van Report

Il Van Report (riepilogo furgone) mostra tutti i movimenti di un furgone in una data specifica.

1. Dal menu cliccare **Van Report** (o **Riepilogo furgone**).
2. Selezionare il **furgone** e la **data**.
3. Il report mostra: prodotti movimentati con quantità caricate, scaricate e trasferite, e l'**operatore** che ha effettuato ogni movimento.

**Filtro operatore (solo admin)** — gli admin possono filtrare i movimenti per singolo operatore.

**Stampa** — cliccare il pulsante di stampa per ottenere una versione stampabile.

**Condivisione WhatsApp** — genera un messaggio formattato con il riepilogo dei materiali, pronto per essere inviato.

---

## 14. Posizioni

Le posizioni rappresentano i luoghi fisici dove è conservata la merce.

### Tipi di posizione

| Tipo        | Descrizione              |
|-------------|--------------------------|
| `warehouse` | Magazzino fisso          |
| `van`       | Furgone / veicolo        |
| `site`      | Cantiere o punto lavoro  |
| `other`     | Altro                    |

### Stati posizione

| Stato             | Descrizione                  |
|-------------------|------------------------------|
| `disponibile`     | Posizione libera             |
| `occupato`        | Posizione in uso             |
| `in_manutenzione` | Posizione fuori servizio     |

### Prenotazione veicoli

I furgoni possono essere prenotati per una data e fascia oraria (`tutto il giorno`, `mattina`, `pomeriggio`), collegandoli a un lavoro. Questo evita conflitti di utilizzo tra operatori diversi.

1. Dalla sezione **Prenotazioni** cliccare **+ Nuova prenotazione**.
2. Selezionare il furgone, la data e la fascia oraria.
3. Collegare opzionalmente a un lavoro.
4. Salvare. Il sistema impedisce doppie prenotazioni per la stessa fascia.

---

## 15. Timbrature e presenze

Il modulo presenze permette di registrare entrate e uscite tramite un sistema di badge/QR code.

### Come timbrare

L'operatore timbra tramite l'app (mobile o web) scansionando un QR code o premendo il pulsante di timbratura. Le azioni disponibili sono:

| Azione        | Significato                        |
|---------------|------------------------------------|
| `CHECK_IN`    | Entrata                            |
| `CHECK_OUT`   | Uscita                             |
| `BREAK_START` | Inizio pausa                       |
| `BREAK_END`   | Fine pausa, ripresa lavoro         |

Ogni timbratura può includere:
- **Coordinate GPS** per la verifica della posizione
- **Device ID** del dispositivo utilizzato

### Richiesta correzione orario

Se si dimentica di timbrare (es. si esce senza fare il check-out), è possibile inviare una **richiesta di correzione**:

1. Dalla sezione presenze cliccare **Richiedi correzione**.
2. Specificare l'azione mancante (`CHECK_IN`, `CHECK_OUT`, ecc.), l'orario corretto e la motivazione.
3. L'amministratore revisionerà e approverà o rifiuterà la richiesta.

> Le timbrature sono immutabili (event sourcing): ogni modifica genera un nuovo evento; la storia originale resta sempre visibile.

### Assenze

È possibile segnalare un'assenza programmata (ferie, permesso, malattia) dalla sezione presenze. L'amministratore gestisce e approva le assenze dal pannello admin.

---

## 16. Centro notifiche

Il **Centro notifiche** in-app raccoglie tutte le notifiche ricevute (scorte basse, aggiornamenti lavori, approvazioni richieste di correzione, ecc.).

- L'icona campanella nella barra superiore mostra il numero di notifiche non lette.
- Cliccare su una notifica per accedere direttamente alla sezione pertinente.
- Le notifiche vengono marcate come lette automaticamente all'apertura.

---

## 17. Notifiche push

Le notifiche push avvisano in tempo reale quando un prodotto scende sotto la scorta minima, anche quando l'app non è aperta.

### Attivare le notifiche

1. Nella barra laterale cliccare **Attiva notifiche scorte**.
2. Il browser mostra un dialog di richiesta permesso: cliccare **Consenti**.
3. Al completamento il pulsante cambia in **Disattiva notifiche scorte**.

### Disattivare le notifiche

Cliccare **Disattiva notifiche scorte** nella barra laterale.

### Risoluzione problemi

- **Spinner infinito o timeout** — verificare che i permessi del browser per le notifiche siano impostati su *Consenti* (icona lucchetto nella barra URL).
- **Edge non risponde** — in Microsoft Edge andare in `edge://settings/privacy` e verificare che il **Tracking prevention** non sia impostato su *Strict*.
- Le notifiche richiedono che l'app sia installata come PWA o aperta nel browser.

---

## 18. Cambio password

1. Cliccare sull'avatar o sul nome utente in alto a destra.
2. Scegliere **Cambia password**.
3. Inserire la password attuale e la nuova password (minimo 8 caratteri).
4. Confermare.

---

## 19. Installazione come app (PWA)

StockSimple è una Progressive Web App e può essere installata direttamente dal browser.

**Su Android (Chrome):**

1. Aprire l'app nel browser.
2. Toccare il menu del browser (tre puntini) → **Aggiungi alla schermata Home**.

**Su iOS (Safari):**

1. Aprire l'app in Safari.
2. Toccare l'icona **Condividi** → **Aggiungi alla schermata Home**.

**Su Desktop (Chrome/Edge):**

1. Nella barra degli indirizzi comparirà un'icona di installazione.
2. Cliccarla e confermare.

---

## 20. App Android

È disponibile un'app Android nativa (nella cartella `MOBILE/`) con le stesse funzionalità principali:

- Dashboard con lavori assegnati
- Lista e dettaglio lavori con workflow (Accettato → Arrivato → Completato)
- Firma cliente a fine lavoro
- Foto lavori direttamente dalla fotocamera (con geolocalizzazione)
- Chat interna per lavoro
- Movimenti con filtro prodotti per posizione
- Report giornaliero
- Scanner barcode
- Van Report
- Fornitori e ordini di acquisto
- Timbrature (check-in/check-out)

**Requisiti:** Android 8.0 (API 26) o superiore. L'app si connette allo stesso backend via rete locale o internet. Configurare `BASE_URL` nel file `local.properties` o in `app/build.gradle`.

Per la connessione in sviluppo via USB: `adb reverse tcp:3000 tcp:3000`.

---

## 21. Utilizzo offline

Grazie al Service Worker PWA, i dati già caricati in precedenza rimangono accessibili anche senza connessione internet. Le modifiche apportate offline verranno sincronizzate alla riconnessione.

> In modalità offline non è possibile salvare nuovi movimenti o prodotti che richiedono la scrittura sul server. Le operazioni di scrittura restano in attesa fino al ripristino della connessione.

---

*Versione 2.0 — aggiornato agosto 2026*
