import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ProductService, ImportResult } from '../../core/services/product.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-product-import-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule, MatIconModule,
    MatDialogModule, MatProgressBarModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ 'IMPORT.TITLE' | translate }}</h2>
    <mat-dialog-content>

      <!-- Drop zone -->
      <div class="drop-zone"
           [class.drag-over]="dragging"
           (dragover)="$event.preventDefault(); dragging=true"
           (dragleave)="dragging=false"
           (drop)="onDrop($event)"
           (click)="fileInput.click()"
           *ngIf="!result && !loading">
        <mat-icon class="drop-icon">upload_file</mat-icon>
        <p>{{ 'IMPORT.DROP_TEXT' | translate }}<br>{{ 'IMPORT.DROP_OR_CLICK' | translate }}</p>
        <span class="drop-hint">{{ 'IMPORT.REQUIRED_COLS' | translate }}</span>
        <span class="drop-hint">{{ 'IMPORT.OPTIONAL_COLS' | translate }}</span>
        <span class="drop-hint">{{ 'IMPORT.ID_HINT' | translate }}</span>
        <input #fileInput type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden (change)="onFileSelected($event)">
      </div>

      <!-- Loading -->
      <div class="loading-state" *ngIf="loading">
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
        <p>{{ 'IMPORT.LOADING' | translate }}</p>
      </div>

      <!-- Results -->
      <div class="result-state" *ngIf="result && !loading">
        <div class="result-row ok">
          <mat-icon>add_circle</mat-icon>
          <span>{{ 'IMPORT.CREATED' | translate }}: <strong>{{result.created}}</strong></span>
        </div>
        <div class="result-row ok">
          <mat-icon>update</mat-icon>
          <span>{{ 'IMPORT.UPDATED' | translate }}: <strong>{{result.updated}}</strong></span>
        </div>
        <div class="result-row warn" *ngIf="result.errors.length">
          <mat-icon>warning_amber</mat-icon>
          <span>{{ 'IMPORT.ERRORS' | translate }}: <strong>{{result.errors.length}}</strong></span>
        </div>
        <div class="error-list" *ngIf="result.errors.length">
          <div *ngFor="let e of result.errors" class="error-item">
            Riga {{e.row}}: {{e.reason}}
          </div>
        </div>
      </div>

    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">{{result ? ('IMPORT.CLOSE' | translate) : ('IMPORT.CANCEL' | translate)}}</button>
      <button mat-stroked-button (click)="downloadTemplate()" *ngIf="!result && !loading">
        <mat-icon>download</mat-icon> {{ 'IMPORT.TEMPLATE' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .drop-zone {
      border: 2px dashed var(--c-border);
      border-radius: var(--r-lg);
      padding: 40px 24px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      min-width: 380px;
    }
    .drop-zone:hover, .drop-zone.drag-over {
      border-color: var(--c-primary);
      background: var(--c-surface2);
    }
    .drop-icon { font-size: 48px; width: 48px; height: 48px; color: var(--c-text3); display: block; margin: 0 auto 12px; }
    .drop-hint { display: block; font-size: 12px; color: var(--c-text3); margin-top: 6px; }
    .loading-state { padding: 24px 0; text-align: center; min-width: 380px; }
    .loading-state p { margin-top: 16px; color: var(--c-text2); }
    .result-state { padding: 16px 0; min-width: 380px; }
    .result-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 15px; }
    .result-row.ok mat-icon { color: #388e3c; }
    .result-row.warn mat-icon { color: #f57c00; }
    .error-list { margin-top: 8px; max-height: 160px; overflow-y: auto; background: var(--c-surface2);
                  border-radius: var(--r-sm); padding: 8px 12px; }
    .error-item { font-size: 12px; color: var(--c-text2); padding: 2px 0; }
  `],
})
export class ProductImportDialogComponent {
  dragging = false;
  loading  = false;
  result:  ImportResult | null = null;

  constructor(
    private productSvc: ProductService,
    private dialogRef:  MatDialogRef<ProductImportDialogComponent>,
  ) {}

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.upload(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (file) this.upload(file);
    input.value = '';
  }

  upload(file: File): void {
    this.loading = true;
    this.result  = null;
    this.productSvc.importFile(file).subscribe({
      next:  res  => { this.loading = false; this.result = res; },
      error: err  => { this.loading = false; this.result = { created: 0, updated: 0, errors: [{ row: 0, reason: err.error?.error || 'Errore imprevisto' }] }; },
    });
  }

  downloadTemplate(): void {
    this.productSvc.importTemplate().subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'template_prodotti.xlsx'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  close(): void {
    this.dialogRef.close(!!this.result && (this.result.created + this.result.updated) > 0);
  }
}
