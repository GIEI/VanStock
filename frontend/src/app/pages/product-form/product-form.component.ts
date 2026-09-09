import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ProductService, ProductCategory } from '../../core/services/product.service';
import { LocationService } from '../../core/services/location.service';
import { Location } from '../../core/models/location.model';
import { BarcodeScanDialogComponent } from '../../core/components/barcode-scan-dialog.component';
import { CameraCaptureDialogComponent } from '../../core/components/camera-capture-dialog.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatAutocompleteModule,
    TranslateModule,
  ],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
})
export class ProductFormComponent implements OnInit {
  form!: FormGroup;
  isEdit    = false;
  productId?: number;
  loading   = false;
  saving    = false;
  locations: Location[] = [];
  photoFile?: File;
  photoPreview?: string;
  initialQuantity = 0;
  initialTracksBatches = false;

  // Category autocomplete
  categories: ProductCategory[] = [];
  filteredCategories: ProductCategory[] = [];
  categoryInput = new FormControl('');
  selectedCategoryId: number | null = null;

  readonly units = ['pz', 'kg', 'g', 'lt', 'ml', 'm', 'cm', 'mt', 'rotolo', 'conf', 'scatola'];

  constructor(
    private fb:              FormBuilder,
    private route:           ActivatedRoute,
    private router:          Router,
    private productService:  ProductService,
    private locationService: LocationService,
    private snack:           MatSnackBar,
    private dialog:          MatDialog,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name:        ['', Validators.required],
      sku:         ['', Validators.required],
      barcode:     [''],
      description: [''],
      quantity:    [0, [Validators.required, Validators.min(0)]],
      unit:        ['pz', Validators.required],
      min_stock:   [0, [Validators.required, Validators.min(0)]],
      location_id: [null],
      category_id: [null],
      price:       [null],
      tracks_batches: [false],
      batch_number: [''],
      expiry_date:  [''],
      notes:       [''],
    });

    this.locationService.list().subscribe(locs => this.locations = locs);
    this.productService.categories().subscribe(cats => {
      this.categories = cats;
      this.filteredCategories = cats;
    });

    this.categoryInput.valueChanges.subscribe(val => {
      const text = (val || '').toLowerCase();
      this.filteredCategories = this.categories.filter(c => c.name.toLowerCase().includes(text));
      // If user cleared the field, clear the selection too
      if (!val) {
        this.selectedCategoryId = null;
        this.form.get('category_id')!.setValue(null);
      }
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit   = true;
      this.productId = +id;
      this.loading  = true;
      this.productService.get(this.productId).subscribe({
        next: p => {
          this.form.patchValue(p);
          this.initialQuantity = Number(p.quantity) || 0;
          this.initialTracksBatches = p.tracks_batches === true;
          if (p.photo_url) this.photoPreview = p.photo_url;
          // Restore category display
          if (p.category_id) {
            this.selectedCategoryId = p.category_id;
            this.categoryInput.setValue(p.category_name || p.category || '', { emitEvent: false });
          } else if (p.category) {
            // Legacy product with free-text category — show it but it's not linked
            this.categoryInput.setValue(p.category, { emitEvent: false });
          }
          this.loading = false;
        },
        error: () => { this.loading = false; this.router.navigate(['/products']); },
      });
    }

    // Pre-fill barcode from scanner navigation
    const bc = this.route.snapshot.queryParamMap.get('barcode');
    if (bc) this.form.get('barcode')!.setValue(bc);
  }

  onCategorySelected(cat: ProductCategory): void {
    this.selectedCategoryId = cat.id;
    this.form.get('category_id')!.setValue(cat.id);
    this.categoryInput.setValue(cat.name, { emitEvent: false });
  }

  createAndSelectCategory(): void {
    const name = (this.categoryInput.value || '').trim();
    if (!name) return;
    this.productService.createCategory(name).subscribe({
      next: cat => {
        this.categories = [...this.categories, cat].sort((a, b) => a.name.localeCompare(b.name));
        this.filteredCategories = this.categories;
        this.onCategorySelected(cat);
        this.snack.open(`Categoria "${cat.name}" creata`, 'OK', { duration: 2000 });
      },
      error: err => {
        const msg = err.error?.error || 'Errore nella creazione della categoria';
        this.snack.open(msg, 'OK', { duration: 3000 });
      },
    });
  }

  get showCreateOption(): boolean {
    const text = (this.categoryInput.value || '').trim().toLowerCase();
    if (!text) return false;
    return !this.categories.some(c => c.name.toLowerCase() === text);
  }

  get newCategoryName(): string {
    return (this.categoryInput.value || '').trim();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.setPhotoFile(input.files[0]);
    input.value = '';
  }

  private setPhotoFile(file: File): void {
    this.photoFile = file;
    const reader   = new FileReader();
    reader.onload  = e => (this.photoPreview = e.target?.result as string);
    reader.readAsDataURL(file);
  }

  openCameraCapture(): void {
    const ref = this.dialog.open(CameraCaptureDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      disableClose: false,
    });
    ref.afterClosed().subscribe((file: File | null) => {
      if (file) this.setPhotoFile(file);
    });
  }

  openBarcodeScanner(): void {
    const ref = this.dialog.open(BarcodeScanDialogComponent, {
      width: '400px',
      maxWidth: '95vw',
      disableClose: false,
    });
    ref.afterClosed().subscribe((code: string | null) => {
      if (code) this.form.get('barcode')!.setValue(code);
    });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const data = this.form.value;
    if (this.requiresBatchDetails && (!data.location_id || !data.batch_number?.trim() || !data.expiry_date)) {
      this.snack.open('Per i prodotti con lotti e scadenze, magazzino, lotto e scadenza sono obbligatori.', 'OK', { duration: 4000 });
      return;
    }
    this.saving = true;

    const request = this.isEdit
      ? this.productService.update(this.productId!, data)
      : this.productService.create(data);

    request.subscribe({
      next: product => {
        if (this.photoFile) {
          this.productService.uploadPhoto(product.id, this.photoFile).subscribe({
            next: () => this.done(product.id),
            error: () => {
              this.saving = false;
              this.snack.open('Prodotto salvato, ma caricamento foto fallito. Riprova.', 'OK', { duration: 5000 });
            },
          });
        } else {
          this.done(product.id);
        }
      },
      error: err => {
        this.saving = false;
        const msg = err.error?.error || 'Errore durante il salvataggio';
        this.snack.open(msg, 'OK', { duration: 4000 });
      },
    });
  }

  get requiresBatchDetails(): boolean {
    const tracksBatches = this.form?.get('tracks_batches')?.value === true;
    const quantity = Number(this.form?.get('quantity')?.value) || 0;
    return tracksBatches && quantity > 0 && (!this.initialTracksBatches || quantity > this.initialQuantity);
  }

  private done(id: number): void {
    this.saving = false;
    this.snack.open(this.isEdit ? 'Prodotto aggiornato' : 'Prodotto creato', 'OK', { duration: 3000 });
    this.router.navigate(['/products', id]);
  }
}
