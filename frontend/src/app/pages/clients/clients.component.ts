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
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ClientService } from '../../core/services/client.service';
import { AuthService } from '../../core/services/auth.service';
import { Client } from '../../core/models/client.model';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
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
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss'],
})
export class ClientsComponent implements OnInit {
  clients: Client[] = [];
  loading = false;
  form!: FormGroup;
  editingId?: number;
  showForm = false;
  searchQ = '';

  constructor(
    private fb:            FormBuilder,
    private clientService: ClientService,
    private snack:         MatSnackBar,
    private dialog:        MatDialog,
    public  auth:          AuthService,
    private translate:     TranslateService,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.load();
  }

  initForm(): void {
    this.form = this.fb.group({
      name:    ['', Validators.required],
      phone:   [''],
      email:   ['', [Validators.email]],
      address: [''],
      notes:   [''],
    });
  }

  load(): void {
    this.loading = true;
    this.clientService.list(this.searchQ || undefined).subscribe({
      next:  c => { this.clients = c; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  openCreate(): void {
    this.editingId = undefined;
    this.form.reset();
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openEdit(c: Client): void {
    this.editingId = c.id;
    this.form.patchValue(c);
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
      ? this.clientService.update(this.editingId, data)
      : this.clientService.create(data);

    req.subscribe({
      next: () => {
        this.snack.open(this.translate.instant(this.editingId ? 'CLIENTS.UPDATED' : 'CLIENTS.CREATED'), 'OK', { duration: 3000 });
        this.cancel();
        this.load();
      },
      error: () => this.snack.open(this.translate.instant('CLIENTS.SAVE_ERROR'), 'OK', { duration: 3000 }),
    });
  }

  delete(c: Client): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.translate.instant('CLIENTS.DELETE_CONFIRM_TITLE'),
        message: this.translate.instant('CLIENTS.DELETE_CONFIRM_MSG').replace('{name}', c.name),
      },
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.clientService.delete(c.id).subscribe({
        next:  () => { this.snack.open(this.translate.instant('CLIENTS.DELETED'), 'OK', { duration: 3000 }); this.load(); },
        error: err => {
          const msg = err.error?.error || this.translate.instant('CLIENTS.DELETE_ERROR');
          this.snack.open(msg, 'OK', { duration: 4000 });
        },
      });
    });
  }
}
