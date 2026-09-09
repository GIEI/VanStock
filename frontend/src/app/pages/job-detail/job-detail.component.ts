import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { SignatureDialogComponent } from './signature-dialog/signature-dialog.component';
import { JobChatComponent } from './job-chat.component';
import { JobService } from '../../core/services/job.service';
import { MovementService, CreateMovementDto } from '../../core/services/movement.service';
import { ProductService } from '../../core/services/product.service';
import { LocationService } from '../../core/services/location.service';
import { VehicleBookingService } from '../../core/services/vehicle-booking.service';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { Job, JobPhoto } from '../../core/models/job.model';
import { Product } from '../../core/models/product.model';
import { Location } from '../../core/models/location.model';
import { InventoryService, ProductBatch } from '../../core/services/inventory.service';
import { PhotoUrlPipe } from '../../core/pipes/photo-url.pipe';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatDividerModule,
    MatTooltipModule,
    MatRadioModule,
    MatChipsModule,
    MatDialogModule,
    TranslateModule,
    SignatureDialogComponent,
    JobChatComponent,
    PhotoUrlPipe,
  ],
  templateUrl: './job-detail.component.html',
  styleUrls: ['./job-detail.component.scss'],
})
export class JobDetailComponent implements OnInit {
  job: Job | null = null;
  loading = true;
  saving  = false;

  // Photo upload
  uploadingPhoto: 'problem' | 'repair' | null = null;

  // Vehicle picker (shown when accepting)
  showVehiclePicker = false;
  availableVans: Location[] = [];
  loadingVans    = false;
  selectedVanId: number | null = null;
  selectedStartTime: string = '08:00';
  selectedEndTime: string = '12:00';
  existingBooking: any = null;
  mustUseVanId: number | null = null;

  // Stock check
  stockProducts: Product[] = [];
  stockLocationId: number | null = null;
  stockQuery = '';
  locations: Location[] = [];
  checkingStock = false;

  movForm!: FormGroup;
  allProducts: Product[] = [];
  availableBatches: ProductBatch[] = [];
  loadingBatches = false;
  movSaving = false;

  readonly movTypes = [
    { value: 'carico',  label: 'Carico esterno (acquistato)',  icon: 'add_circle'    },
    { value: 'scarico', label: 'Scarico (materiale usato)',    icon: 'remove_circle' },
  ];

  readonly statusOptions = [
    { value: 'aperto',     label: 'Open',       color: '#1d4ed8' },
    { value: 'in_corso',   label: 'In progress',color: '#d97706' },
    { value: 'completato', label: 'Completed', color: '#16a34a' },
    { value: 'annullato',  label: 'Cancelled',  color: '#dc2626' },
  ];

  readonly priorityOptions = [
    { value: 'bassa',   label: 'Low',    color: '#6b7280', icon: 'arrow_downward' },
    { value: 'normale', label: 'Normal', color: '#1d4ed8', icon: 'remove' },
    { value: 'alta',    label: 'High',   color: '#d97706', icon: 'arrow_upward' },
    { value: 'urgente', label: 'Urgent', color: '#dc2626', icon: 'priority_high' },
  ];

  constructor(
    private route:                  ActivatedRoute,
    private router:                 Router,
    private fb:                     FormBuilder,
    private jobService:             JobService,
    private movementService:        MovementService,
    private productService:         ProductService,
    private locationService:        LocationService,
    private vehicleBookingService:  VehicleBookingService,
    private snack:                  MatSnackBar,
    private dialog:                 MatDialog,
    private inventoryService:       InventoryService,
    public  auth:                   AuthService,
  ) {}

  ngOnInit(): void {
    this.movForm = this.fb.group({
      product_id:       [null, Validators.required],
      type:             ['scarico', Validators.required],
      quantity:         [1, [Validators.required, Validators.min(0.01)]],
      from_location_id: [null],
      to_location_id:   [null],
      batch_number:     [''],
      expiry_date:      [null],
      notes:            [''],
    });

    this.movForm.get('product_id')!.valueChanges.subscribe(() => this.onMovementContextChange());
    this.movForm.get('from_location_id')!.valueChanges.subscribe(locId => {
      this.loadProductsForMovement(locId);
      this.onMovementContextChange();
    });
    this.movForm.get('type')!.valueChanges.subscribe(() => {
      this.updateMovValidators();
      this.onMovementContextChange();
    });

    const id = +this.route.snapshot.paramMap.get('id')!;
    this.load(id);

    this.locationService.list().subscribe(l => {
      this.locations = l;
      if (this.job?.vehicle_booking) {
        this.updateMovValidators();
      }
    });
    
    // Initial load
    this.loadProductsForMovement();
  }

