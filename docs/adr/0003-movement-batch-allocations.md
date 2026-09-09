# ADR 0003 — Allocazioni lotto immutabili per movimento

## Stato

Accettato — 2026-09-02.

## Contesto

Uno scarico o un trasferimento FEFO può consumare più lotti. Il campo storico
`movements.batch_number` contiene al massimo un valore e non permette di
ricostruire l'operazione quando il movimento viene annullato.

## Decisione

Per ogni lotto consumato da un movimento tracciato viene salvata una riga in
`movement_batch_allocations`. La riga riferisce il lotto di origine e conserva
numero lotto, scadenza e quantità come snapshot immutabile.

Le nuove allocazioni saranno create esclusivamente dal servizio di dominio
inventario introdotto nella PR 3. Non viene eseguito un backfill dei movimenti
storici: non è possibile dedurre con affidabilità quali lotti siano stati
prelevati prima dell'introduzione di questa tabella.

## Conseguenze

- Le reversal di nuovi scarichi e trasferimenti possono ripristinare i lotti
  esatti.
- I movimenti storici senza allocazioni rimangono compatibili ma seguono la
  gestione legacy fino a una correzione amministrativa esplicita.
- La cancellazione di un movimento elimina le relative allocazioni; un lotto
  allocato non può essere eliminato accidentalmente.
