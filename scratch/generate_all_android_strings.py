import os
import json

# Load the base strings
with open('scratch/android_strings.json', 'r', encoding='utf-8') as f:
    it_strings = json.load(f)

# Translation dictionary
translations = {
    'en': {
        "stocksimple": "StockSimple", "badge": "Badge", "permesso_fotocamera_necessario_per_scans": "Camera permission required to scan badge",
        "concedi_permesso": "Grant permission", "elaborazione": "Processing...", "inquadra_il_qr_code_del_badge": "Frame the badge QR code",
        "riepilogo_oggi": "Today's summary", "nuova_scansione": "New scan", "riprova_scansione": "Retry scan", "richiesta_manuale": "Manual request",
        "richiesta_inviata": "Request sent!", "un_amministratore_la_approverà_a_breve": "An administrator will approve it shortly.",
        "chiudi": "Close", "tipo_timbratura": "Clock-in type", "data_yyyymmdd": "Date (YYYY-MM-DD)", "ora_hhmm": "Time (HH:mm)",
        "motivo__problema": "Reason / Problem *", "annulla": "Cancel", "invia": "Send", "clienti": "Clients", "cerca_clienti": "Search clients…",
        "cantieri": "sites", "impossibile_connettersi": "Unable to connect", "riprova": "Retry", "elimina_materiale": "Delete material",
        "elimina": "Delete", "stato": "Status", "firmato_dal_cliente": "Signed by client", "registra_arrivo": "Record arrival",
        "accetta": "Accept", "rifiuta": "Reject", "usa_materiale": "Use material", "firma_e_chiudi": "Sign & Close",
        "scarica_rapporto_pdf": "Download PDF report", "ore_lavorate": "Hours worked", "prepara_furgone": "Prepare van",
        "dettagli": "Details", "descrizione": "Description", "cliente": "Client", "furgone_prenotato": "Reserved van",
        "materiali_utilizzati": "Materials used", "aggiungi": "Add", "nessun_materiale_registrato": "No materials recorded",
        "nessuna_foto": "No photo", "seleziona_furgone": "Select van", "periodo": "Period", "furgoni_disponibili": "Available vans",
        "nessun_furgone_disponibile": "No vans available", "conferma_e_accetta": "Confirm and accept",
        "non_risulta_un_mezzo_prenotato_per_quest": "No vehicle is reserved for this job. Picking is only possible from the assigned vehicle.",
        "preleva_da": "Pick from *", "prodotto": "Product *", "seleziona_prima_la_posizione": "Select position first",
        "nessun_prodotto_disponibile_in_questa_po": "No products available in this position", "quantità": "Quantity *",
        "note_opzionale": "Notes (optional)", "registra": "Record", "indirizzo": "Address", "aggiungi_media": "Add media",
        "vuoi_scattare_una_foto_o_registrare_un_v": "Do you want to take a photo or record a 5s video?", "nuovo_lavoro": "New job",
        "titolo": "Title *", "indirizzo_cantiere": "Site address", "data_pianificata_aaaammgg": "Planned date (YYYY-MM-DD)",
        "20260321": "2026-03-21", "priorità": "Priority", "crea_lavoro": "Create job", "lavori": "Jobs",
        "nessun_lavoro_trovato": "No jobs found", "firma_del_cliente": "Client signature",
        "il_cliente_firma_con_il_dito_per_conferm": "Client signs with finger to confirm job", "firma_qui": "Sign here",
        "furgone_caricato": "Van loaded!", "movimenti_creati_con_successo": "Movements created successfully",
        "nessun_furgone_configurato": "No van configured", "creazione_movimenti_in_corso": "Creating movements…",
        "cerca_prodotto": "Search product…", "qty": "Qty", "posizioni": "Locations", "prodotti": "products", "email": "Email",
        "password": "Password", "movimenti": "Movements", "nessun_movimento": "No movements", "nuovo_movimento": "New movement",
        "nessun_prodotto_disponibile": "No products available", "quantità_1": "Quantity", "prezzo_dacquisto___opzionale": "Purchase price (€) — optional",
        "registra_movimento": "Record movement", "nessuna": "— None —", "prodotti_1": "Products", "cerca_prodotti": "Search products…",
        "nessun_prodotto_trovato": "No products found", "giacenze_per_posizione": "Stock by location", "ordine_non_trovato": "Order not found",
        "invia_ordine": "Send order", "ricevi_merce": "Receive goods", "nessun_articolo": "No items", "lotto": "Batch",
        "aggiungi_articolo": "Add item", "id_prodotto": "Product ID *", "prezzo_unitario": "Unit price (€)", "traccia_lotto_e_scadenza": "Track batch & expiry",
        "richiederà_numero_lotto_e_data_di_scaden": "Will require batch number and expiry date upon receipt", "posizione_di_destinazione": "Destination location",
        "dati_lotti_obbligatori": "Batch data required", "numero_lotto": "Batch Number *", "es_lot2024001": "Ex. LOT-2024-001",
        "scadenza_aaaammgg": "Expiry (YYYY-MM-DD)", "20251231": "2025-12-31", "conferma": "Confirm", "ordini_acquisto": "Purchase orders",
        "nessun_ordine": "No orders", "rapporti_giornalieri": "Daily reports", "note": "Notes", "riepilogo_del_lavoro_di_oggi": "Today's work summary...",
        "invia_rapporto": "Send report", "elimina_rapporto": "Delete report", "ore_totali_lavorate": "Total hours worked:", "1fh": "%.1fh",
        "nessun_rapporto_ancora": "No reports yet", "scanner": "Scanner", "permesso_fotocamera_necessario": "Camera permission required",
        "fornitori": "Suppliers", "cerca_fornitori": "Search suppliers…", "nessun_fornitore": "No suppliers", "storico_sessioni": "Session history",
        "nessuna_sessione_registrata": "No sessions recorded", "sessione_in_corso": "Session in progress", "nessuna_sessione_attiva": "No active sessions",
        "elimina_sessione": "Delete session", "vuoi_eliminare_questa_voce": "Do you want to delete this entry?", "riepilogo_furgone": "Van summary",
        "posizione_furgone__magazzino": "Location (van / warehouse)", "seleziona_una_posizione_per_visualizzare": "Select a location to view summary.",
        "nessun_movimento_registrato_per_questa_d": "No movements recorded for this date.", "riepilogo_per_prodotto": "Summary by product",
        "dettaglio_movimenti": "Movement details"
    },
    'es': {
        "stocksimple": "StockSimple", "badge": "Badge", "permesso_fotocamera_necessario_per_scans": "Permiso de cámara necesario para escanear el badge",
        "concedi_permesso": "Conceder permiso", "elaborazione": "Procesando...", "inquadra_il_qr_code_del_badge": "Encuadre el código QR del badge",
        "riepilogo_oggi": "Resumen de hoy", "nuova_scansione": "Nuevo escaneo", "riprova_scansione": "Reintentar escaneo", "richiesta_manuale": "Solicitud manual",
        "richiesta_inviata": "¡Solicitud enviada!", "un_amministratore_la_approverà_a_breve": "Un administrador la aprobará pronto.",
        "chiudi": "Cerrar", "tipo_timbratura": "Tipo de fichaje", "data_yyyymmdd": "Fecha (YYYY-MM-DD)", "ora_hhmm": "Hora (HH:mm)",
        "motivo__problema": "Motivo / Problema *", "annulla": "Cancelar", "invia": "Enviar", "clienti": "Clientes", "cerca_clienti": "Buscar clientes…",
        "cantieri": "obras", "impossibile_connettersi": "No se puede conectar", "riprova": "Reintentar", "elimina_materiale": "Eliminar material",
        "elimina": "Eliminar", "stato": "Estado", "firmato_dal_cliente": "Firmado por el cliente", "registra_arrivo": "Registrar llegada",
        "accetta": "Aceptar", "rifiuta": "Rechazar", "usa_materiale": "Usar material", "firma_e_chiudi": "Firmar y cerrar",
        "scarica_rapporto_pdf": "Descargar informe PDF", "ore_lavorate": "Horas trabajadas", "prepara_furgone": "Preparar furgoneta",
        "dettagli": "Detalles", "descrizione": "Descripción", "cliente": "Cliente", "furgone_prenotato": "Furgoneta reservada",
        "materiali_utilizzati": "Materiales utilizados", "aggiungi": "Añadir", "nessun_materiale_registrato": "No hay materiales registrados",
        "nessuna_foto": "Sin foto", "seleziona_furgone": "Seleccionar furgoneta", "periodo": "Periodo", "furgoni_disponibili": "Furgonetas disponibles",
        "nessun_furgone_disponibile": "No hay furgonetas disponibles", "conferma_e_accetta": "Confirmar y aceptar",
        "non_risulta_un_mezzo_prenotato_per_quest": "No hay vehículo reservado para este trabajo. La recogida solo es posible desde el vehículo asignado.",
        "preleva_da": "Recoger de *", "prodotto": "Producto *", "seleziona_prima_la_posizione": "Seleccionar posición primero",
        "nessun_prodotto_disponibile_in_questa_po": "No hay productos disponibles en esta posición", "quantità": "Cantidad *",
        "note_opzionale": "Notas (opcional)", "registra": "Registrar", "indirizzo": "Dirección", "aggiungi_media": "Añadir multimedia",
        "vuoi_scattare_una_foto_o_registrare_un_v": "¿Quieres hacer una foto o grabar un vídeo de 5 segundos?", "nuovo_lavoro": "Nuevo trabajo",
        "titolo": "Título *", "indirizzo_cantiere": "Dirección de la obra", "data_pianificata_aaaammgg": "Fecha planificada (YYYY-MM-DD)",
        "20260321": "2026-03-21", "priorità": "Prioridad", "crea_lavoro": "Crear trabajo", "lavori": "Trabajos",
        "nessun_lavoro_trovato": "No se han encontrado trabajos", "firma_del_cliente": "Firma del cliente",
        "il_cliente_firma_con_il_dito_per_conferm": "El cliente firma con el dedo para confirmar el trabajo", "firma_qui": "Firme aquí",
        "furgone_caricato": "¡Furgoneta cargada!", "movimenti_creati_con_successo": "Movimientos creados con éxito",
        "nessun_furgone_configurato": "No hay furgoneta configurada", "creazione_movimenti_in_corso": "Creando movimientos...",
        "cerca_prodotto": "Buscar producto...", "qty": "Cant", "posizioni": "Ubicaciones", "prodotti": "productos", "email": "Correo electrónico",
        "password": "Contraseña", "movimenti": "Movimientos", "nessun_movimento": "Sin movimientos", "nuovo_movimento": "Nuevo movimiento",
        "nessun_prodotto_disponibile": "No hay productos disponibles", "quantità_1": "Cantidad", "prezzo_dacquisto___opzionale": "Precio de compra (€) — opcional",
        "registra_movimento": "Registrar movimiento", "nessuna": "— Ninguna —", "prodotti_1": "Productos", "cerca_prodotti": "Buscar productos...",
        "nessun_prodotto_trovato": "No se han encontrado productos", "giacenze_per_posizione": "Stock por ubicación", "ordine_non_trovato": "Pedido no encontrado",
        "invia_ordine": "Enviar pedido", "ricevi_merce": "Recibir mercancía", "nessun_articolo": "Sin artículos", "lotto": "Lote",
        "aggiungi_articolo": "Añadir artículo", "id_prodotto": "ID Producto *", "prezzo_unitario": "Precio unitario (€)", "traccia_lotto_e_scadenza": "Trazar lote y caducidad",
        "richiederà_numero_lotto_e_data_di_scaden": "Requerirá número de lote y fecha de vencimiento al recibirlo", "posizione_di_destinazione": "Ubicación de destino",
        "dati_lotti_obbligatori": "Datos de lote obligatorios", "numero_lotto": "Número de lote *", "es_lot2024001": "Ej. LOT-2024-001",
        "scadenza_aaaammgg": "Vencimiento (YYYY-MM-DD)", "20251231": "2025-12-31", "conferma": "Confirmar", "ordini_acquisto": "Pedidos de compra",
        "nessun_ordine": "Sin pedidos", "rapporti_giornalieri": "Informes diarios", "note": "Notas", "riepilogo_del_lavoro_di_oggi": "Resumen del trabajo de hoy...",
        "invia_rapporto": "Enviar informe", "elimina_rapporto": "Eliminar informe", "ore_totali_lavorate": "Total horas trabajadas:", "1fh": "%.1fh",
        "nessun_rapporto_ancora": "No hay informes todavía", "scanner": "Escáner", "permesso_fotocamera_necessario": "Permiso de cámara necesario",
        "fornitori": "Proveedores", "cerca_fornitori": "Buscar proveedores...", "nessun_fornitore": "Sin proveedores", "storico_sessioni": "Historial de sesiones",
        "nessuna_sessione_registrata": "No hay sesiones registradas", "sessione_in_corso": "Sesión en curso", "nessuna_sessione_attiva": "Sin sesiones activas",
        "elimina_sessione": "Eliminar sesión", "vuoi_eliminare_questa_voce": "¿Quieres eliminar esta entrada?", "riepilogo_furgone": "Resumen furgoneta",
        "posizione_furgone__magazzino": "Ubicación (furgoneta / almacén)", "seleziona_una_posizione_per_visualizzare": "Selecciona una ubicación para ver el resumen.",
        "nessun_movimento_registrato_per_questa_d": "No hay movimientos registrados para esta fecha.", "riepilogo_per_prodotto": "Resumen por producto",
        "dettaglio_movimenti": "Detalle de movimientos"
    },
    'fr': {
        "stocksimple": "StockSimple", "badge": "Badge", "permesso_fotocamera_necessario_per_scans": "Autorisation caméra requise pour scanner le badge",
        "concedi_permesso": "Accorder l'autorisation", "elaborazione": "Traitement...", "inquadra_il_qr_code_del_badge": "Cadrez le code QR du badge",
        "riepilogo_oggi": "Résumé d'aujourd'hui", "nuova_scansione": "Nouveau scan", "riprova_scansione": "Réessayer le scan", "richiesta_manuale": "Demande manuelle",
        "richiesta_inviata": "Demande envoyée !", "un_amministratore_la_approverà_a_breve": "Un administrateur l'approuvera sous peu.",
        "chiudi": "Fermer", "tipo_timbratura": "Type de pointage", "data_yyyymmdd": "Date (YYYY-MM-DD)", "ora_hhmm": "Heure (HH:mm)",
        "motivo__problema": "Raison / Problème *", "annulla": "Annuler", "invia": "Envoyer", "clienti": "Clients", "cerca_clienti": "Rechercher des clients…",
        "cantieri": "chantiers", "impossibile_connettersi": "Connexion impossible", "riprova": "Réessayer", "elimina_materiale": "Supprimer le matériel",
        "elimina": "Supprimer", "stato": "Statut", "firmato_dal_cliente": "Signé par le client", "registra_arrivo": "Enregistrer l'arrivée",
        "accetta": "Accepter", "rifiuta": "Refuser", "usa_materiale": "Utiliser du matériel", "firma_e_chiudi": "Signer et fermer",
        "scarica_rapporto_pdf": "Télécharger le rapport PDF", "ore_lavorate": "Heures travaillées", "prepara_furgone": "Préparer la camionnette",
        "dettagli": "Détails", "descrizione": "Description", "cliente": "Client", "furgone_prenotato": "Camionnette réservée",
        "materiali_utilizzati": "Matériaux utilisés", "aggiungi": "Ajouter", "nessun_materiale_registrato": "Aucun matériel enregistré",
        "nessuna_foto": "Pas de photo", "seleziona_furgone": "Sélectionner la camionnette", "periodo": "Période", "furgoni_disponibili": "Camionnettes disponibles",
        "nessun_furgone_disponibile": "Aucune camionnette disponible", "conferma_e_accetta": "Confirmer et accepter",
        "non_risulta_un_mezzo_prenotato_per_quest": "Aucun véhicule n'est réservé pour ce travail. Le prélèvement n'est possible qu'à partir du véhicule assigné.",
        "preleva_da": "Prélever de *", "prodotto": "Produit *", "seleziona_prima_la_posizione": "Sélectionner d'abord l'emplacement",
        "nessun_prodotto_disponibile_in_questa_po": "Aucun produit disponible dans cet emplacement", "quantità": "Quantité *",
        "note_opzionale": "Notes (facultatif)", "registra": "Enregistrer", "indirizzo": "Adresse", "aggiungi_media": "Ajouter un média",
        "vuoi_scattare_una_foto_o_registrare_un_v": "Voulez-vous prendre une photo ou enregistrer une vidéo de 5 secondes ?", "nuovo_lavoro": "Nouveau travail",
        "titolo": "Titre *", "indirizzo_cantiere": "Adresse du chantier", "data_pianificata_aaaammgg": "Date prévue (AAAA-MM-GG)",
        "20260321": "2026-03-21", "priorità": "Priorité", "crea_lavoro": "Créer un travail", "lavori": "Travaux",
        "nessun_lavoro_trovato": "Aucun travail trouvé", "firma_del_cliente": "Signature du client",
        "il_cliente_firma_con_il_dito_per_conferm": "Le client signe avec son doigt pour confirmer le travail", "firma_qui": "Signez ici",
        "furgone_caricato": "Camionnette chargée !", "movimenti_creati_con_successo": "Mouvements créés avec succès",
        "nessun_furgone_configurato": "Aucune camionnette configurée", "creazione_movimenti_in_corso": "Création des mouvements…",
        "cerca_prodotto": "Rechercher un produit…", "qty": "Qté", "posizioni": "Emplacements", "prodotti": "produits", "email": "E-mail",
        "password": "Mot de passe", "movimenti": "Mouvements", "nessun_movimento": "Pas de mouvements", "nuovo_movimento": "Nouveau mouvement",
        "nessun_prodotto_disponibile": "Aucun produit disponible", "quantità_1": "Quantité", "prezzo_dacquisto___opzionale": "Prix d'achat (€) — facultatif",
        "registra_movimento": "Enregistrer un mouvement", "nessuna": "— Aucun —", "prodotti_1": "Produits", "cerca_prodotti": "Rechercher des produits…",
        "nessun_prodotto_trovato": "Aucun produit trouvé", "giacenze_per_posizione": "Stock par emplacement", "ordine_non_trovato": "Commande non trouvée",
        "invia_ordine": "Envoyer la commande", "ricevi_merce": "Recevoir la marchandise", "nessun_articolo": "Aucun article", "lotto": "Lot",
        "aggiungi_articolo": "Ajouter un article", "id_prodotto": "ID Produit *", "prezzo_unitario": "Prix unitaire (€)", "traccia_lotto_e_scadenza": "Suivre lot & péremption",
        "richiederà_numero_lotto_e_data_di_scaden": "Nécessitera le numéro de lot et la date de péremption à la réception", "posizione_di_destinazione": "Emplacement de destination",
        "dati_lotti_obbligatori": "Données de lot obligatoires", "numero_lotto": "Numéro de lot *", "es_lot2024001": "Ex. LOT-2024-001",
        "scadenza_aaaammgg": "Péremption (AAAA-MM-GG)", "20251231": "2025-12-31", "conferma": "Confirmer", "ordini_acquisto": "Commandes d'achat",
        "nessun_ordine": "Aucune commande", "rapporti_giornalieri": "Rapports journaliers", "note": "Notes", "riepilogo_del_lavoro_di_oggi": "Résumé du travail d'aujourd'hui...",
        "invia_rapporto": "Envoyer le rapport", "elimina_rapporto": "Supprimer le rapport", "ore_totali_lavorate": "Total des heures travaillées :", "1fh": "%.1fh",
        "nessun_rapporto_ancora": "Aucun rapport pour le moment", "scanner": "Scanner", "permesso_fotocamera_necessario": "Autorisation caméra requise",
        "fornitori": "Fournisseurs", "cerca_fornitori": "Rechercher des fournisseurs…", "nessun_fornitore": "Aucun fournisseur", "storico_sessioni": "Historique des sessions",
        "nessuna_sessione_registrata": "Aucune session enregistrée", "sessione_in_corso": "Session en cours", "nessuna_sessione_attiva": "Aucune session active",
        "elimina_sessione": "Supprimer la session", "vuoi_eliminare_questa_voce": "Voulez-vous supprimer cette entrée ?", "riepilogo_furgone": "Résumé de la camionnette",
        "posizione_furgone__magazzino": "Emplacement (camionnette / entrepôt)", "seleziona_una_posizione_per_visualizzare": "Sélectionnez un emplacement pour afficher le résumé.",
        "nessun_movimento_registrato_per_questa_d": "Aucun mouvement enregistré pour cette date.", "riepilogo_per_prodotto": "Résumé par produit",
        "dettaglio_movimenti": "Détails des mouvements"
    },
    'ja': {
        "stocksimple": "StockSimple", "badge": "バッジ", "permesso_fotocamera_necessario_per_scans": "バッジをスキャンするにはカメラの許可が必要です",
        "concedi_permesso": "許可を与える", "elaborazione": "処理中...", "inquadra_il_qr_code_del_badge": "バッジのQRコードを枠内に収めてください",
        "riepilogo_oggi": "今日のまとめ", "nuova_scansione": "新規スキャン", "riprova_scansione": "スキャンを再試行", "richiesta_manuale": "手動リクエスト",
        "richiesta_inviata": "リクエストを送信しました！", "un_amministratore_la_approverà_a_breve": "管理者がまもなく承認します。",
        "chiudi": "閉じる", "tipo_timbratura": "打刻タイプ", "data_yyyymmdd": "日付 (YYYY-MM-DD)", "ora_hhmm": "時刻 (HH:mm)",
        "motivo__problema": "理由 / 問題 *", "annulla": "キャンセル", "invia": "送信", "clienti": "顧客", "cerca_clienti": "顧客を検索…",
        "cantieri": "現場", "impossibile_connettersi": "接続できません", "riprova": "再試行", "elimina_materiale": "材料を削除",
        "elimina": "削除", "stato": "ステータス", "firmato_dal_cliente": "顧客が署名済み", "registra_arrivo": "到着を記録",
        "accetta": "承諾", "rifiuta": "拒否", "usa_materiale": "材料を使用", "firma_e_chiudi": "署名して終了",
        "scarica_rapporto_pdf": "PDFレポートをダウンロード", "ore_lavorate": "労働時間", "prepara_furgone": "車両の準備",
        "dettagli": "詳細", "descrizione": "説明", "cliente": "顧客", "furgone_prenotato": "予約済み車両",
        "materiali_utilizzati": "使用材料", "aggiungi": "追加", "nessun_materiale_registrato": "材料が記録されていません",
        "nessuna_foto": "写真なし", "seleziona_furgone": "車両を選択", "periodo": "期間", "furgoni_disponibili": "利用可能な車両",
        "nessun_furgone_disponibile": "利用可能な車両はありません", "conferma_e_accetta": "確認して承諾",
        "non_risulta_un_mezzo_prenotato_per_quest": "この作業用の予約車両はありません。割り当てられた車両からのみ取り出し可能です。",
        "preleva_da": "取り出し元 *", "prodotto": "製品 *", "seleziona_prima_la_posizione": "先に場所を選択してください",
        "nessun_prodotto_disponibile_in_questa_po": "この場所には利用可能な製品がありません", "quantità": "数量 *",
        "note_opzionale": "備考 (任意)", "registra": "記録", "indirizzo": "住所", "aggiungi_media": "メディアを追加",
        "vuoi_scattare_una_foto_o_registrare_un_v": "写真を撮るか、5秒間の動画を録画しますか？", "nuovo_lavoro": "新規作業",
        "titolo": "タイトル *", "indirizzo_cantiere": "現場住所", "data_pianificata_aaaammgg": "予定日 (YYYY-MM-DD)",
        "20260321": "2026-03-21", "priorità": "優先度", "crea_lavoro": "作業を作成", "lavori": "作業",
        "nessun_lavoro_trovato": "作業が見つかりません", "firma_del_cliente": "顧客署名",
        "il_cliente_firma_con_il_dito_per_conferm": "顧客が指で署名して作業を確認します", "firma_qui": "ここに署名",
        "furgone_caricato": "梱包完了！", "movimenti_creati_con_successo": "動きが正常に作成されました",
        "nessun_furgone_configurato": "車両が設定されていません", "creazione_movimenti_in_corso": "動きを作成中…",
        "cerca_prodotto": "製品を検索…", "qty": "数量", "posizioni": "場所", "prodotti": "製品", "email": "メール",
        "password": "パスワード", "movimenti": "移動", "nessun_movimento": "移動なし", "nuovo_movimento": "新規移動",
        "nessun_prodotto_disponibile": "利用可能な製品なし", "quantità_1": "数量", "prezzo_dacquisto___opzionale": "購入価格 (€) — 任意",
        "registra_movimento": "移動を記録", "nessuna": "— なし —", "prodotti_1": "製品", "cerca_prodotti": "製品を検索…",
        "nessun_prodotto_trovato": "製品が見つかりません", "giacenze_per_posizione": "場所別在庫", "ordine_non_trovato": "注文が見つかりません",
        "invia_ordine": "注文を送信", "ricevi_merce": "商品を受け取る", "nessun_articolo": "商品なし", "lotto": "ロット",
        "aggiungi_articolo": "商品を追加", "id_prodotto": "製品ID *", "prezzo_unitario": "単価 (€)", "traccia_lotto_e_scadenza": "ロットと有効期限を追跡",
        "richiederà_numero_lotto_e_data_di_scaden": "受領時にロット番号と有効期限が必要になります", "posizione_di_destinazione": "配送先住所",
        "dati_lotti_obbligatori": "ロットデータは必須です", "numero_lotto": "ロット番号 *", "es_lot2024001": "例: LOT-2024-001",
        "scadenza_aaaammgg": "有効期限 (YYYY-MM-DD)", "20251231": "2025-12-31", "conferma": "確認", "ordini_acquisto": "注文書",
        "nessun_ordine": "注文なし", "rapporti_giornalieri": "日報", "note": "備考", "riepilogo_del_lavoro_di_oggi": "今日の作業のまとめ...",
        "invia_rapporto": "レポートを送信", "elimina_rapporto": "レポートを削除", "ore_totali_lavorate": "合計労働時間:", "1fh": "%.1fh",
        "nessun_rapporto_ancora": "まだレポートはありません", "scanner": "スキャナー", "permesso_fotocamera_necessario": "カメラの許可が必要です",
        "fornitori": "仕入先", "cerca_fornitori": "仕入先を検索…", "nessun_fornitore": "仕入先なし", "storico_sessioni": "セッション履歴",
        "nessuna_sessione_registrata": "セッションが記録されていません", "sessione_in_corso": "セッション中", "nessuna_sessione_attiva": "アクティブなセッションなし",
        "elimina_sessione": "セッションを削除", "vuoi_eliminare_questa_voce": "このエントリを削除しますか？", "riepilogo_furgone": "車両サマリー",
        "posizione_furgone__magazzino": "場所 (車両 / 倉庫)", "seleziona_una_posizione_per_visualizzare": "サマリーを表示する場所を選択してください。",
        "nessun_movimento_registrato_per_questa_d": "この日付の移動は記録されていません。", "riepilogo_per_prodotto": "製品別サマリー",
        "dettaglio_movimenti": "移動の詳細"
    },
    'ru': {
        "stocksimple": "StockSimple", "badge": "Бейдж", "permesso_fotocamera_necessario_per_scans": "Разрешение на камеру необходимо для сканирования бейджа",
        "concedi_permesso": "Предоставить разрешение", "elaborazione": "Обработка...", "inquadra_il_qr_code_del_badge": "Наведите камеру на QR-код бейджа",
        "riepilogo_oggi": "Итоги сегодня", "nuova_scansione": "Новое сканирование", "riprova_scansione": "Повторить сканирование", "richiesta_manuale": "Запрос вручную",
        "richiesta_inviata": "Запрос отправлен!", "un_amministratore_la_approverà_a_breve": "Администратор скоро его одобрит.",
        "chiudi": "Закрыть", "tipo_timbratura": "Тип отметки", "data_yyyymmdd": "Дата (YYYY-MM-DD)", "ora_hhmm": "Время (HH:mm)",
        "motivo__problema": "Причина / Проблема *", "annulla": "Отмена", "invia": "Отправить", "clienti": "Клиенты", "cerca_clienti": "Поиск клиентов…",
        "cantieri": "площадки", "impossibile_connettersi": "Не удалось подключиться", "riprova": "Повторить", "elimina_materiale": "Удалить материал",
        "elimina": "Удалить", "stato": "Статус", "firmato_dal_cliente": "Подписано клиентом", "registra_arrivo": "Зарегистрировать приезд",
        "accetta": "Принять", "rifiuta": "Отклонить", "usa_materiale": "Использовать материал", "firma_e_chiudi": "Подписать и закрыть",
        "scarica_rapporto_pdf": "Скачать отчет PDF", "ore_lavorate": "Отработано часов", "prepara_furgone": "Подготовить фургон",
        "dettagli": "Детали", "descrizione": "Описание", "cliente": "Клиент", "furgone_prenotato": "Зарезервированный фургон",
        "materiali_utilizzati": "Использованные материалы", "aggiungi": "Добавить", "nessun_materiale_registrato": "Материалы не зарегистрированы",
        "nessuna_foto": "Нет фото", "seleziona_furgone": "Выбрать фургон", "periodo": "Период", "furgoni_disponibili": "Доступные фургоны",
        "nessun_furgone_disponibile": "Нет доступных фургонов", "conferma_e_accetta": "Подтвердить и принять",
        "non_risulta_un_mezzo_prenotato_per_quest": "Для этой работы не зарезервировано транспортное средство. Выдача возможна только из назначенного средства.",
        "preleva_da": "Забрать из *", "prodotto": "Продукт *", "seleziona_prima_la_posizione": "Сначала выберите расположение",
        "nessun_prodotto_disponibile_in_questa_po": "В этом расположении нет доступных продуктов", "quantità": "Количество *",
        "note_opzionale": "Заметки (необязательно)", "registra": "Зарегистрировать", "indirizzo": "Адрес", "aggiungi_media": "Добавить медиа",
        "vuoi_scattare_una_foto_o_registrare_un_v": "Хотите сделать фото или записать 5-секундное видео?", "nuovo_lavoro": "Новая работа",
        "titolo": "Заголовок *", "indirizzo_cantiere": "Адрес площадки", "data_pianificata_aaaammgg": "Планируемая дата (YYYY-MM-DD)",
        "20260321": "2026-03-21", "priorità": "Приоритет", "crea_lavoro": "Создать работу", "lavori": "Работы",
        "nessun_lavoro_trovato": "Работы не найдены", "firma_del_cliente": "Подпись клиента",
        "il_cliente_firma_con_il_dito_per_conferm": "Клиент подписывает пальцем для подтверждения работы", "firma_qui": "Подпись здесь",
        "furgone_caricato": "Фургон загружен!", "movimenti_creati_con_successo": "Движения созданы успешно",
        "nessun_furgone_configurato": "Фургоны не настроены", "creazione_movimenti_in_corso": "Создание движений…",
        "cerca_prodotto": "Поиск продукта…", "qty": "Кол-во", "posizioni": "Расположения", "prodotti": "продукты", "email": "Эл. почта",
        "password": "Пароль", "movimenti": "Движения", "nessun_movimento": "Нет движений", "nuovo_movimento": "Новое движение",
        "nessun_prodotto_disponibile": "Нет доступных продуктов", "quantità_1": "Количество", "prezzo_dacquisto___opzionale": "Цена покупки (€) — опционально",
        "registra_movimento": "Зарегистрировать движение", "nessuna": "— Нет —", "prodotti_1": "Продукты", "cerca_prodotti": "Поиск продуктов…",
        "nessun_prodotto_trovato": "Продукты не найдены", "giacenze_per_posizione": "Запасы по расположениям", "ordine_non_trovato": "Заказ не найден",
        "invia_ordine": "Отправить заказ", "ricevi_merce": "Получить товар", "nessun_articolo": "Нет товаров", "lotto": "Партия",
        "aggiungi_articolo": "Добавить товар", "id_prodotto": "ID Продукта *", "prezzo_unitario": "Цена за единицу (€)", "traccia_lotto_e_scadenza": "Отслеживать партию и срок",
        "richiederà_numero_lotto_e_data_di_scaden": "При получении потребуется номер партии и срок годности", "posizione_di_destinazione": "Место назначения",
        "dati_lotti_obbligatori": "Данные партии обязательны", "numero_lotto": "Номер партии *", "es_lot2024001": "Напр. LOT-2024-001",
        "scadenza_aaaammgg": "Срок годности (YYYY-MM-DD)", "20251231": "2025-12-31", "conferma": "Подтвердить", "ordini_acquisto": "Заказы на покупку",
        "nessun_ordine": "Нет заказов", "rapporti_giornalieri": "Ежедневные отчеты", "note": "Заметки", "riepilogo_del_lavoro_di_oggi": "Итоги работы за сегодня...",
        "invia_rapporto": "Отправить отчет", "elimina_rapporto": "Удалить отчет", "ore_totali_lavorate": "Всего отработано часов:", "1fh": "%.1fh",
        "nessun_rapporto_ancora": "Отчетов пока нет", "scanner": "Сканер", "permesso_fotocamera_necessario": "Требуется разрешение на камеру",
        "fornitori": "Поставщики", "cerca_fornitori": "Поиск поставщиков…", "nessun_fornitore": "Нет поставщиков", "storico_sessioni": "История сессий",
        "nessuna_sessione_registrata": "Сессии не зарегистрированы", "sessione_in_corso": "Сессия в процессе", "nessuna_sessione_attiva": "Активных сессий нет",
        "elimina_sessione": "Удалить сессию", "vuoi_eliminare_questa_voce": "Вы хотите удалить эту запись?", "riepilogo_furgone": "Итоги по фургону",
        "posizione_furgone__magazzino": "Расположение (фургон / склад)", "seleziona_una_posizione_per_visualizzare": "Выберите расположение, чтобы просмотреть итоги.",
        "nessun_movimento_registrato_per_questa_d": "На эту дату движений не зарегистрировано.", "riepilogo_per_prodotto": "Итоги по продукту",
        "dettaglio_movimenti": "Детали движений"
    },
    'zh': {
        "stocksimple": "StockSimple", "badge": "徽章", "permesso_fotocamera_necessario_per_scans": "扫描徽章需要相机权限",
        "concedi_permesso": "授予权限", "elaborazione": "处理中...", "inquadra_il_qr_code_del_badge": "请在框内扫描徽章二维码",
        "riepilogo_oggi": "今日摘要", "nuova_scansione": "新扫描", "riprova_scansione": "重试扫描", "richiesta_manuale": "手动请求",
        "richiesta_inviata": "请求已发送！", "un_amministratore_la_approverà_a_breve": "管理员很快就会批准它。",
        "chiudi": "关闭", "tipo_timbratura": "打卡类型", "data_yyyymmdd": "日期 (YYYY-MM-DD)", "ora_hhmm": "时间 (HH:mm)",
        "motivo__problema": "原因/问题 *", "annulla": "取消", "invia": "发送", "clienti": "客户", "cerca_clienti": "搜索客户...",
        "cantieri": "工期", "impossibile_connettersi": "无法连接", "riprova": "重试", "elimina_materiale": "删除材料",
        "elimina": "删除", "stato": "状态", "firmato_dal_cliente": "客户已签署", "registra_arrivo": "记录到达",
        "accetta": "接受", "rifiuta": "拒绝", "usa_materiale": "使用材料", "firma_e_chiudi": "签署并关闭",
        "scarica_rapporto_pdf": "下载 PDF 报告", "ore_lavorate": "工作时间", "prepara_furgone": "准备货车",
        "dettagli": "详细信息", "descrizione": "描述", "cliente": "客户", "furgone_prenotato": "预订的货车",
        "materiali_utilizzati": "使用的材料", "aggiungi": "添加", "nessun_materiale_registrato": "没有记录的材料",
        "nessuna_foto": "没有照片", "seleziona_furgone": "选择货车", "periodo": "时期", "furgoni_disponibili": "可用货车",
        "nessun_furgone_disponibile": "没有可用的货车", "conferma_e_accetta": "确认并接受",
        "non_risulta_un_mezzo_prenotato_per_quest": "没有为此项工作预订车辆。只能从分配的车辆中取货。",
        "preleva_da": "取货自 *", "prodotto": "产品 *", "seleziona_prima_la_posizione": "请先选择位置",
        "nessun_prodotto_disponibile_in_questa_po": "此位置没有可用产品", "quantità": "数量 *",
        "note_opzionale": "备注（可选）", "registra": "记录", "indirizzo": "地址", "aggiungi_media": "添加媒体",
        "vuoi_scattare_una_foto_o_registrare_un_v": "您要拍照还是录制 5 秒视频？", "nuovo_lavoro": "新工作",
        "titolo": "标题 *", "indirizzo_cantiere": "施工现场地址", "data_pianificata_aaaammgg": "计划日期 (YYYY-MM-DD)",
        "20260321": "2026-03-21", "priorità": "优先级", "crea_lavoro": "创建工作", "lavori": "工作",
        "nessun_lavoro_trovato": "未发现工作", "firma_del_cliente": "客户签名",
        "il_cliente_firma_con_il_dito_per_conferm": "客户用手指签名确认工作", "firma_qui": "在此签名",
        "furgone_caricato": "货车已装载！", "movimenti_creati_con_successo": "动向已成功创建",
        "nessun_furgone_configurato": "未配置货车", "creazione_movimenti_in_corso": "正在创建动向...",
        "cerca_prodotto": "搜索产品...", "qty": "数量", "posizioni": "位置", "prodotti": "产品", "email": "电子邮件",
        "password": "密码", "movimenti": "动向", "nessun_movimento": "没有动向", "nuovo_movimento": "新动向",
        "nessun_prodotto_disponibile": "没有可用产品", "quantità_1": "数量", "prezzo_dacquisto___opzionale": "购买价格 (€) — 可选",
        "registra_movimento": "记录动向", "nessuna": "— 无 —", "prodotti_1": "产品", "cerca_prodotti": "搜索产品...",
        "nessun_prodotto_trovato": "未发现产品", "giacenze_per_posizione": "按位置库存", "ordine_non_trovato": "未发现订单",
        "invia_ordine": "发送订单", "ricevi_merce": "接收货物", "nessun_articolo": "没有项目", "lotto": "批次",
        "aggiungi_articolo": "添加项目", "id_prodotto": "产品 ID *", "prezzo_unitario": "单价 (€)", "traccia_lotto_e_scadenza": "跟踪批次和有效期",
        "richiederà_numero_lotto_e_data_di_scaden": "收货时需要批次号和效期", "posizione_di_destinazione": "目的地位置",
        "dati_lotti_obbligatori": "批次数据是必填项", "numero_lotto": "批次号 *", "es_lot2024001": "例：LOT-2024-001",
        "scadenza_aaaammgg": "效期 (YYYY-MM-DD)", "20251231": "2025-12-31", "conferma": "确认", "ordini_acquisto": "采购订单",
        "nessun_ordine": "没有订单", "rapporti_giornalieri": "每日报告", "note": "备注", "riepilogo_del_lavoro_di_oggi": "今日工作摘要...",
        "invia_rapporto": "发送报告", "elimina_rapporto": "删除报告", "ore_totali_lavorate": "总工作时间：", "1fh": "%.1fh",
        "nessun_rapporto_ancora": "尚无报告", "scanner": "扫描仪", "permesso_fotocamera_necessario": "需要相机权限",
        "fornitori": "供应商", "cerca_fornitori": "搜索供应商...", "nessun_fornitore": "没有供应商", "storico_sessioni": "会话历史记录",
        "nessuna_sessione_registrata": "没有记录的会话", "sessione_in_corso": "会话正在进行中", "nessuna_sessione_attiva": "没有正在进行的会话",
        "elimina_sessione": "删除会话", "vuoi_eliminare_questa_voce": "您要删除此项吗？", "riepilogo_furgone": "货车摘要",
        "posizione_furgone__magazzino": "位置（货车/仓库）", "seleziona_una_posizione_per_visualizzare": "选择位置以查看摘要。",
        "nessun_movimento_registrato_per_questa_d": "此日期没有记录的动向。", "riepilogo_per_prodotto": "按产品摘要",
        "dettaglio_movimenti": "动向详细信息"
    }
}

