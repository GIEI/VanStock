import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ProductService, ProductCategory } from '../../core/services/product.service';
import { LocationService } from '../../core/services/location.service';
import { AuthService } from '../../core/services/auth.service';
import { MovementService } from '../../core/services/movement.service';
import { Product } from '../../core/models/product.model';
import { PhotoUrlPipe } from '../../core/pipes/photo-url.pipe';
import { Location } from '../../core/models/location.model';
import { ProductImportDialogComponent } from './product-import-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    PhotoUrlPipe,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    TranslateModule,
  ],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
})
export class ProductsComponent implements OnInit, OnDestroy {
  products:  Product[]  = [];
  locations: Location[] = [];
  categories: ProductCategory[] = [];
  total    = 0;
  loading  = false;
  usingId: number | null = null;

  searchQuery  = '';
  filterCategory: number | '' = '';
  filterLocation = '';
  filterLowStock = false;

  private searchSubject = new Subject<string>();
  private destroy$      = new Subject<void>();

  constructor(
    private productService:  ProductService,
    private locationService: LocationService,
    private movementService: MovementService,
    private snack:           MatSnackBar,
    private dialog:          MatDialog,
    public  auth:            AuthService,
    private route:           ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => this.load());

    const locId = this.route.snapshot.queryParamMap.get('location_id');
    if (locId) this.filterLocation = +locId as any;

    this.locationService.list().subscribe(locs => this.locations = locs);
    this.productService.categories().subscribe(cats => this.categories = cats);
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearch(q: string): void {
    this.searchQuery = q;
    this.searchSubject.next(q);
  }

  load(): void {
    this.loading = true;
    this.productService.list({
      q:           this.searchQuery || undefined,
      category:    this.filterCategory || undefined,
      location_id: this.filterLocation ? +this.filterLocation : undefined,
      low_stock:   this.filterLowStock || undefined,
      limit:       100,
    }).subscribe({
      next: res => {
        this.products = res.data;
        this.total    = res.total;
        this.loading  = false;
      },
      error: () => { this.loading = false; },
    });
  }

  exportExcel(): void {
    this.productService.exportExcel().subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = 'prodotti.xlsx'; a.click();
      URL.revokeObjectURL(url);
    });
  }

  openImport(): void {
    const ref = this.dialog.open(ProductImportDialogComponent, { width: '500px' });
    ref.afterClosed().subscribe(changed => { if (changed) this.load(); });
  }

  delete(p: Product): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'CONFIRM.DELETE_PRODUCT_TITLE', message: 'CONFIRM.DELETE_PRODUCT_MSG', messageParams: { name: p.name } },
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.productService.delete(p.id).subscribe({
        next: () => { this.snack.open('Prodotto eliminato', 'OK', { duration: 3000 }); this.load(); },
        error: () => this.snack.open('Errore durante l\'eliminazione', 'OK', { duration: 3000 }),
      });
    });
  }

  useOne(p: Product): void {
    if (this.usingId === p.id || +p.quantity <= 0) return;
    this.usingId = p.id;
    this.movementService.create({
      product_id:       p.id,
      type:             'scarico',
      quantity:         1,
      from_location_id: p.location_id ?? undefined,
    }).subscribe({
      next: () => {
        p.quantity = +p.quantity - 1;
        this.usingId = null;
        this.snack.open(`−1 ${p.unit} da ${p.name}`, 'OK', { duration: 2500 });
      },
      error: err => {
        this.usingId = null;
        this.snack.open(err.error?.error || 'Errore scarico', 'OK', { duration: 3000 });
      },
    });
  }

  stockClass(p: Product): string {
    const qty = +p.quantity;
    const min = +p.min_stock;
    if (qty === 0)    return 'badge-critical';
    if (qty < min)    return 'badge-warning';
    return 'badge-ok';
  }

  stockIcon(p: Product): string {
    const qty = +p.quantity;
    const min = +p.min_stock;
    if (qty === 0)    return 'dangerous';
    if (qty < min)    return 'warning_amber';
    return 'check_circle';
  }

  get quantityLabel(): string {
    if (!this.filterLocation) return '';
    return this.locations.find(l => l.id === +this.filterLocation)?.name ?? '';
  }

  locationIcon(type: string): string {
    return type === 'warehouse' ? 'warehouse' : type === 'van' ? 'local_shipping' : 'place';
  }
}
