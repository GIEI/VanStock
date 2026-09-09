import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MovementService } from '../../core/services/movement.service';
import { Movement } from '../../core/models/product.model';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    TranslateModule,
  ],
  templateUrl: './movements.component.html',
  styleUrls: ['./movements.component.scss'],
})
export class MovementsComponent implements OnInit {
  movements: Movement[] = [];
  loading    = false;
  filterType = '';
  dateFrom: Date | null = null;
  dateTo:   Date | null = null;

  constructor(
    private movementService: MovementService,
    private snack:           MatSnackBar,
    private dialog:          MatDialog,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const from = this.dateFrom ? this.startOfDay(this.dateFrom) : undefined;
    const to   = this.dateTo   ? this.endOfDay(this.dateTo)     : undefined;
    this.movementService.list({
      type:  this.filterType || undefined,
      from,
      to,
      limit: 200,
    }).subscribe({
      next: ms => { this.movements = ms; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  setQuickDate(preset: 'today' | 'yesterday' | 'week' | 'month'): void {
    const now = new Date();
    if (preset === 'today') {
      this.dateFrom = new Date(now); this.dateTo = new Date(now);
    } else if (preset === 'yesterday') {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      this.dateFrom = y; this.dateTo = new Date(y);
    } else if (preset === 'week') {
      const w = new Date(now); w.setDate(w.getDate() - 6);
      this.dateFrom = w; this.dateTo = new Date(now);
    } else {
      const m = new Date(now); m.setDate(m.getDate() - 29);
      this.dateFrom = m; this.dateTo = new Date(now);
    }
    this.load();
  }

  clearDates(): void {
    this.dateFrom = null; this.dateTo = null; this.load();
  }

  private startOfDay(d: Date): string {
    const r = new Date(d); r.setHours(0, 0, 0, 0); return r.toISOString();
  }
  private endOfDay(d: Date): string {
    const r = new Date(d); r.setHours(23, 59, 59, 999); return r.toISOString();
  }

  delete(m: Movement): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Elimina movimento', message: 'Annullare questo movimento e ripristinare le quantità?' },
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.movementService.delete(m.id).subscribe({
        next: () => { this.snack.open('Movimento eliminato', 'OK', { duration: 3000 }); this.load(); },
        error: () => this.snack.open('Errore', 'OK', { duration: 3000 }),
      });
    });
  }

  movementIcon(type: string): string {
    return { carico: 'add_circle', scarico: 'remove_circle', trasferimento: 'swap_horiz' }[type] ?? 'swap_horiz';
  }

  movementColor(type: string): string {
    return ({ carico: '#22c55e', scarico: '#f97316', trasferimento: '#6366f1' } as Record<string, string>)[type] ?? '#6366f1';
  }

  movementClass(type: string): string { return `type-${type}`; }

  groupDate(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString())     return 'Oggi';
    if (d.toDateString() === yesterday.toDateString()) return 'Ieri';
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}
