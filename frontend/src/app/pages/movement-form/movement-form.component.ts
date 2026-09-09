import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MovementService } from '../../core/services/movement.service';
import { ProductService } from '../../core/services/product.service';
import { LocationService } from '../../core/services/location.service';
import { JobService } from '../../core/services/job.service';
import { InventoryService, ProductBatch } from '../../core/services/inventory.service';
import { Product } from '../../core/models/product.model';
import { Location } from '../../core/models/location.model';
import { Job } from '../../core/models/job.model';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-movement-form',
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
    TranslateModule,
  ],
  templateUrl: './movement-form.component.html',
  styleUrls: ['./movement-form.component.scss'],
})
export class MovementFormComponent implements OnInit {
  form!: FormGroup;
  products:  Product[]  = [];
  locations: Location[] = [];
  jobs:      Job[]      = [];
  saving    = false;
  showNotes = false;
  selectedProduct: Product | null = null;
  currentStock: number | null = null;
  currentLocationName: string | null = null;
  availableBatches: ProductBatch[] = [];

  constructor(
    private fb:               FormBuilder,
    private route:            ActivatedRoute,
    private router:           Router,
    private movementService:  MovementService,
    private productService:   ProductService,
    private locationService:  LocationService,
    private jobService:       JobService,
    private inventoryService: InventoryService,
    private snack:            MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      product_id:       [null, Validators.required],
      type:             ['carico', Validators.required],
      quantity:         [1, [Validators.required, Validators.min(0.01)]],
      from_location_id: [null],
      to_location_id:   [null],
      notes:            [''],
      job_id:           [null],
      purchase_price:   [null, [Validators.min(0)]],
      batch_number:     [''],
      expiry_date:      [''],
    });

    this.form.get('type')!.valueChanges.subscribe(() => {
      this.updateLocationValidators();
      this.updatePurchasePriceValidator();
      this.updateCurrentStock();
      this.loadBatches();
      this.form.get('batch_number')!.setValue('');
    });
    this.form.get('from_location_id')!.valueChanges.subscribe(() => {
      this.updateCurrentStock();
      this.loadBatches();
      this.form.get('batch_number')!.setValue('');
    });
    this.form.get('to_location_id')!.valueChanges.subscribe(() => this.updateCurrentStock());
    this.updateLocationValidators();

    // Pre-fill from query params
    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('product_id')) this.form.get('product_id')!.setValue(+qp.get('product_id')!);
    if (qp.get('type'))       this.form.get('type')!.setValue(qp.get('type'));

    this.productService.list({ limit: 500 }).subscribe(res => {
      this.products = res.data;
      if (this.form.get('product_id')?.value) {
        this.onProductChange(this.form.get('product_id')!.value);
      }
    });

    this.locationService.list().subscribe(locs => this.locations = locs);
    this.jobService.list({ status: 'aperto' }).subscribe(jobs => this.jobs = jobs);
    this.updatePurchasePriceValidator();
  }

  updatePurchasePriceValidator(): void {
    const type = this.form.get('type')!.value;
    const priceCtrl = this.form.get('purchase_price')!;
    priceCtrl.setValidators(type === 'carico' ? [Validators.required, Validators.min(0)] : [Validators.min(0)]);
    priceCtrl.updateValueAndValidity();
  }

  updateLocationValidators(): void {
    const type = this.form.get('type')!.value;
    const fromCtrl = this.form.get('from_location_id')!;
    const toCtrl   = this.form.get('to_location_id')!;

    const needsFrom = type === 'scarico' || type === 'trasferimento';
    const needsTo   = type === 'carico'  || type === 'trasferimento';

    fromCtrl.setValidators(needsFrom ? Validators.required : null);
    toCtrl.setValidators(needsTo ? Validators.required : null);
    fromCtrl.updateValueAndValidity();
    toCtrl.updateValueAndValidity();
  }

  onProductChange(id: number): void {
    const basicProd = this.products.find(p => p.id === id);
    if (!basicProd) return;

    this.productService.get(id).subscribe(fullProd => {
      this.selectedProduct = fullProd;
      // Auto-populate from_location_id if product has a default location
      if (fullProd.location_id && !this.form.get('from_location_id')?.value) {
        this.form.get('from_location_id')!.setValue(fullProd.location_id);
      }
      this.updateCurrentStock();
      this.loadBatches();
    });
  }

  updateCurrentStock(): void {
    if (!this.selectedProduct) {
      this.currentStock = null;
      this.currentLocationName = null;
      return;
    }

    const type = this.form.get('type')!.value;
    const locId = type === 'carico' 
      ? this.form.get('to_location_id')!.value 
      : this.form.get('from_location_id')!.value;

    if (!locId) {
      // No specific location selected: show total
      this.currentStock = this.selectedProduct.quantity;
      this.currentLocationName = null;
      return;
    }

    // specific location selected: find in stocks
    const stock = this.selectedProduct.stocks?.find(s => s.location_id === +locId);
    this.currentStock = stock ? stock.quantity : 0;
    
    const location = this.locations.find(l => l.id === +locId);
    this.currentLocationName = location ? location.name : null;
  }

  loadBatches(): void {
    const type  = this.form.get('type')!.value;
    const flid  = this.form.get('from_location_id')!.value;
    const pid   = this.selectedProduct?.id;
    const needsBatches = (type === 'scarico' || type === 'trasferimento') && this.selectedProduct?.tracks_batches && pid && flid;
    if (!needsBatches) { this.availableBatches = []; return; }
    this.inventoryService.getBatches({ product_id: pid, location_id: flid }).subscribe({
      next: batches => this.availableBatches = batches.filter(b => b.quantity > 0).sort((a, b) => {
        if (!a.expiry_date && !b.expiry_date) return 0;
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return a.expiry_date.localeCompare(b.expiry_date);
      }),
      error: () => this.availableBatches = [],
    });
  }

  get isTransfer(): boolean { return this.form.get('type')?.value === 'trasferimento'; }
  get showBatchFields(): boolean {
    return this.form.get('type')?.value === 'carico' && !!this.selectedProduct?.tracks_batches;
  }
  get showBatchSelector(): boolean {
    const type = this.form.get('type')?.value;
    return (type === 'scarico' || type === 'trasferimento') && !!this.selectedProduct?.tracks_batches && this.availableBatches.length > 0;
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const data = this.form.value;
    this.movementService.create(data).subscribe({
      next: () => {
        this.snack.open('Movimento registrato', 'OK', { duration: 3000 });
        const pid = data.product_id;
        this.router.navigate(['/products', pid]);
      },
      error: err => {
        this.saving = false;
        this.snack.open(err.error?.error || 'Errore', 'OK', { duration: 4000 });
      },
    });
  }
}
