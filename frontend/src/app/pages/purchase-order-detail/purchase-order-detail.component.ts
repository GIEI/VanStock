import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { map } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PurchaseOrderService } from '../../core/services/purchase-order.service';
import { ProductService } from '../../core/services/product.service';
import { SupplierService } from '../../core/services/supplier.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ReceiveOrderDialogComponent } from './receive-order-dialog.component';
import { PurchaseOrder, PurchaseOrderItem, SuggestedProduct, LotEntry } from '../../core/models/purchase-order.model';
import { Product } from '../../core/models/product.model';
import { Supplier } from '../../core/models/supplier.model';

@Component({
  selector: 'app-purchase-order-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTooltipModule, MatDividerModule, MatCheckboxModule, TranslateModule,
    ReceiveOrderDialogComponent,
  ],
  templateUrl: './purchase-order-detail.component.html',
  styleUrls: ['./purchase-order-detail.component.scss'],
})
export class PurchaseOrderDetailComponent implements OnInit {
  order:    PurchaseOrder | null = null;
  loading   = true;
  saving    = false;
  receiving = false;

  showAddItem   = false;
  addItemForm!: FormGroup;
  allProducts:  Product[]       = [];
  allSuppliers: Supplier[]      = [];
  suggestions:  SuggestedProduct[] = [];
  editingInfo   = false;
  infoForm!:    FormGroup;
  editingItemId: number | null  = null;
  editItemForm!: FormGroup;

  constructor(
    private route:       ActivatedRoute,
    private router:      Router,
    private poService:   PurchaseOrderService,
    private prodSvc:     ProductService,
    private supplierSvc: SupplierService,
    private dialog:      MatDialog,
    private snack:       MatSnackBar,
    private fb:          FormBuilder,
    public  auth:        AuthService,
    private translate:   TranslateService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.load(id);
    this.addItemForm = this.fb.group({
      product_id:       [null, Validators.required],
      quantity_ordered: [1,    [Validators.required, Validators.min(0.001)]],
      unit_price:       [null, [Validators.min(0)]],
      notes:            [''],
      track_lots:       [false],
    });
    this.prodSvc.list({ limit: 1000 }).pipe(map(r => r.data)).subscribe(p => this.allProducts = p);
    this.supplierSvc.list().subscribe(s => this.allSuppliers = s);
    this.poService.getSuggestions().subscribe(s => this.suggestions = s);
    this.infoForm = this.fb.group({
      supplier_id: [null],
      notes:       [''],
    });
    this.editItemForm = this.fb.group({
      quantity_ordered: [1,    [Validators.required, Validators.min(0.001)]],
      unit_price:       [null, [Validators.min(0)]],
    });
  }

  load(id: number = this.order?.id ?? 0): void {
    if (!id) return;
    this.poService.get(id).subscribe({
      next:  o  => {
        this.order = o;
        this.loading = false;
        // Auto-open add-item form for new empty drafts
        if (o.status === 'bozza' && !o.items?.length) {
          this.showAddItem = true;
        }
      },
      error: () => { this.loading = false; this.router.navigate(['/purchase-orders']); },
    });
  }

  get isDraft():   boolean { return this.order?.status === 'bozza'; }
  get isSent():    boolean { return this.order?.status === 'inviato'; }
  get isReceived():boolean { return this.order?.status === 'ricevuto'; }

  get totalValue(): number {
    return (this.order?.items ?? []).reduce((sum, i) =>
      sum + (i.quantity_ordered * (i.unit_price ?? 0)), 0);
  }

  get availableProducts(): Product[] {
    const linked = new Set((this.order?.items ?? []).map(i => i.product_id));
    return this.allProducts.filter(p => !linked.has(p.id));
  }

  isNotInOrder(productId: number): boolean {
    return !(this.order?.items ?? []).some(i => i.product_id === productId);
  }

  addFromSuggestion(s: SuggestedProduct): void {
    this.addItemForm.patchValue({
      product_id:       s.product_id,
      quantity_ordered: Math.ceil(s.qty_to_order) || 1,
      unit_price:       s.purchase_price ?? null,
    });
    this.showAddItem = true;
  }