# Add default Italian
translations['it'] = it_strings

# Escape XML special characters
def escape_xml(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace("'", "\\'").replace('"', '\\"')

# Base directory for resources
base_res_dir = 'ANDROID/app/src/main/res'

for lang, data in translations.items():
    # Folder name: 'values' for 'it' (default) or 'values-XX' for others
    if lang == 'it':
        folder = 'values'
    else:
        folder = f'values-{lang}'
    
    full_path = os.path.join(base_res_dir, folder)
    os.makedirs(full_path, exist_ok=True)
    
    # Write strings.xml
    file_path = os.path.join(full_path, 'strings.xml')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n')
        # Ensure app_name exists
        if 'stocksimple' not in data:
            f.write('    <string name="app_name">StockSimple</string>\n')
        else:
            # We rename 'stocksimple' key to 'app_name' for standard convention if it's "StockSimple"
            pass
            
        for key, val in data.items():
            # If key is 'stocksimple', we might want to name it 'app_name' or keep it.
            # Standard projects use app_name. I'll keep both for safety since I refactored to R.string.stocksimple
            xml_val = escape_xml(val)
            f.write(f'    <string name="{key}">{xml_val}</string>\n')
            if key == 'stocksimple' and 'app_name' not in data:
                 f.write(f'    <string name="app_name">{xml_val}</string>\n')

        f.write('</resources>\n')

print("Android strings.xml files generated successfully for all languages.")
