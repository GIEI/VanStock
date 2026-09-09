# ADR 0002 — Ownership e conflitti dei dati ERP

## Stato

Accettato — 2026-09-02.

## Decisione

Ogni risorsa sincronizzata deve avere una sola fonte autorevole per connessione e per direzione. Il default iniziale è:

| Risorsa | Fonte autorevole |
| --- | --- |
| SKU, nome, descrizione, categoria, prezzo | ERP |
| Magazzini centrali | ERP |
| Movimenti su furgoni e cantieri | VanStock |
| Lotti consumati durante il lavoro | VanStock |
| Saldo del magazzino centrale | Configurabile per connessione |
| Scorta minima | Configurabile per connessione |

Un saldo non viene usato come istruzione bidirezionale. Se l'ERP è autorevole sul magazzino centrale, invia snapshot con versione e data di efficacia; se VanStock è autorevole, l'ERP riceve movimenti e saldi osservabili.

I mapping usano identificativi esterni espliciti. SKU, nomi di magazzino e descrizioni possono essere usati solo per un bootstrap configurato e non ambiguo. Una UDM o una posizione sconosciuta crea un conflitto risolvibile e non modifica il magazzino.

## Conseguenze

- Non sono consentiti due writer concorrenti sullo stesso saldo di magazzino.
- Ogni evento contiene `origin` e `correlationId` per prevenire loop di sincronizzazione.
- Le azioni di riconciliazione sono inizialmente read-only; la correzione richiede un'azione distinta, autorizzata e auditata.