  statusColor(status: string): string {
    return { bozza: 'default', inviato: 'primary', ricevuto: 'accent' }[status] ?? 'default';
  }

  startEditInfo(): void {
    this.infoForm.setValue({
      supplier_id: this.order?.supplier_id ?? null,
      notes:       this.order?.notes ?? '',
    });
    this.editingInfo = true;
  }

  saveInfo(): void {
    if (!this.order) return;
    this.poService.update(this.order.id, this.infoForm.value).subscribe({
      next: () => { this.editingInfo = false; this.load(); },
      error: () => this.snack.open('Errore', 'OK', { duration: 3000 }),
    });
  }

  markSent(): void {
    if (!this.order) return;
    this.saving = true;
    this.poService.updateStatus(this.order.id, 'inviato').subscribe({
      next:  o  => { this.order = { ...this.order!, ...o }; this.saving = false; },
      error: () => { this.saving = false; this.snack.open('Errore', 'OK', { duration: 3000 }); },
    });
  }

  receiveOrder(): void {
    if (!this.order) return;
    const ref = this.dialog.open(ReceiveOrderDialogComponent, {
      width: '520px',
      disableClose: true,
      data: { items: this.order.items ?? [] },
    });
    ref.afterClosed().subscribe((result: { location_id: number; lot_entries: LotEntry[] } | undefined) => {
      if (!result || !this.order) return;
      this.receiving = true;
      this.poService.receive(this.order.id, result.location_id, result.lot_entries).subscribe({
        next:  o  => { this.receiving = false; this.load(o.id); },
        error: (err) => {
          this.receiving = false;
          const msg = err?.error?.error ?? 'Errore nella ricezione';
          this.snack.open(msg, 'OK', { duration: 4000 });
        },
      });
    });
  }

  addItem(): void {
    if (this.addItemForm.invalid || !this.order) return;
    const { product_id, quantity_ordered, unit_price, notes, track_lots } = this.addItemForm.value;
    this.poService.addItem(this.order.id, { product_id, quantity_ordered, unit_price, notes, track_lots }).subscribe({
      next: () => {
        this.showAddItem = false;
        this.addItemForm.reset({ quantity_ordered: 1, track_lots: false });
        this.load();
      },
      error: () => this.snack.open('Errore', 'OK', { duration: 3000 }),
    });
  }

  startEditItem(item: PurchaseOrderItem): void {
    this.editingItemId = item.id;
    this.editItemForm.setValue({
      quantity_ordered: item.quantity_ordered,
      unit_price:       item.unit_price ?? null,
    });
  }

  saveEditItem(item: PurchaseOrderItem): void {
    if (!this.order || this.editItemForm.invalid) return;
    const { quantity_ordered, unit_price } = this.editItemForm.value;
    this.poService.addItem(this.order.id, {
      product_id: item.product_id,
      quantity_ordered,
      unit_price: unit_price ?? null,
    }).subscribe({
      next:  () => { this.editingItemId = null; this.load(); },
      error: () => this.snack.open('Errore', 'OK', { duration: 3000 }),
    });
  }

  cancelEditItem(): void {
    this.editingItemId = null;
  }

  removeItem(item: PurchaseOrderItem): void {
    if (!this.order) return;
    this.poService.deleteItem(this.order.id, item.id).subscribe({
      next:  () => this.load(),
      error: () => this.snack.open('Errore', 'OK', { duration: 3000 }),
    });
  }

  deleteOrder(): void {
    if (!this.order) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'CONFIRM.DELETE_ORDER_TITLE', message: 'CONFIRM.DELETE_ORDER_MSG', messageParams: { id: this.order.id } },
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed || !this.order) return;
      this.poService.delete(this.order.id).subscribe({
        next:  () => this.router.navigate(['/purchase-orders']),
        error: () => this.snack.open('Solo le bozze possono essere eliminate', 'OK', { duration: 3000 }),
      });
    });
  }
}
