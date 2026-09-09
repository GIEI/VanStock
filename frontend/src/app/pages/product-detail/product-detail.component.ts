import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ProductService } from '../../core/services/product.service';
import { MovementService } from '../../core/services/movement.service';
import { SupplierService, ProductSupplierLink } from '../../core/services/supplier.service';
import { InventoryService, ProductBatch } from '../../core/services/inventory.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { Product, ProductStock } from '../../core/models/product.model';
import { Supplier } from '../../core/models/supplier.model';
import { PhotoUrlPipe } from '../../core/pipes/photo-url.pipe';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    PhotoUrlPipe,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatCheckboxModule,
    TranslateModule,
  ],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss'],
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  loading = true;
  lightboxOpen = false;
  usingOne = false;
  batches: ProductBatch[] = [];
  editingBatch: ProductBatch | null = null;
  editingBatchExpiry = '';

  // Suppliers
  productSuppliers: ProductSupplierLink[] = [];
  allSuppliers: Supplier[] = [];
  showAddSupplier = false;
  addSupplierForm!: FormGroup;
  editingSupplierId: number | null = null;
  editSupplierForm!: FormGroup;

  constructor(
    private route:           ActivatedRoute,
    private router:          Router,
    private productService:  ProductService,
    private movementService: MovementService,
    private supplierService: SupplierService,
    private inventoryService: InventoryService,
    private snack:           MatSnackBar,
    private dialog:          MatDialog,
    private fb:              FormBuilder,
    public  auth:            AuthService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.productService.get(id).subscribe({
      next:  p => { 
        this.product = p; 
        this.loading = false; 
        this.loadProductSuppliers(); 
        if (p.tracks_batches) this.loadBatches();
      },
      error: () => { this.loading = false; this.router.navigate(['/products']); },
    });
    this.addSupplierForm = this.fb.group({
      supplier_id:    [null, Validators.required],
      purchase_price: [null, [Validators.min(0)]],
      is_preferred:   [false],
    });
    this.editSupplierForm = this.fb.group({
      purchase_price: [null, [Validators.min(0)]],
      is_preferred:   [false],
    });
    this.supplierService.list().subscribe(s => this.allSuppliers = s);
  }

  loadProductSuppliers(): void {
    if (!this.product) return;
    this.supplierService.listForProduct(this.product.id).subscribe({
      next: links => this.productSuppliers = links,
      error: () => {},
    });
  }

  loadBatches(): void {
    if (!this.product) return;
    this.inventoryService.getBatches({ product_id: this.product.id }).subscribe({
      next: batches => this.batches = batches,
      error: () => {},
    });
  }

  startEditBatchExpiry(b: ProductBatch): void {
    this.editingBatch       = b;
    this.editingBatchExpiry = b.expiry_date ? b.expiry_date.substring(0, 10) : '';
  }

  saveBatchExpiry(b: ProductBatch): void {
    const val = this.editingBatchExpiry || null;
    this.inventoryService.updateBatchExpiry(b.id, val).subscribe({
      next: updated => {
        b.expiry_date       = updated.expiry_date;
        this.editingBatch   = null;
      },
      error: () => this.snack.open('Errore aggiornamento scadenza', '', { duration: 3000 }),
    });
  }

  get availableSuppliers(): Supplier[] {
    const linked = new Set(this.productSuppliers.map(s => s.id));
    return this.allSuppliers.filter(s => !linked.has(s.id));
  }

  saveSupplierLink(): void {
    if (this.addSupplierForm.invalid || !this.product) return;
    this.supplierService.linkToProduct(this.product.id, this.addSupplierForm.value).subscribe({
      next: () => {
        this.showAddSupplier = false;
        this.addSupplierForm.reset({ is_preferred: false });
        this.loadProductSuppliers();
      },
      error: () => this.snack.open('Errore', 'OK', { duration: 3000 }),
    });
  }

  removeSupplierLink(supplierId: number): void {
    if (!this.product) return;
    this.supplierService.unlinkFromProduct(this.product.id, supplierId).subscribe({
      next: () => this.loadProductSuppliers(),
      error: () => this.snack.open('Errore', 'OK', { duration: 3000 }),
    });
  }

  startEditSupplier(s: ProductSupplierLink): void {
    this.editingSupplierId = s.id;
    this.editSupplierForm.setValue({
      purchase_price: s.purchase_price ?? null,
      is_preferred:   s.is_preferred,
    });
  }

  cancelEditSupplier(): void {
    this.editingSupplierId = null;
  }

  saveEditSupplier(supplierId: number): void {
    if (!this.product) return;
    const { purchase_price, is_preferred } = this.editSupplierForm.value;
    this.supplierService.linkToProduct(this.product.id, {
      supplier_id:    supplierId,
      purchase_price: purchase_price,
      is_preferred:   is_preferred,
    }).subscribe({
      next: () => {
        this.editingSupplierId = null;
        this.loadProductSuppliers();
      },
      error: () => this.snack.open('Errore', 'OK', { duration: 3000 }),
    });
  }

  delete(): void {
    if (!this.product) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'CONFIRM.DELETE_PRODUCT_TITLE', message: 'CONFIRM.DELETE_PRODUCT_MSG', messageParams: { name: this.product.name } },
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed || !this.product) return;
      this.productService.delete(this.product.id).subscribe({
        next: () => { this.router.navigate(['/products']); },
        error: () => this.snack.open('Errore', 'OK', { duration: 3000 }),
      });
    });
  }

  locationIcon(type: string): string {
    return { warehouse: 'warehouse', van: 'local_shipping', site: 'location_on' }[type] ?? 'place';
  }

  stockClass(): string {
    if (!this.product) return '';
    const qty = +this.product.quantity;
    const min = +this.product.min_stock;
    if (qty === 0)  return 'badge-critical';
    if (qty < min) return 'badge-warning';
    return 'badge-ok';
  }

  movementIcon(type: string): string {
    return { carico: 'add_circle', scarico: 'remove_circle', trasferimento: 'swap_horiz' }[type] ?? 'swap_horiz';
  }

  movementClass(type: string): string { return `type-${type}`; }

  useOne(): void {
    if (!this.product || this.usingOne || +this.product.quantity <= 0) return;
    this.usingOne = true;
    this.movementService.create({
      product_id:       this.product.id,
      type:             'scarico',
      quantity:         1,
      from_location_id: this.product.location_id ?? undefined,
    }).subscribe({
      next: () => {
        this.product!.quantity = +this.product!.quantity - 1;
        this.usingOne = false;
        this.snack.open(`−1 ${this.product!.unit} registrato`, 'OK', { duration: 2500 });
      },
      error: err => {
        this.usingOne = false;
        this.snack.open(err.error?.error || 'Errore scarico', 'OK', { duration: 3000 });
      },
    });
  }


  get avgPurchasePrice(): number | null {
    const carichi = this.product?.movements?.filter(m => m.type === 'carico' && m.purchase_price != null) ?? [];
    if (!carichi.length) return null;
    return carichi.reduce((sum, m) => sum + m.purchase_price! * m.quantity, 0) /
           carichi.reduce((sum, m) => sum + m.quantity, 0);
  }

  get marginPct(): number {
    const avg = this.avgPurchasePrice;
    const price = this.product?.price;
    if (!avg || !price) return 0;
    return (price - avg) / price * 100;
  }
}