  loadProductsForMovement(locationId?: number | null): void {
    const params: any = { limit: 500 };
    if (locationId) params.location_id = locationId;
    this.productService.list(params).subscribe(r => {
      this.allProducts = r.data;
    });
  }

  load(id: number): void {
    this.loading = true;
    this.jobService.get(id).subscribe({
      next:  job => {
        this.job = job;
        this.loading = false;
        // Pre-fill if a vehicle is already booked
        if (this.job.vehicle_booking) {
          this.updateMovValidators();
          this.loadProductsForMovement(this.job.vehicle_booking.location_id);
        }
      },
      error: ()  => { this.loading = false; this.router.navigate(['/jobs']); },
    });
  }

  // ── Stock check ─────────────────────────────────────────────────────────────

  checkStock(): void {
    if (!this.stockLocationId) return;
    this.checkingStock = true;
    this.productService.list({
      location_id: this.stockLocationId,
      q: this.stockQuery || undefined,
      limit: 100,
    }).subscribe({
      next:  r => { this.stockProducts = r.data; this.checkingStock = false; },
      error: () => { this.checkingStock = false; },
    });
  }

  // ── Movement ────────────────────────────────────────────────────────────────

  updateMovValidators(): void {
    const type    = this.movForm.get('type')!.value;
    const fromCtrl = this.movForm.get('from_location_id')!;
    const toCtrl   = this.movForm.get('to_location_id')!;

    fromCtrl.setValidators(type === 'scarico' || type === 'trasferimento' ? Validators.required : null);
    toCtrl.setValidators(type === 'carico' || type === 'trasferimento'   ? Validators.required : null);

    // If there is a booked vehicle, pre-fill the location for the technician
    if (this.job?.vehicle_booking) {
      if (type === 'scarico') {
        fromCtrl.setValue(this.job.vehicle_booking.location_id);
      } else if (type === 'trasferimento') {
        // Decide whether to pre-fill FROM or TO.
        // Usually, técnicos fill their van from the warehouse: From WH -> To VAN
        // or unload van to WH: From VAN -> To WH.
        // Since we don't know the intent, we can pre-fill "to" as the default destination for carga.
        if (!toCtrl.value) toCtrl.setValue(this.job.vehicle_booking.location_id);
      } else if (type === 'carico') {
        if (!toCtrl.value) toCtrl.setValue(this.job.vehicle_booking.location_id);
      }
    }

    fromCtrl.updateValueAndValidity();
    toCtrl.updateValueAndValidity();
  }

  get filteredFromLocations(): Location[] {
    const type = this.movForm.get('type')?.value;
    if (this.job?.vehicle_booking && type === 'scarico') {
      return this.locations.filter(l => l.id === this.job!.vehicle_booking!.location_id);
    }
    return this.locations;
  }

  get filteredToLocations(): Location[] {
    return this.locations;
  }

  get movNeedsFrom(): boolean {
    const t = this.movForm.get('type')?.value;
    return t === 'scarico' || t === 'trasferimento';
  }

  get movNeedsTo(): boolean {
    const t = this.movForm.get('type')?.value;
    return t === 'carico' || t === 'trasferimento';
  }

  get selectedProduct(): Product | undefined {
    const id = this.movForm.get('product_id')?.value;
    return this.allProducts.find(p => p.id === id);
  }

  onMovementContextChange(): void {
    const pid = this.movForm.get('product_id')?.value;
    const locId = this.movForm.get('from_location_id')?.value;
    const type = this.movForm.get('type')?.value;

    if (pid && locId && (type === 'scarico' || type === 'trasferimento')) {
      this.loadingBatches = true;
      this.inventoryService.getBatches({ product_id: pid, location_id: locId }).subscribe({
        next: batches => {
          this.availableBatches = batches;
          this.loadingBatches = false;
        },
        error: () => {
          this.availableBatches = [];
          this.loadingBatches = false;
        }
      });
    } else {
      this.availableBatches = [];
    }
  }

  onBatchSelect(batch: ProductBatch): void {
    this.movForm.patchValue({
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date ? batch.expiry_date.split('T')[0] : null
    });
  }

