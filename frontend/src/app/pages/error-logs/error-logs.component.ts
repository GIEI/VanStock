import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-error-logs',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './error-logs.component.html',
  styleUrls: ['./error-logs.component.scss']
})
export class ErrorLogsComponent implements OnInit {
  logs: string = '';
  loading: boolean = false;
  lastUpdate: string = '';

  constructor(
    private adminService: AdminService,
    private snack: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.adminService.getErrorLogs().subscribe({
      next: (res) => {
        this.logs = res.logs;
        this.lastUpdate = res.timestamp;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  clearLogs(): void {
    const confirmMsg = this.translate.instant('ADMIN.CONFIRM_CLEAR');
    if (confirm(confirmMsg)) {
      this.adminService.clearErrorLogs().subscribe({
        next: () => {
          this.snack.open(this.translate.instant('ADMIN.CLEARED_SUCCESS'), 'OK', { duration: 3000 });
          this.refresh();
        },
        error: () => {
          this.snack.open(this.translate.instant('ADMIN.CLEAR_ERROR'), 'OK', { duration: 3000 });
        }
      });
    }
  }
}
