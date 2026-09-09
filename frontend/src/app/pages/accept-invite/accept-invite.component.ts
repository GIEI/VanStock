import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TranslateModule } from '@ngx-translate/core';
import { InvitesService, InviteInfo } from '../../core/services/invites.service';

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    TranslateModule,
  ],
  template: `
    <div class="page">
      <mat-card class="card">
        <mat-card-content>
          <h2>{{ 'INVITE.TITLE' | translate }}</h2>

          <div *ngIf="loadingInfo" class="center"><mat-spinner diameter="32"></mat-spinner></div>

          <div *ngIf="!loadingInfo && error" class="error">
            <mat-icon>error_outline</mat-icon>
            <p>{{ ('INVITE.' + error) | translate }}</p>
            <a mat-button routerLink="/login">{{ 'COMMON.GO_TO_LOGIN' | translate }}</a>
          </div>

          <ng-container *ngIf="info && !done && !error">
            <p class="welcome">{{ 'INVITE.WELCOME' | translate:{ name: info.name, company: info.company_name } }}</p>
            <p class="email-hint">{{ info.email }}</p>

            <form [formGroup]="form" (ngSubmit)="submit()">
              <mat-form-field appearance="outline" class="full">
                <mat-label>{{ 'INVITE.PASSWORD' | translate }}</mat-label>
                <input matInput [type]="hidePass ? 'password' : 'text'" formControlName="password" autocomplete="new-password">
                <button mat-icon-button matSuffix type="button" (click)="hidePass = !hidePass">
                  <mat-icon>{{hidePass ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-hint>{{ 'USER_FORM.MIN_8' | translate }}</mat-hint>
                <mat-error>{{ 'USER_FORM.MIN_8' | translate }}</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full">
                <mat-label>{{ 'INVITE.CONFIRM_PASSWORD' | translate }}</mat-label>
                <input matInput [type]="hidePass ? 'password' : 'text'" formControlName="confirm" autocomplete="new-password">
                <mat-error *ngIf="form.hasError('mismatch')">{{ 'INVITE.MISMATCH' | translate }}</mat-error>
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit" [disabled]="loading || form.invalid">
                <mat-icon *ngIf="!loading">check</mat-icon>
                <mat-spinner *ngIf="loading" diameter="18" class="inline-spinner"></mat-spinner>
                {{ 'INVITE.ACCEPT' | translate }}
              </button>
            </form>
          </ng-container>

          <div *ngIf="done" class="success">
            <mat-icon color="primary">check_circle</mat-icon>
            <p>{{ 'INVITE.SUCCESS' | translate }}</p>
            <a mat-raised-button color="primary" routerLink="/login">{{ 'COMMON.GO_TO_LOGIN' | translate }}</a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; background: #f5f5f5; }
    .card { max-width: 420px; width: 100%; }
    h2 { margin: 0 0 16px 0; }
    .full { width: 100%; display: block; }
    .center { text-align: center; padding: 24px; }
    .welcome { font-size: 16px; margin-bottom: 4px; }
    .email-hint { color: #666; font-size: 13px; margin-bottom: 16px; }
    .error, .success { text-align: center; padding: 16px 0; }
    .error mat-icon { font-size: 48px; width: 48px; height: 48px; color: #c62828; }
    .success mat-icon { font-size: 48px; width: 48px; height: 48px; }
    .inline-spinner { display: inline-block; vertical-align: middle; margin-right: 6px; }
  `],
})
export class AcceptInviteComponent implements OnInit {
  form!: FormGroup;
  token       = '';
  info: InviteInfo | null = null;
  loadingInfo = true;
  loading     = false;
  done        = false;
  error       = '';
  hidePass    = true;

  constructor(
    private fb:    FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private svc:   InvitesService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.form = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm:  ['', [Validators.required]],
    }, { validators: this.matchValidator });

    if (!this.token) {
      this.error = 'INVITE_NOT_FOUND';
      this.loadingInfo = false;
      return;
    }
    this.svc.info(this.token).subscribe({
      next: i => { this.info = i; this.loadingInfo = false; },
      error: err => {
        this.loadingInfo = false;
        this.error = err.error?.error || 'INVITE_NOT_FOUND';
      },
    });
  }

  private matchValidator(group: any) {
    return group.value.password && group.value.confirm && group.value.password !== group.value.confirm
      ? { mismatch: true }
      : null;
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;
    this.svc.accept(this.token, this.form.value.password).subscribe({
      next: () => { this.loading = false; this.done = true; },
      error: err => {
        this.loading = false;
        this.error = err.error?.error || 'INVITE_NOT_FOUND';
      },
    });
  }
}