  saveMovement(): void {
    if (this.movForm.invalid) { this.movForm.markAllAsTouched(); return; }
    this.movSaving = true;
    const raw = this.movForm.value;
    const dto: CreateMovementDto = {
      product_id:       raw.product_id,
      type:             raw.type,
      quantity:         raw.quantity,
      from_location_id: raw.from_location_id ?? undefined,
      to_location_id:   raw.to_location_id   ?? undefined,
      batch_number:     raw.batch_number || undefined,
      expiry_date:      raw.expiry_date || undefined,
      notes:            raw.notes || undefined,
      job_id:           this.job!.id,
    };
    this.movementService.create(dto).subscribe({
      next: () => {
        this.snack.open('Movimento registrato', 'OK', { duration: 3000 });
        this.movForm.reset({ type: 'scarico', quantity: 1 });
        this.updateMovValidators();
        this.movSaving = false;
        this.load(this.job!.id);
      },
      error: err => {
        this.movSaving = false;
        this.snack.open(err.error?.error || 'Errore', 'OK', { duration: 4000 });
      },
    });
  }

  // ── Work start ──────────────────────────────────────────────────────────────

  startWork(): void {
    if (!this.job) return;
    this.saving = true;
    this.jobService.start(this.job.id).subscribe({
      next: updated => {
        this.job = { ...this.job!, started_at: updated.started_at };
        this.saving = false;
        this.snack.open('Arrivo registrato', 'OK', { duration: 3000 });
      },
      error: err => { this.saving = false; this.snack.open(err.error?.error || 'Errore', 'OK', { duration: 3000 }); },
    });
  }

  // ── Photos ──────────────────────────────────────────────────────────────────

  get problemPhotos(): JobPhoto[] {
    return this.job?.photos?.filter(p => p.type === 'problem') ?? [];
  }

  get repairPhotos(): JobPhoto[] {
    return this.job?.photos?.filter(p => p.type === 'repair') ?? [];
  }

