import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule }     from '@angular/material/card';
import { MatButtonModule }   from '@angular/material/button';
import { MatIconModule }     from '@angular/material/icon';
import { MatDividerModule }  from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

interface ImportStats {
  locations: number; products: number; clients: number; suppliers: number;
  jobs: number; movements: number; purchase_orders: number; vehicle_bookings: number;
  users?: number; user_absences?: number; job_photos?: number; media_files?: number;
}

interface BackupItem {
  ts:           string;
  db_size:      number;
  uploads_size: number;
  created_at:   string;
}

@Component({
  selector: 'app-import-export',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule, MatButtonModule, MatIconModule, MatDividerModule,
    MatSnackBarModule, MatProgressBarModule, MatTableModule, MatDialogModule,
  ],
  templateUrl: './import-export.component.html',
  styleUrls:   ['./import-export.component.scss'],
})
export class ImportExportComponent implements OnInit {
  exporting = false;

  selectedFile: File | null = null;
  fileName    = '';
  importing   = false;
  importResult: { success: boolean; stats?: ImportStats } | null = null;

  // Auto-backups (superadmin only)
  backups: BackupItem[] = [];
  loadingBackups = false;
  busyBackupTs: string | null = null;
  restoringDb = false;
  restoringUploads = false;

  constructor(
    private api:   ApiService,
    public  auth:  AuthService,
    private snack: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    if (this.auth.isSuperAdmin) this.loadBackups();
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  exportData(): void {
    this.exporting = true;
    this.api.getBlob('/data-transfer/export').subscribe({
      next: (blob) => {
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `stocksimple_${new Date().toISOString().slice(0, 10)}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting = false;
        this.snack.open('Esportazione completata', 'OK', { duration: 3000 });
      },
      error: () => {
        this.exporting = false;
        this.snack.open('Errore durante l\'esportazione', 'OK', { duration: 4000 });
      },
    });
  }

  // ── Import ──────────────────────────────────────────────────────────────────
  onDragOver(e: DragEvent): void { e.preventDefault(); e.stopPropagation(); }

  onDrop(e: DragEvent): void {
    e.preventDefault(); e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) this.setFile(file);
  }

  onFileChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.setFile(file);
  }

  private setFile(file: File): void {
    if (!file.name.endsWith('.zip') && !file.name.endsWith('.json')) {
      this.snack.open('Seleziona un file .zip o .json', 'OK', { duration: 3000 });
      return;
    }
    this.selectedFile = file;
    this.fileName     = file.name;
    this.importResult = null;
  }

  clearFile(): void {
    this.selectedFile = null;
    this.fileName     = '';
    this.importResult = null;
  }

  importData(): void {
    if (!this.selectedFile || this.importing) return;
    this.importing    = true;
    this.importResult = null;
    const fd = new FormData();
    fd.append('file', this.selectedFile);
    this.api.postFormData<{ success: boolean; stats: ImportStats }>('/data-transfer/import', fd).subscribe({
      next: (res) => {
        this.importing    = false;
        this.importResult = res;
        this.snack.open('Importazione completata con successo', 'OK', { duration: 4000 });
      },
      error: (err) => {
        this.importing = false;
        const msg = err?.error?.error || 'Errore durante l\'importazione';
        this.snack.open(msg, 'OK', { duration: 5000 });
      },
    });
  }

  statEntries(stats: ImportStats): { label: string; value: number; icon: string }[] {
    return [
      { label: 'Posizioni',           value: stats.locations,            icon: 'place'          },
      { label: 'Prodotti',            value: stats.products,             icon: 'inventory_2'    },
      { label: 'Clienti',             value: stats.clients,              icon: 'people'         },
      { label: 'Fornitori',           value: stats.suppliers,            icon: 'store'          },
      { label: 'Utenti',              value: stats.users || 0,           icon: 'person'         },
      { label: 'Lavori',              value: stats.jobs,                 icon: 'work'           },
      { label: 'Movimenti',           value: stats.movements,            icon: 'swap_horiz'     },
      { label: 'Ordini acquisto',     value: stats.purchase_orders,      icon: 'shopping_cart'  },
      { label: 'Prenotazioni veicoli',value: stats.vehicle_bookings,     icon: 'event_available'},
      { label: 'Assenze utenti',      value: stats.user_absences || 0,   icon: 'event_busy'     },
      { label: 'Foto lavori',         value: stats.job_photos || 0,      icon: 'photo_library'  },
      { label: 'File media',          value: stats.media_files || 0,     icon: 'attach_file'    },
    ].filter(e => e.value > 0);
  }

  // ── Auto-backups ────────────────────────────────────────────────────────────
  loadBackups(): void {
    this.loadingBackups = true;
    this.api.get<BackupItem[]>('/backups').subscribe({
      next: list => { this.backups = list; this.loadingBackups = false; },
      error: () => { this.loadingBackups = false; },
    });
  }

  triggerBackup(): void {
    this.loadingBackups = true;
    this.api.post('/backups/run', {}).subscribe({
      next: () => { this.snack.open('Backup avviato', 'OK', { duration: 3000 }); this.loadBackups(); },
      error: () => { this.loadingBackups = false; this.snack.open('Errore avvio backup', 'OK', { duration: 4000 }); },
    });
  }

  downloadBackupDb(b: BackupItem): void {
    this.busyBackupTs = b.ts;
    this.api.getBlob(`/backups/${b.ts}/download/db`).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stocksimple_db_${b.ts}.sql`;
        a.click();
        URL.revokeObjectURL(url);
        this.busyBackupTs = null;
      },
      error: () => { this.busyBackupTs = null; this.snack.open('Errore download DB', 'OK', { duration: 4000 }); },
    });
  }

  downloadBackupUploads(b: BackupItem): void {
    this.busyBackupTs = b.ts;
    this.api.getBlob(`/backups/${b.ts}/download/uploads`).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stocksimple_uploads_${b.ts}.zip`;
        a.click();
        URL.revokeObjectURL(url);
        this.busyBackupTs = null;
      },
      error: () => { this.busyBackupTs = null; this.snack.open('Errore download uploads', 'OK', { duration: 4000 }); },
    });
  }

  restoreBackup(b: BackupItem): void {
    const ok = confirm(`ATTENZIONE: il restore SOSTITUISCE completamente il database e i file uploads con il backup del ${b.created_at}.\n\nProcedere?`);
    if (!ok) return;
    this.busyBackupTs = b.ts;
    this.api.post(`/backups/${b.ts}/restore`, {}).subscribe({
      next: () => {
        this.busyBackupTs = null;
        this.snack.open('Restore completato. Si raccomanda di ricaricare la pagina.', 'OK', { duration: 8000 });
      },
      error: (err) => {
        this.busyBackupTs = null;
        this.snack.open(err?.error?.error || 'Errore restore', 'OK', { duration: 6000 });
      },
    });
  }

  onRestoreDbFile(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    (e.target as HTMLInputElement).value = '';
    if (!file) return;
    const ok = confirm(`ATTENZIONE: il restore SOSTITUISCE completamente il database con il file "${file.name}".\n\nProcedere?`);
    if (!ok) return;
    this.restoringDb = true;
    const fd = new FormData();
    fd.append('file', file);
    this.api.postFormData<{ ok: boolean; message: string }>('/backups/restore-db', fd).subscribe({
      next: (res) => { this.restoringDb = false; this.snack.open(res.message, 'OK', { duration: 6000 }); },
      error: (err) => { this.restoringDb = false; this.snack.open(err?.error?.error || 'Errore ripristino DB', 'OK', { duration: 5000 }); },
    });
  }

  onRestoreUploadsFile(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    (e.target as HTMLInputElement).value = '';
    if (!file) return;
    const ok = confirm(`ATTENZIONE: il restore SOVRASCRIVE i file uploads con quelli contenuti in "${file.name}".\n\nProcedere?`);
    if (!ok) return;
    this.restoringUploads = true;
    const fd = new FormData();
    fd.append('file', file);
    this.api.postFormData<{ ok: boolean; message: string }>('/backups/restore-uploads', fd).subscribe({
      next: (res) => { this.restoringUploads = false; this.snack.open(res.message, 'OK', { duration: 5000 }); },
      error: (err) => { this.restoringUploads = false; this.snack.open(err?.error?.error || 'Errore ripristino uploads', 'OK', { duration: 5000 }); },
    });
  }

  formatBytes(n: number): string {
    if (!n) return '0 B';
    const units = ['B','KB','MB','GB'];
    let i = 0; let v = n;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }
}
