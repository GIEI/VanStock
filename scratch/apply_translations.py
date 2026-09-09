import json
import os

languages = {
    'en': {
        'JOB_DETAIL': {
            'COMPLETED_AT': 'Completed at',
            'SIGN_AND_CLOSE': 'Sign and Close',
            'DOWNLOAD_REPORT': 'Download PDF Report',
            'SIGNED_AT': 'Signed at'
        },
        'FIX_MAGAZZINO': {
            'TITLE': 'Fix Inventory',
            'SUBTITLE': 'Correct inventory for unassigned products',
            'DESCRIPTION': 'This page shows products where total stock exceeds the sum of location stocks. Reassign them.',
            'EMPTY': 'Great! All products are correctly assigned.',
            'PRODUCT': 'Product',
            'TOTAL_QTY': 'Total Qty',
            'ASSIGNED_QTY': 'Assigned Qty',
            'UNASSIGNED_QTY': 'To assign',
            'SELECT_LOCATION': 'Select destination location',
            'FIX_BTN': 'Assign to {{location}}',
            'FIX_SELECTED': 'Assign selected',
            'SUCCESS': 'Stock reallocated successfully',
            'ERROR': 'Error during reallocation'
        },
        'ADMIN': {
            'ERROR_LOGS': 'Error Logs',
            'LOGS_SUBTITLE': 'System error monitoring',
            'REFRESH': 'Refresh',
            'CLEAR_LOGS': 'Clear Logs',
            'CONFIRM_CLEAR': 'Are you sure you want to clear all logs? This action cannot be undone.',
            'NO_LOGS': 'No errors registered.',
            'CLEARED_SUCCESS': 'Logs cleared successfully',
            'CLEAR_ERROR': 'Error clearing logs'
        },
        'BADGE': {
            'TITLE': 'Company Badge',
            'SUBTITLE': 'Show this QR Code at the entrance',
            'REFRESH_IN': 'Refresh in',
            'GENERATING': 'Generating QR',
            'HOW_TO_TITLE': 'How to clock in',
            'STEP_1': 'Open the app on your Android smartphone',
            'STEP_2': 'Select \"Badge\" from the menu',
            'STEP_3': 'Scan the QR Code above',
            'SCANNER_TITLE': 'Scan Badge',
            'START_SCAN': 'Scan QR Code',
            'CAMERA_ERROR': 'Cannot access camera',
            'PROBLEMS_QR': 'Problems with QR? Request manual entry',
            'REQUEST_TITLE': 'Manual Override Request',
            'REQUEST_HINT': 'Fill out this form if you cannot scan the QR. Administrative approval required.',
            'REQUEST_TYPE': 'Punch Type',
            'REQUEST_DATE': 'Date',
            'REQUEST_TIME': 'Time',
            'REQUEST_REASON': 'Reason / Problem',
            'STATE_MORNING_IN': 'Morning In',
            'STATE_MORNING_OUT': 'Morning Out',
            'STATE_AFTERNOON_IN': 'Afternoon In',
            'STATE_AFTERNOON_OUT': 'Afternoon Out',
            'TIMESHEET_TITLE': 'Timesheet',
            'TAB_RECORDS': 'Records',
            'TAB_REQUESTS': 'Requests',
            'STATUS_PENDING': 'Pending',
            'STATUS_APPROVED': 'Approved',
            'STATUS_REJECTED': 'Rejected'
        },
        'REPORTS': {
            'TOTAL_HOURS': 'Total hours worked:',
            'COMPLETED_JOBS': 'Completed jobs',
            'NO_COMPLETED_JOBS': 'No completed jobs',
            'OTHER_MOVEMENTS': 'Other movements'
        },
        'SCANNER': {
            'START_SCAN': 'Start Scanner',
            'STOP_SCAN': 'Stop Scanner',
            'LOAD': 'Load in',
            'UNLOAD': 'Unload out'
        },
        'VAN_REPORT': {
            'PRINT_PDF': 'Print / PDF',
            'GENERATED_ON': 'Generated on'
        }
    },
    'es': {
        'JOB_DETAIL': {
            'COMPLETED_AT': 'Concluido a las',
            'SIGN_AND_CLOSE': 'Firmar y Cerrar',
            'DOWNLOAD_REPORT': 'Descargar Informe PDF',
            'SIGNED_AT': 'Firmado a las'
        },
        'FIX_MAGAZZINO': {
            'TITLE': 'Corregir Inventario',
            'SUBTITLE': 'Corregir inventario de productos no asignados',
            'DESCRIPTION': 'Muestra productos con stock real superior a la suma del de los almacenes.',
            'EMPTY': '¡Genial! Todos los productos están asignados.',
            'PRODUCT': 'Producto',
            'TOTAL_QTY': 'Ctd Total',
            'ASSIGNED_QTY': 'Ctd Asignada',
            'UNASSIGNED_QTY': 'Por asignar',
            'SELECT_LOCATION': 'Seleccionar ubicación',
            'FIX_BTN': 'Asignar a {{location}}',
            'FIX_SELECTED': 'Asignar seleccionados',
            'SUCCESS': 'Reubicado con éxito',
            'ERROR': 'Error en la reubicación'
        },
        'ADMIN': {
            'ERROR_LOGS': 'Logs de Errores',
            'LOGS_SUBTITLE': 'Monitoreo de sistema',
            'REFRESH': 'Actualizar',
            'CLEAR_LOGS': 'Limpiar Logs',
            'CONFIRM_CLEAR': '¿Seguro que quieres borrar todos los logs?',
            'NO_LOGS': 'Sin errores.',
            'CLEARED_SUCCESS': 'Logs limpiados con éxito',
            'CLEAR_ERROR': 'Error limpiando logs'
        },
        'BADGE': {
            'TITLE': 'Credencial de Empresa',
            'SUBTITLE': 'Muestra este QR en la entrada',
            'REFRESH_IN': 'Actualiza en',
            'GENERATING': 'Generando QR',
            'HOW_TO_TITLE': 'Cómo fichar',
            'STEP_1': 'Abre la app en Android',
            'STEP_2': 'Selecciona \"Credencial\" en el menú',
            'STEP_3': 'Escanea el código QR',
            'SCANNER_TITLE': 'Escanear Credencial',
            'START_SCAN': 'Escanear QR',
            'CAMERA_ERROR': 'Sin acceso a cámara',
            'PROBLEMS_QR': '¿Problemas? Petición manual',
            'REQUEST_TITLE': 'Solicitud Manual',
            'REQUEST_HINT': 'Rellena esto si no puedes escanear el QR.',
            'REQUEST_TYPE': 'Tipo de Fichaje',
            'REQUEST_DATE': 'Fecha',
            'REQUEST_TIME': 'Hora',
            'REQUEST_REASON': 'Razón / Problema',
            'STATE_MORNING_IN': 'Entrada Mañana',
            'STATE_MORNING_OUT': 'Salida Mañana',
            'STATE_AFTERNOON_IN': 'Entrada Tarde',
            'STATE_AFTERNOON_OUT': 'Salida Tarde',
            'TIMESHEET_TITLE': 'Control Horario',
            'TAB_RECORDS': 'Registro',
            'TAB_REQUESTS': 'Peticiones',
            'STATUS_PENDING': 'Pendiente',
            'STATUS_APPROVED': 'Aprobado',
            'STATUS_REJECTED': 'Rechazado'
        },
        'REPORTS': {
            'TOTAL_HOURS': 'Horas totales trabajadas:',
            'COMPLETED_JOBS': 'Trabajos completados',
            'NO_COMPLETED_JOBS': 'Ningún trabajo completado',
            'OTHER_MOVEMENTS': 'Otros movimientos'
        },
        'SCANNER': {
            'START_SCAN': 'Iniciar Escáner',
            'STOP_SCAN': 'Detener',
            'LOAD': 'Carga',
            'UNLOAD': 'Descarga'
        },
        'VAN_REPORT': {
            'PRINT_PDF': 'Imprimir / PDF',
            'GENERATED_ON': 'Generado el'
        }
    },
    'fr': {
        'JOB_DETAIL': {
            'COMPLETED_AT': 'Terminé à',
            'SIGN_AND_CLOSE': 'Signer et fermer',
            'DOWNLOAD_REPORT': 'Télécharger Rapport PDF',
            'SIGNED_AT': 'Signé à'
        },
        'FIX_MAGAZZINO': {
            'TITLE': 'Réparer Inventaire',
            'SUBTITLE': 'Corriger l\'inventaire non assigné',
            'DESCRIPTION': 'Produits dont total dépasse la somme.',
            'EMPTY': 'Parfait !',
            'PRODUCT': 'Produit',
            'TOTAL_QTY': 'Qté Totale',
            'ASSIGNED_QTY': 'Qté Assignée',
            'UNASSIGNED_QTY': 'A assigner',
            'SELECT_LOCATION': 'Sélectionner l\'emplacement',
            'FIX_BTN': 'Assigner à {{location}}',
            'FIX_SELECTED': 'Assigner sélectionnés',
            'SUCCESS': 'Réalloué avec succès',
            'ERROR': 'Erreur lors de la réallocation'
        },
        'ADMIN': {
            'ERROR_LOGS': 'Journaux d\'erreurs',
            'LOGS_SUBTITLE': 'Surveillance du système',
            'REFRESH': 'Actualiser',
            'CLEAR_LOGS': 'Effacer Journaux',
            'CONFIRM_CLEAR': 'Voulez-vous vraiment effacer ?',
            'NO_LOGS': 'Aucune erreur.',
            'CLEARED_SUCCESS': 'Journaux effacés',
            'CLEAR_ERROR': 'Erreur'
        },
        'BADGE': {
            'TITLE': 'Badge d\'entreprise',
            'SUBTITLE': 'Affichez ce QR Code',
            'REFRESH_IN': 'Actualisation dans',
            'GENERATING': 'Génération QR',
            'HOW_TO_TITLE': 'Comment pointer',
            'STEP_1': 'Ouvrez l\'app Android',
            'STEP_2': 'Sélectionnez \"Badge\"',
            'STEP_3': 'Scannez le QR',
            'SCANNER_TITLE': 'Scanner le Badge',
            'START_SCAN': 'Scanner QR',
            'CAMERA_ERROR': 'Caméra inaccessible',
            'PROBLEMS_QR': 'Problème de QR ?',
            'REQUEST_TITLE': 'Demande Manuelle',
            'REQUEST_HINT': 'Remplissez ceci en cas de problème.',
            'REQUEST_TYPE': 'Type de Pointage',
            'REQUEST_DATE': 'Date',
            'REQUEST_TIME': 'Heure',
            'REQUEST_REASON': 'Raison / Problème',
            'STATE_MORNING_IN': 'Entrée Matin',
            'STATE_MORNING_OUT': 'Sortie Matin',
            'STATE_AFTERNOON_IN': 'Entrée Soir',
            'STATE_AFTERNOON_OUT': 'Sortie Soir',
            'TIMESHEET_TITLE': 'Gestion du temps',
            'TAB_RECORDS': 'Registres',
            'TAB_REQUESTS': 'Demandes',
            'STATUS_PENDING': 'En attente',
            'STATUS_APPROVED': 'Approuvé',
            'STATUS_REJECTED': 'Rejeté'
        },
        'REPORTS': {
            'TOTAL_HOURS': 'Heures totales travaillées :',
            'COMPLETED_JOBS': 'Travaux terminés',
            'NO_COMPLETED_JOBS': 'Aucun travail terminé',
            'OTHER_MOVEMENTS': 'Autres mouvements'
        },
        'SCANNER': {
            'START_SCAN': 'Démarrer Scanner',
            'STOP_SCAN': 'Arrêter',
            'LOAD': 'Charger',
            'UNLOAD': 'Décharger'
        },
        'VAN_REPORT': {
            'PRINT_PDF': 'Imprimer / PDF',
            'GENERATED_ON': 'Généré le'
        }
    },
    'ja': {
        'JOB_DETAIL': {
            'COMPLETED_AT': '完了時間',
            'SIGN_AND_CLOSE': '署名して閉じる',
            'DOWNLOAD_REPORT': 'PDFダウンロード',
            'SIGNED_AT': '署名時間'
        },
        'FIX_MAGAZZINO': {
            'TITLE': '在庫修正',
            'SUBTITLE': '未割り当て在庫の修正',
            'DESCRIPTION': '合計在庫が超過している製品を表示します。',
            'EMPTY': 'すべて正しく割り当てられています！',
            'PRODUCT': '製品',
            'TOTAL_QTY': '合計数量',
            'ASSIGNED_QTY': '割当済数量',
            'UNASSIGNED_QTY': '未割当',
            'SELECT_LOCATION': '場所を選択',
            'FIX_BTN': '{{location}} に割り当て',
            'FIX_SELECTED': '選択項目の割り当て',
            'SUCCESS': '再割り当て完了',
            'ERROR': '再割り当てエラー'
        },
        'ADMIN': {
            'ERROR_LOGS': 'エラーログ',
            'LOGS_SUBTITLE': 'システムエラー監視',
            'REFRESH': '更新',
            'CLEAR_LOGS': 'ログクリア',
            'CONFIRM_CLEAR': 'すべてのログを消去しますか？',
            'NO_LOGS': 'エラーはありません。',
            'CLEARED_SUCCESS': '消去成功',
            'CLEAR_ERROR': '消去エラー'
        },
        'BADGE': {
            'TITLE': '企業バッジ',
            'SUBTITLE': '入り口で提示',
            'REFRESH_IN': '更新まで表示',
            'GENERATING': 'QR生成中',
            'HOW_TO_TITLE': '打刻方法',
            'STEP_1': 'アプリを開く',
            'STEP_2': 'メニューからバッジを選択',
            'STEP_3': 'QRをスキャン',
            'SCANNER_TITLE': 'バッジスキャン',
            'START_SCAN': 'スキャン開始',
            'CAMERA_ERROR': 'カメラにアクセスできません',
            'PROBLEMS_QR': '手動申請',
            'REQUEST_TITLE': '手動申請フォーム',
            'REQUEST_HINT': 'QRがスキャンできない場合に入力します。',
            'REQUEST_TYPE': '打刻種類',
            'REQUEST_DATE': '日付',
            'REQUEST_TIME': '時間',
            'REQUEST_REASON': '理由',
            'STATE_MORNING_IN': '午前 出勤',
            'STATE_MORNING_OUT': '午前 退勤',
            'STATE_AFTERNOON_IN': '午後 出勤',
            'STATE_AFTERNOON_OUT': '午後 退勤',
            'TIMESHEET_TITLE': 'タイムシート',
            'TAB_RECORDS': '記録',
            'TAB_REQUESTS': '申請',
            'STATUS_PENDING': '承認待ち',
            'STATUS_APPROVED': '承認済',
            'STATUS_REJECTED': '却下'
        },
        'REPORTS': {
            'TOTAL_HOURS': '総労働時間：',
            'COMPLETED_JOBS': '完了した作業',
            'NO_COMPLETED_JOBS': '完了した作業はありません',
            'OTHER_MOVEMENTS': 'その他の移動'
        },
        'SCANNER': {
            'START_SCAN': 'スキャナー起動',
            'STOP_SCAN': '停止',
            'LOAD': '入荷',
            'UNLOAD': '出荷'
        },
        'VAN_REPORT': {
            'PRINT_PDF': '印刷 / PDF',
            'GENERATED_ON': '生成日：'
        }
    },
    'ru': {
        'JOB_DETAIL': {
            'COMPLETED_AT': 'Завершено в',
            'SIGN_AND_CLOSE': 'Подписать и закрыть',
            'DOWNLOAD_REPORT': 'Скачать PDF',
            'SIGNED_AT': 'Подписано в'
        },
        'FIX_MAGAZZINO': {
            'TITLE': 'Исправление запасов',
            'SUBTITLE': 'Исправить запасы товаров',
            'DESCRIPTION': 'Показывает товары с некорректным складом.',
            'EMPTY': 'Всё в порядке!',
            'PRODUCT': 'Товар',
            'TOTAL_QTY': 'Общ. кол-во',
            'ASSIGNED_QTY': 'Назначено',
            'UNASSIGNED_QTY': 'Осталось',
            'SELECT_LOCATION': 'Выберите место',
            'FIX_BTN': 'Назначить в {{location}}',
            'FIX_SELECTED': 'Назначить выбранное',
            'SUCCESS': 'Успешно',
            'ERROR': 'Ошибка'
        },
        'ADMIN': {
            'ERROR_LOGS': 'Журнал ошибок',
            'LOGS_SUBTITLE': 'Мониторинг ошибок',
            'REFRESH': 'Обновить',
            'CLEAR_LOGS': 'Очистить',
            'CONFIRM_CLEAR': 'Вы уверены?',
            'NO_LOGS': 'Нет ошибок.',
            'CLEARED_SUCCESS': 'Очищено',
            'CLEAR_ERROR': 'Ошибка очистки'
        },
        'BADGE': {
            'TITLE': 'Бейдж компании',
            'SUBTITLE': 'Покажите этот QR',
            'REFRESH_IN': 'Обновление через',
            'GENERATING': 'Создание QR',
            'HOW_TO_TITLE': 'Как отметиться',
            'STEP_1': 'Откройте приложение',
            'STEP_2': 'Выберите Бейдж',
            'STEP_3': 'Сканируйте QR',
            'SCANNER_TITLE': 'Скан бейджа',
            'START_SCAN': 'Сканировать QR',
            'CAMERA_ERROR': 'Нет камеры',
            'PROBLEMS_QR': 'Проблемы?',
            'REQUEST_TITLE': 'Ручной запрос',
            'REQUEST_HINT': 'Заполните, если QR не работает.',
            'REQUEST_TYPE': 'Тип',
            'REQUEST_DATE': 'Дата',
            'REQUEST_TIME': 'Время',
            'REQUEST_REASON': 'Причина',
            'STATE_MORNING_IN': 'Утро Приход',
            'STATE_MORNING_OUT': 'Утро Уход',
            'STATE_AFTERNOON_IN': 'День Приход',
            'STATE_AFTERNOON_OUT': 'День Уход',
            'TIMESHEET_TITLE': 'График',
            'TAB_RECORDS': 'Записи',
            'TAB_REQUESTS': 'Запросы',
            'STATUS_PENDING': 'В ожидании',
            'STATUS_APPROVED': 'Одобрено',
            'STATUS_REJECTED': 'Отклонено'
        },
        'REPORTS': {
            'TOTAL_HOURS': 'Всего отработано часов:',
            'COMPLETED_JOBS': 'Завершенные работы',
            'NO_COMPLETED_JOBS': 'Нет завершенных работ',
            'OTHER_MOVEMENTS': 'Другие операции'
        },
        'SCANNER': {
            'START_SCAN': 'Запустить сканер',
            'STOP_SCAN': 'Остановить',
            'LOAD': 'Погрузка',
            'UNLOAD': 'Разгрузка'
        },
        'VAN_REPORT': {
            'PRINT_PDF': 'Печать / PDF',
            'GENERATED_ON': 'Сгенерировано'
        }
    },
    'zh': {
        'JOB_DETAIL': {
            'COMPLETED_AT': '完成时间',
            'SIGN_AND_CLOSE': '签署并关闭',
            'DOWNLOAD_REPORT': '下载PDF',
            'SIGNED_AT': '签署时间'
        },
        'FIX_MAGAZZINO': {
            'TITLE': '库存修正',
            'SUBTITLE': '修正未分配产品的库存',
            'DESCRIPTION': '显示库存不正确的项目',
            'EMPTY': '库存正常！',
            'PRODUCT': '产品',
            'TOTAL_QTY': '总数',
            'ASSIGNED_QTY': '已分配',
            'UNASSIGNED_QTY': '未分配',
            'SELECT_LOCATION': '选择位置',
            'FIX_BTN': '分配给 {{location}}',
            'FIX_SELECTED': '分配选中项',
            'SUCCESS': '重新分配成功',
            'ERROR': '错误'
        },
        'ADMIN': {
            'ERROR_LOGS': '错误日志',
            'LOGS_SUBTITLE': '系统错误监控',
            'REFRESH': '刷新',
            'CLEAR_LOGS': '清空日志',
            'CONFIRM_CLEAR': '你确定要清空吗？',
            'NO_LOGS': '无错误',
            'CLEARED_SUCCESS': '清空成功',
            'CLEAR_ERROR': '清空失败'
        },
        'BADGE': {
            'TITLE': '公司徽章',
            'SUBTITLE': '在入口出示此QR码',
            'REFRESH_IN': '刷新倒计时',
            'GENERATING': '正在生成QR',
            'HOW_TO_TITLE': '操作方法',
            'STEP_1': '打开App',
            'STEP_2': '选择徽章',
            'STEP_3': '扫描上方QR',
            'SCANNER_TITLE': '扫描徽章',
            'START_SCAN': '轻触扫描',
            'CAMERA_ERROR': '无法访问相机',
            'PROBLEMS_QR': 'QR有问题吗？手动申请',
            'REQUEST_TITLE': '手动申请表单',
            'REQUEST_HINT': '如果扫描失败，填写此表单。',
            'REQUEST_TYPE': '打卡类型',
            'REQUEST_DATE': '日期',
            'REQUEST_TIME': '时间',
            'REQUEST_REASON': '原因',
            'STATE_MORNING_IN': '上午上班',
            'STATE_MORNING_OUT': '上午下班',
            'STATE_AFTERNOON_IN': '下午上班',
            'STATE_AFTERNOON_OUT': '下午下班',
            'TIMESHEET_TITLE': '时间表',
            'TAB_RECORDS': '记录',
            'TAB_REQUESTS': '申请',
            'STATUS_PENDING': '待处理',
            'STATUS_APPROVED': '已批准',
            'STATUS_REJECTED': '已拒绝'
        },
        'REPORTS': {
            'TOTAL_HOURS': '总工作时间：',
            'COMPLETED_JOBS': '已完成任务',
            'NO_COMPLETED_JOBS': '没有已完成任务',
            'OTHER_MOVEMENTS': '其他动态'
        },
        'SCANNER': {
            'START_SCAN': '启动扫描仪',
            'STOP_SCAN': '停止',
            'LOAD': '入库',
            'UNLOAD': '出库'
        },
        'VAN_REPORT': {
            'PRINT_PDF': '打印 / PDF',
            'GENERATED_ON': '生成时间：'
        }
    },
    'it': {
        'REPORTS': {
            'TOTAL_HOURS': 'Ore totali lavorate:',
            'COMPLETED_JOBS': 'Lavori completati',
            'NO_COMPLETED_JOBS': 'Nessun lavoro completato',
            'OTHER_MOVEMENTS': 'Altri movimenti'
        },
        'SCANNER': {
            'START_SCAN': 'Avvia Scanner',
            'STOP_SCAN': 'Interrompi',
            'LOAD': 'Carico',
            'UNLOAD': 'Scarico'
        },
        'VAN_REPORT': {
            'PRINT_PDF': 'Stampa / PDF',
            'GENERATED_ON': 'Generato il'
        }
    }
}

for lang, additions in languages.items():
    filePath = f'frontend/src/assets/i18n/{lang}.json'
    with open(filePath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Merge logic
    for root_key, sub_dict in additions.items():
        if root_key not in data:
            data[root_key] = {}
        if isinstance(data[root_key], dict):
            for k, v in sub_dict.items():
                data[root_key][k] = v

    # Write back
    with open(filePath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

print('Updated JSON localization files.')
