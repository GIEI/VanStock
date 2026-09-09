import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { Company, User } from '../../core/models/user.model';
import { TranslateModule } from '@ngx-translate/core';

export interface UserDialogData {
  user:                  User | null;
  companies?:            Company[];
  preselectedCompanyId?: number;
}

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatSlideToggleModule,
    MatDialogModule, MatIconModule, MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ (data.user ? 'USER_FORM.EDIT_TITLE' : 'USER_FORM.NEW_TITLE') | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">

        <div class="photo-row">
          <div class="photo-preview">
            <img *ngIf="photoPreviewUrl" [src]="photoPreviewUrl" alt="">
            <mat-icon *ngIf="!photoPreviewUrl">person</mat-icon>
          </div>
          <div class="photo-actions">
            <button mat-stroked-button type="button" (click)="photoInput.click()">
              <mat-icon>upload</mat-icon> {{ 'USER_FORM.UPLOAD_PHOTO' | translate }}
            </button>
            <button mat-button color="warn" type="button" *ngIf="photoPreviewUrl" (click)="clearPhoto()">
              {{ 'USER_FORM.REMOVE_PHOTO' | translate }}
            </button>
            <input #photoInput type="file" accept="image/*" hidden (change)="onPhotoSelected($event)">
          </div>
        </div>

        <!-- Invite toggle — creation only -->
        <div *ngIf="!data.user" class="invite-toggle">
          <mat-slide-toggle [checked]="sendInvite" (change)="toggleInvite($event.checked)">
            {{ 'USER_FORM.SEND_INVITE' | translate }}
          </mat-slide-toggle>
          <span class="invite-hint" *ngIf="sendInvite">{{ 'USER_FORM.INVITE_HINT' | translate }}</span>
        </div>

        <!-- Company selector — superadmin only, creation only -->
        <mat-form-field appearance="outline" class="full-width"
                        *ngIf="auth.isSuperAdmin && !data.user">
          <mat-label>{{ 'USER_FORM.COMPANY' | translate }} *</mat-label>
          <mat-select formControlName="company_id">
            <mat-option *ngFor="let c of data.companies" [value]="c.id">
              {{c.name}}
            </mat-option>
          </mat-select>
          <mat-error>{{ 'USER_FORM.SELECT_COMPANY' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'USER_FORM.NAME' | translate }}</mat-label>
          <input matInput formControlName="name">
          <mat-error>{{ 'USER_FORM.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'USER_FORM.EMAIL' | translate }}</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="off">
          <mat-error>{{ 'USER_FORM.REQUIRED' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="!sendInvite">
          <mat-label>{{ (data.user ? 'USER_FORM.NEW_PASSWORD' : 'USER_FORM.PASSWORD') | translate }}</mat-label>
          <input matInput [type]="hidePass ? 'password' : 'text'" formControlName="password" autocomplete="new-password">
          <button mat-icon-button matSuffix type="button" (click)="hidePass = !hidePass">
            <mat-icon>{{hidePass ? 'visibility_off' : 'visibility'}}</mat-icon>
          </button>
          <mat-hint *ngIf="!data.user">{{ 'USER_FORM.MIN_8' | translate }}</mat-hint>
          <mat-error>{{ 'USER_FORM.MIN_8' | translate }}</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ 'USER_FORM.ROLE' | translate }}</mat-label>
          <mat-select formControlName="role">
            <mat-option value="user">{{ 'USER_FORM.ROLE_USER' | translate }}</mat-option>
            <mat-option value="admin">{{ 'USER_FORM.ROLE_ADMIN' | translate }}</mat-option>
            <mat-option value="superadmin" *ngIf="auth.isSuperAdmin">{{ 'USER_FORM.ROLE_SUPERADMIN' | translate }}</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-slide-toggle formControlName="is_active" *ngIf="data.user">{{ 'USER_FORM.ACTIVE' | translate }}</mat-slide-toggle>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>{{ 'USER_FORM.CANCEL' | translate }}</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="saving">{{ 'USER_FORM.SAVE' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-form { display: flex; flex-direction: column; gap: 8px; padding-top: 8px; min-width: 340px; }
    .full-width { width: 100%; }
    .photo-row { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
    .photo-preview { width: 64px; height: 64px; border-radius: 50%; overflow: hidden; background: #eee; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .photo-preview img { width: 100%; height: 100%; object-fit: cover; }
    .photo-preview mat-icon { color: #999; font-size: 36px; width: 36px; height: 36px; }
    .photo-actions { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }
    .invite-toggle { display: flex; flex-direction: column; gap: 4px; padding: 8px 0 4px 0; }
    .invite-hint { font-size: 12px; color: #666; }
  `],
})
export class UserFormDialogComponent implements OnInit {
  form!: FormGroup;
  saving     = false;
  hidePass   = true;
  sendInvite = false;
  photoFile: File | null = null;
  photoRemoved = false;
  photoPreviewUrl: string | null = null;

  /** Limite dimensione foto profilo (deve combaciare con multer nel backend). */
  readonly maxPhotoMb = 2;
  private readonly maxPhotoBytes = this.maxPhotoMb * 1024 * 1024;

  constructor(
    private fb:       FormBuilder,
    public  auth:     AuthService,
    private userSvc:  UserService,
    private api:      ApiService,
    private snack:    MatSnackBar,
    public  dialogRef: MatDialogRef<UserFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: UserDialogData,
  ) {}

  ngOnInit(): void {
    const companyValidators = this.auth.isSuperAdmin && !this.data.user
      ? [Validators.required]
      : [];

    this.form = this.fb.group({
      company_id: [this.data.preselectedCompanyId ?? null, companyValidators],
      name:       [this.data.user?.name ?? '', Validators.required],
      email:      [this.data.user?.email ?? '', [Validators.required, Validators.email]],
      password:   ['', this.data.user ? [Validators.minLength(8)] : [Validators.required, Validators.minLength(8)]],
      role:       [this.data.user?.role ?? 'admin', Validators.required],
      is_active:  [this.data.user?.is_active ?? true],
    });

    if (this.data.user?.photo_url) {
      this.photoPreviewUrl = this.api.getBaseUrl().replace(/\/api$/, '') + this.data.user.photo_url;
    }
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > this.maxPhotoBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      this.snack.open(
        `Immagine troppo grande (${sizeMb} MB). Dimensione massima consentita: ${this.maxPhotoMb} MB.`,
        'OK',
        { duration: 5000, panelClass: ['snack-error'] },
      );
      input.value = '';
      return;
    }
    this.photoFile = file;
    this.photoRemoved = false;
    const reader = new FileReader();
    reader.onload = e => { this.photoPreviewUrl = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  clearPhoto(): void {
    this.photoFile = null;
    this.photoPreviewUrl = null;
    this.photoRemoved = !!this.data.user?.photo_url;
  }

  toggleInvite(enabled: boolean): void {
    this.sendInvite = enabled;
    const passwordCtrl = this.form.get('password');
    if (!passwordCtrl) return;
    if (enabled) {
      passwordCtrl.clearValidators();
      passwordCtrl.setValue('');
    } else {
      passwordCtrl.setValidators([Validators.required, Validators.minLength(8)]);
    }
    passwordCtrl.updateValueAndValidity();
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving = true;
    const v = this.form.value;

    const payload: Record<string, unknown> = { name: v.name, email: v.email, role: v.role };
    if (!this.data.user && this.auth.isSuperAdmin && v.company_id) {
      payload['company_id'] = v.company_id;
    }
    if (v.password)     payload['password']   = v.password;
    if (this.data.user) payload['is_active']  = v.is_active;

    const op = this.data.user
      ? this.userSvc.update(this.data.user.id, payload as never)
      : (this.sendInvite
          ? this.userSvc.invite({
              email: v.email, name: v.name, role: v.role,
              company_id: this.auth.isSuperAdmin ? v.company_id : undefined,
            })
          : this.userSvc.create(payload as never));

    op.subscribe({
      next: (saved) => {
        const id = saved.id;
        const afterPhoto = () => { this.snack.open('Salvato', 'OK', { duration: 3000 }); this.dialogRef.close(true); };
        if (this.photoFile) {
          this.userSvc.uploadPhoto(id, this.photoFile).subscribe({
            next: afterPhoto,
            error: err => {
              this.saving = false;
              const msg = err.status === 413
                ? `Immagine troppo grande. Dimensione massima consentita: ${this.maxPhotoMb} MB.`
                : (err.error?.error || 'Errore upload foto');
              this.snack.open(msg, 'OK', { duration: 4000 });
            },
          });
        } else if (this.photoRemoved && this.data.user?.photo_url) {
          this.userSvc.deletePhoto(id).subscribe({ next: afterPhoto, error: afterPhoto });
        } else {
          afterPhoto();
        }
      },
      error: err => {
        this.saving = false;
        const code = err.error?.error;
        if (code === 'LICENSE_LIMIT_EXCEEDED') {
          const msg = `Limite licenze raggiunto (${err.error?.used ?? '?'} / ${err.error?.max ?? '?'}). Contatta il supporto per un upgrade.`;
          this.snack.open(msg, 'OK', { duration: 6000, panelClass: ['snack-error'] });
        } else if (code === 'SUBSCRIPTION_EXPIRED' || code === 'SUBSCRIPTION_INACTIVE' || code === 'NO_SUBSCRIPTION') {
          this.snack.open(err.error?.reason || 'Abbonamento non attivo', 'OK', { duration: 6000, panelClass: ['snack-error'] });
        } else if (code === 'SMTP_NOT_CONFIGURED') {
          this.snack.open('SMTP non configurato per questa company. Configura prima le impostazioni email.', 'OK', { duration: 6000, panelClass: ['snack-error'] });
        } else if (code === 'SMTP_SEND_FAILED') {
          this.snack.open(`Invio email fallito: ${err.error?.reason || 'errore SMTP'}`, 'OK', { duration: 6000, panelClass: ['snack-error'] });
        } else {
          this.snack.open(err.error?.error || 'Errore', 'OK', { duration: 4000 });
        }
      },
    });
  }
}
