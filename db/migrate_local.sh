#!/bin/bash
# Applica tutte le migrazioni in ordine su un DB locale appena creato.
# Uso: ./db/migrate_local.sh

set -e
DB_CONTAINER=${1:-stocksimple-db}
DB_USER=${2:-stockuser}
DB_NAME=${3:-stocksimple}

run() {
  echo "→ $1"
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" "$DB_NAME" < "$1"
}

run db/migrate_v2_per_location_stocks.sql
run db/migrate_v3_auth.sql
run db/migrate_v4_company_logo.sql
run db/migrate_v5_clients_jobs.sql
run db/migrate_v5_company_currency.sql
run db/migrate_v6_push.sql
run db/migrate_v7_daily_reports.sql
run db/migrate_v8_jobs_priority.sql
run db/migrate_v8_suppliers.sql
run db/migrate_v9_purchase_price.sql
run db/migrate_v10_purchase_orders.sql
run db/migrate_v11_location_status.sql
run db/migrate_v12_vehicle_bookings.sql
run db/migrate_v13_job_workflow.sql
run db/migrate_v14_job_signature.sql
run db/migrate_v14_ore_lavorate.sql
run db/migrate_v15_attendance.sql
run db/migrate_v16_job_chat.sql
run db/migrate_v17_batches.sql
run db/migrate_v18_work_shifts.sql
run db/migrate_v19_word_template.sql
run db/migrate_v20_geolocation.sql
run db/migrate_v21_job_photos_geolocation.sql
run db/migrate_v22_attendance_v2.sql
run db/migrate_v23_late_thresholds.sql
run db/migrate_v24_movement_status.sql
run db/migrate_v25_subscriptions.sql
run db/migrate_v26_users_status.sql
run db/migrate_v27_company_smtp.sql
run db/migrate_v28_user_invites.sql
run db/migrate_v29_job_photos_media_type.sql
run db/migrate_v30_job_product_missing.sql
run db/migrate_v31_job_state_changes_signed.sql
run db/migrate_v32_job_product_missing_note.sql
run db/migrate_v33_notifications.sql
run db/migrate_v34_movement_cost_snapshot.sql
run db/migrate_v35_attendance_dismiss_anomaly.sql
run db/migrate_v36_company_features.sql
run db/migrate_v37_user_absences.sql
run db/migrate_v38_job_required_materials.sql
run db/migrate_v39_movement_batch_allocations.sql
run db/migrate_v40_integration_outbox.sql
run db/migrate_v41_integration_api_keys.sql
run db/migrate_v42_integration_inbox.sql
run db/migrate_v43_integration_inbox_worker.sql
run db/migrate_v44_integration_webhooks.sql
run db/migrate_v45_integration_entity_mappings.sql
run db/migrate_v46_product_category_references.sql
run db/migrate_categories.sql

echo "✓ Tutte le migrazioni applicate."
