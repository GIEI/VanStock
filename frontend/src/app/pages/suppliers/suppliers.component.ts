import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SupplierService } from '../../core/services/supplier.service';
import { AuthService } from '../../core/services/auth.service';
import { Supplier } from '../../core/models/supplier.model';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-suppliers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
    TranslateModule,
  ],
  templateUrl: './suppliers.component.html',
  styleUrls: ['./suppliers.component.scss'],
})
export class SuppliersComponent implements OnInit {
  suppliers: Supplier[] = [];
  loading   = false;
  form!:     FormGroup;
  editingId?: number;
  showForm  = false;
  searchQ   = '';

  constructor(
    private fb:              FormBuilder,
    private supplierService: SupplierService,
    private snack:           MatSnackBar,
    private dialog:          MatDialog,
    public  auth:            AuthService,
    private translate:       TranslateService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.load();
  }

  initForm(): void {
    this.form = this.fb.group({
      name:          ['', Validators.required],
      contact_name:  [''],
      phone:         [''],
      email:         ['', [Validators.email]],
      website:       [''],
      address:       [''],
      notes:         [''],
      delivery_days: ['', [Validators.min(1), Validators.max(365)]],
    });
  }

  load(): void {
    this.loading = true;
    this.supplierService.list(this.searchQ || undefined).subscribe({
      next:  s => { this.suppliers = s; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openCreate(): void {
    this.editingId = undefined;
    this.form.reset();
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openEdit(s: Supplier): void {
    this.editingId = s.id;
    this.form.patchValue(s);
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
    const req = this.editingId
      ? this.supplierService.update(this.editingId, data)
      : this.supplierService.create(data);

    req.subscribe({
      next: () => {
        this.snack.open(
          this.translate.instant(this.editingId ? 'SUPPLIERS.UPDATED' : 'SUPPLIERS.CREATED'),
          'OK', { duration: 3000 }
        );
        this.cancel();
        this.load();
      },
      error: () => this.snack.open(this.translate.instant('SUPPLIERS.SAVE_ERROR'), 'OK', { duration: 3000 }),
    });
  }

  delete(s: Supplier): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title:   this.translate.instant('SUPPLIERS.DELETE_CONFIRM_TITLE'),
        message: this.translate.instant('SUPPLIERS.DELETE_CONFIRM_MSG').replace('{name}', s.name),
      },
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.supplierService.delete(s.id).subscribe({
        next:  () => { this.snack.open(this.translate.instant('SUPPLIERS.DELETED'), 'OK', { duration: 3000 }); this.load(); },
        error: err => {
          const msg = err.error?.error || this.translate.instant('SUPPLIERS.DELETE_ERROR');
          this.snack.open(msg, 'OK', { duration: 4000 });
        },
      });
    });
  }
}
