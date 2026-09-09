import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule } from '@ngx-translate/core';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { PurchaseOrder, SuggestedProduct } from '../../core/models/purchase-order.model';

@Component({
  selector: 'app-purchase-orders',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule,
    MatFormFieldModule, MatSelectModule,
    MatTooltipModule, MatCheckboxModule, MatDividerModule, TranslateModule,
  ],
  templateUrl: './purchase-orders.component.html',
  styleUrls: ['./purchase-orders.component.scss'],
})
export class PurchaseOrdersComponent implements OnInit {
  orders:      PurchaseOrder[]   = [];
  suggestions: SuggestedProduct[] = [];
  loading      = true;
  creating     = false;

  // Selected suggestions to create order from
  selectedSuggestions = new Set<number>();

  constructor(
    private poService: PurchaseOrderService,
    private router:    Router,
    private dialog:    MatDialog,
    private snack:     MatSnackBar,
    public  auth:      AuthService,
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadSuggestions();
  }

  load(): void {
    this.loading = true;
    this.poService.list().subscribe({
      next:  orders => { this.orders = orders; this.loading = false; },
      error: ()     => { this.loading = false; },
    });
  }

  loadSuggestions(): void {
    this.poService.getSuggestions().subscribe({
      next:  s => this.suggestions = s,
      error: () => {},
    });
  }

  statusColor(status: string): string {
    return { bozza: 'default', inviato: 'primary', ricevuto: 'accent' }[status] ?? 'default';
  }

  statusIcon(status: string): string {
    return { bozza: 'edit_note', inviato: 'send', ricevuto: 'inventory' }[status] ?? 'circle';
  }

  toggleSuggestion(productId: number): void {
    if (this.selectedSuggestions.has(productId)) {
      this.selectedSuggestions.delete(productId);
    } else {
      this.selectedSuggestions.add(productId);
    }
  }

  createFromSuggestions(): void {
    if (!this.selectedSuggestions.size) return;
    const selected = this.suggestions.filter(s => this.selectedSuggestions.has(s.product_id));
    // Group by preferred supplier if all same, else no supplier
    const supplierIds = [...new Set(selected.map(s => s.supplier_id).filter(Boolean))];
    const supplierId  = supplierIds.length === 1 ? supplierIds[0] : null;

    const items = selected.map(s => ({
      product_id:      s.product_id,
      quantity_ordered: s.qty_to_order > 0 ? s.qty_to_order : 1,
      unit_price:      s.purchase_price ?? null,
    }));

    this.creating = true;
    this.poService.create({ supplier_id: supplierId, items }).subscribe({
      next: po => {
        this.creating = false;
        this.router.navigate(['/purchase-orders', po.id]);
      },
      error: () => {
        this.creating = false;
        this.snack.open('Errore nella creazione ordine', 'OK', { duration: 3000 });
      },
    });
  }

  createNew(): void {
    this.creating = true;
    this.poService.create({}).subscribe({
      next: po => {
        this.creating = false;
        this.router.navigate(['/purchase-orders', po.id]);
      },
      error: () => {
        this.creating = false;
        this.snack.open('Errore nella creazione ordine', 'OK', { duration: 3000 });
      },
    });
  }

  deleteOrder(order: PurchaseOrder): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'CONFIRM.DELETE_ORDER_TITLE', message: 'CONFIRM.DELETE_ORDER_DRAFT_MSG', messageParams: { id: order.id } },
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.poService.delete(order.id).subscribe({
        next:  () => this.load(),
        error: () => this.snack.open('Errore eliminazione (solo bozze)', 'OK', { duration: 3000 }),
      });
    });
  }
}