  onFileSelected(event: Event, type: 'problem' | 'repair'): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.job) return;
    const file = input.files[0];
    input.value = '';
    this.uploadingPhoto = type;
    this.jobService.uploadPhoto(this.job.id, file, type).subscribe({
      next: photo => {
        if (!this.job!.photos) this.job!.photos = [];
        this.job!.photos = [...this.job!.photos, photo];
        this.uploadingPhoto = null;
        this.snack.open('Foto caricata', 'OK', { duration: 2000 });
      },
      error: err => {
        this.uploadingPhoto = null;
        this.snack.open(err.error?.error || 'Errore upload foto', 'OK', { duration: 3000 });
      },
    });
  }

  deletePhoto(photo: JobPhoto): void {
    if (!this.job) return;
    this.jobService.deletePhoto(this.job.id, photo.id).subscribe({
      next: () => {
        this.job!.photos = this.job!.photos?.filter(p => p.id !== photo.id);
        this.snack.open('Foto eliminata', 'OK', { duration: 2000 });
      },
      error: () => this.snack.open('Errore', 'OK', { duration: 3000 }),
    });
  }

  photoUrl(url: string): string {
    if (url.startsWith('http')) return url;
    const base = environment.apiUrl.replace('/api', '');
    return base + url;
  }

  isVideo(url: string): boolean {
    const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
    return ['mp4', 'mov', 'avi', 'webm', 'mkv', '3gp'].includes(ext);
  }

  // ── Vehicle picker ──────────────────────────────────────────────────────────

  openVehiclePicker(): void {
    this.showVehiclePicker = true;
    this.selectedVanId     = null;
    this.existingBooking   = null;
    this.mustUseVanId      = null;
    this.loadAvailableVans();
  }

  cancelVehiclePicker(): void {
    this.showVehiclePicker = false;
  }

  onPeriodChange(): void {
    this.selectedVanId = null;
    // Validate time range
    if (this.isInvalidTimeRange()) {
      return;
    }
    this.loadAvailableVans();
  }

  private isInvalidTimeRange(): boolean {
    if (!this.selectedStartTime || !this.selectedEndTime) return false;
    return this.selectedStartTime >= this.selectedEndTime;
  }

  private loadAvailableVans(): void {
    if (!this.job?.scheduled_date) return;
    if (this.isInvalidTimeRange()) {
      this.snack.open('L\'orario di fine non può essere antecedente a quello di inizio', 'OK', { duration: 3000 });
      return;
    }
    this.loadingVans = true;
    const dateStr = this.formatDate(new Date(this.job.scheduled_date));
    this.vehicleBookingService.availableVans(dateStr, this.selectedStartTime, this.selectedEndTime).subscribe({
      next:  response => {
        this.availableVans = response.available;
        this.existingBooking = response.existing_booking;
        this.mustUseVanId = response.must_use_van_id;
        // If user must use a specific van, auto-select it
        if (this.mustUseVanId !== null) {
          this.selectedVanId = this.mustUseVanId;
        }
        this.loadingVans = false;
      },
      error: ()   => { this.loadingVans = false; },
    });
  }

  confirmAccept(): void {
    if (!this.job || !this.selectedVanId) return;
    if (this.isInvalidTimeRange()) {
      this.snack.open('L\'orario di fine non può essere antecedente a quello di inizio', 'OK', { duration: 3000 });
      return;
    }
    this.saving = true;
    this.jobService.setStatus(this.job.id, 'in_corso', this.selectedVanId, this.selectedStartTime, this.selectedEndTime).subscribe({
      next: updated => {
        this.job = { ...this.job!, status: updated.status, vehicle_booking: updated.vehicle_booking };
        this.showVehiclePicker = false;
        this.saving = false;
        this.snack.open('Lavoro accettato', 'OK', { duration: 3000 });
      },
      error: err => {
        this.saving = false;
        this.snack.open(err.error?.error || 'Errore', 'OK', { duration: 4000 });
      },
    });
  }

  // ── Status change ────────────────────────────────────────────────────────────

  setStatus(status: Job['status']): void {
    if (!this.job) return;
    const labels: Record<string, string> = {
      completato: 'Chiudere definitivamente il lavoro come "Completato"?',
      annullato:  'Annullare il lavoro?',
    };
    if (!confirm(labels[status] ?? 'Cambiare stato?')) return;

    this.jobService.setStatus(this.job.id, status).subscribe({
      next: updated => {
        this.job = { ...this.job!, ...updated };
        this.snack.open('Stato aggiornato', 'OK', { duration: 3000 });
      },
      error: err => this.snack.open(err.error?.error || 'Errore', 'OK', { duration: 4000 }),
    });
  }

  openSignatureDialog(): void {
    if (!this.job) return;
    const dialogRef = this.dialog.open(SignatureDialogComponent, {
      width: '500px',
      maxWidth: '95vw',   // allow full-width on narrow phones
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.saveSignature(result);
      }
    });
  }

  private saveSignature(signatureBase64: string): void {
    if (!this.job) return;
    this.saving = true;
    this.jobService.sign(this.job.id, signatureBase64).subscribe({
      next: updated => {
        this.job = { ...this.job!, ...updated };
        this.saving = false;
        this.snack.open('Lavoro completato e firmato', 'OK', { duration: 3000 });
      },
      error: err => {
        this.saving = false;
        this.snack.open(err.error?.error || 'Errore salvataggio firma', 'OK', { duration: 4000 });
      }
    });
  }

  downloadReport(): void {
    if (!this.job) return;
    this.jobService.getReportBlob(this.job.id).subscribe({
      next: blob => {
        const url  = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href  = url;
        link.download = `Rapporto_${this.job?.id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: err => this.snack.open('Errore download report', 'OK', { duration: 4000 })
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  statusInfo(value: string) {
    return this.statusOptions.find(s => s.value === value) ?? this.statusOptions[0];
  }

  priorityInfo(value: string) {
    return this.priorityOptions.find(p => p.value === value) ?? this.priorityOptions[1];
  }

  get canAccept(): boolean {
    return this.job?.status === 'aperto';
  }

  get canClose(): boolean {
    return this.job?.status === 'in_corso';
  }

  get isAssigned(): boolean {
    return this.job?.assigned_to === this.auth.currentUser?.id;
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin;
  }

  movIcon(type: string): string {
    return { carico: 'add_circle', scarico: 'remove_circle', trasferimento: 'swap_horiz' }[type] ?? 'swap_horiz';
  }

  movColor(type: string): string {
    return { carico: '#22c55e', scarico: '#f97316', trasferimento: '#6366f1' }[type] ?? '#6366f1';
  }

  stockLevel(p: Product): 'ok' | 'warn' | 'empty' {
    const qty = +p.quantity;
    if (qty === 0) return 'empty';
    if (qty < +p.min_stock) return 'warn';
    return 'ok';
  }

  getTimeLabel(time: string, customTime?: string): string {
    const labels: { [key: string]: string } = {
      'morning': '🌅 Mattina',
      'afternoon': '☀️ Pomeriggio',
      'all_day': '📅 Tutto il giorno',
      'custom': customTime ? `🕐 ${customTime.substring(0, 5)}` : '🕐 Custom'
    };
    return labels[time] || time;
  }

  private formatDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
