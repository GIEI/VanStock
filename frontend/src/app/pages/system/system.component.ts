import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SystemService, WorkShift } from '../../core/services/system.service';

@Component({
  selector: 'app-system',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    TranslateModule,
  ],
  templateUrl: './system.component.html',
  styleUrls: ['./system.component.scss'],
})
export class SystemComponent implements OnInit {
  loading  = false;
  saving   = false;

  shift: WorkShift = {
    morning_start:             '08:00',
    morning_end:               '13:30',
    afternoon_start:           '13:31',
    afternoon_end:             '20:00',
    morning_late_threshold:    '09:10',
    afternoon_late_threshold:  '14:10',
  };

  constructor(
    private systemService: SystemService,
    private snack:         MatSnackBar,
    private translate:     TranslateService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.systemService.getWorkShifts().subscribe({
      next:  data  => { this.shift = data; this.loading = false; },
      error: ()    => { this.loading = false; },
    });
  }

  save(): void {
    this.saving = true;
    this.systemService.updateWorkShifts(this.shift).subscribe({
      next: data => {
        this.shift  = data;
        this.saving = false;
        this.snack.open(this.translate.instant('COMMON.SAVED'), 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.saving = false;
        const msg = err?.error?.error || this.translate.instant('COMMON.ERROR');
        this.snack.open(msg, 'OK', { duration: 4000 });
      },
    });
  }
}
