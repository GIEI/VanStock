import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { LocationService } from '../../core/services/location.service';
import { Location, LocationStatus } from '../../core/models/location.model';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-locations',
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
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatMenuModule,
    TranslateModule,
  ],
  templateUrl: './locations.component.html',
  styleUrls: ['./locations.component.scss'],
})
export class LocationsComponent implements OnInit {
  locations: Location[] = [];
  loading = false;
  form!: FormGroup;
  editingId?: number;
  showForm = false;

  readonly locationTypes = [
    { value: 'warehouse', labelKey: 'LOCATIONS.TYPE_WAREHOUSE', icon: 'warehouse' },
    { value: 'van',       labelKey: 'LOCATIONS.TYPE_VAN',       icon: 'local_shipping' },
    { value: 'site',      labelKey: 'LOCATIONS.TYPE_SITE',      icon: 'construction' },
    { value: 'other',     labelKey: 'LOCATIONS.TYPE_OTHER',     icon: 'place' },
  ];

  readonly vanStatuses: { value: LocationStatus; labelKey: string; color: string }[] = [
    { value: 'disponibile',     labelKey: 'LOCATIONS.STATUS_DISPONIBILE',  color: 'success' },
    { value: 'occupato',        labelKey: 'LOCATIONS.STATUS_OCCUPATO',     color: 'warn' },
    { value: 'in_manutenzione', labelKey: 'LOCATIONS.STATUS_MANUTENZIONE', color: 'accent' },
  ];

  constructor(
    private fb:              FormBuilder,
    private locationService: LocationService,
    private snack:           MatSnackBar,
    private dialog:          MatDialog,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.load();
  }

  get usesAddress(): boolean {
    const t = this.form?.get('type')?.value;
    return t === 'warehouse' || t === 'site';
  }

  initForm(): void {
    this.form = this.fb.group({
      name:        ['', Validators.required],
      type:        ['van', Validators.required],
      status:      ['disponibile'],
      plate:       [''],
      address:     [''],
      description: [''],
    });
  }

  load(): void {
    this.loading = true;
    this.locationService.list().subscribe({
      next: locs => { this.locations = locs; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openCreate(): void {
    this.editingId = undefined;
    this.form.reset({ type: 'van' });
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openEdit(loc: Location): void {
    this.editingId = loc.id;
    this.form.patchValue(loc);
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancel(): void {
    this.showForm = false;
    this.editingId = undefined;
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const data = this.form.value;
    const request = this.editingId
      ? this.locationService.update(this.editingId, data)
      : this.locationService.create(data);

    request.subscribe({
      next: () => {
        this.snack.open(this.editingId ? 'Posizione aggiornata' : 'Posizione creata', 'OK', { duration: 3000 });
        this.cancel();
        this.load();
      },
      error: () => this.snack.open('Errore', 'OK', { duration: 3000 }),
    });
  }

  delete(loc: Location): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'CONFIRM.DELETE_LOCATION_TITLE', message: 'CONFIRM.DELETE_LOCATION_MSG', messageParams: { name: loc.name } },
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.locationService.delete(loc.id).subscribe({
        next: () => { this.snack.open('Eliminata', 'OK', { duration: 3000 }); this.load(); },
        error: err => {
          const msg = err.error?.error || 'Impossibile eliminare (potrebbe contenere prodotti)';
          this.snack.open(msg, 'OK', { duration: 4000 });
        },
      });
    });
  }

  typeInfo(type: string) {
    return this.locationTypes.find(t => t.value === type) ?? this.locationTypes[3];
  }

  statusInfo(status: string) {
    return this.vanStatuses.find(s => s.value === status) ?? this.vanStatuses[0];
  }

  updateStatus(loc: Location, status: LocationStatus): void {
    this.locationService.updateStatus(loc.id, status).subscribe({
      next: updated => {
        loc.status = updated.status;
        this.snack.open('Stato aggiornato', 'OK', { duration: 2000 });
      },
      error: () => this.snack.open('Errore aggiornamento stato', 'OK', { duration: 3000 }),
    });
  }
}
