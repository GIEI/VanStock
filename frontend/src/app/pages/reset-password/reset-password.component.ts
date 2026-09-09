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
import { AuthService } from '../../core/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
    TranslateModule,
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  form!: FormGroup;
  token    = '';
  loading  = false;
  done     = false;
  error    = '';
  hidePass = true;

  constructor(
    private fb:    FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private auth:  AuthService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    this.form  = this.fb.group({
      password:  ['', [Validators.required, Validators.minLength(8)]],
      password2: ['', Validators.required],
    }, { validators: this.passwordMatch });
  }

  private passwordMatch(g: FormGroup) {
    return g.get('password')?.value === g.get('password2')?.value ? null : { mismatch: true };
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.token) { this.error = 'Token non valido'; return; }
    this.loading = true;
    this.error   = '';
    this.auth.resetPassword(this.token, this.form.value.password).subscribe({
      next:  () => { this.loading = false; this.done = true; },
      error: err => { this.loading = false; this.error = err.error?.error || 'Errore'; },
    });
  }
}
