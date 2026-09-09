import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BadgeService } from '../../core/services/badge.service';
import { interval, Subscription, switchMap, startWith } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-badge-creator',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule
  ],
  template: `
    <div class="badge-container">
      <mat-card class="qr-card">
        <mat-card-header>
          <mat-card-title>{{ 'BADGE.TITLE' | translate }}</mat-card-title>
          <mat-card-subtitle>{{ 'BADGE.SUBTITLE' | translate }}</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content class="qr-content">
          <div class="qr-wrapper" *ngIf="qrUrl; else loading">
            <img [src]="qrUrl" alt="QR Code" class="qr-image">
            <div class="progress-bar-container">
              <mat-progress-bar mode="determinate" [value]="progressValue"></mat-progress-bar>
              <small class="refresh-text">{{ 'BADGE.REFRESH_IN' | translate }}: {{ timeLeft }}s</small>
            </div>
          </div>
          <ng-template #loading>
            <div class="loading-state">
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
              <p>{{ 'BADGE.GENERATING' | translate }}...</p>
            </div>
          </ng-template>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-stroked-button color="primary" (click)="refreshToken()">
            <mat-icon>refresh</mat-icon> {{ 'COMMON.RETRY' | translate }}
          </button>
        </mat-card-actions>
      </mat-card>

      <div class="instructions">
        <h3><mat-icon>info</mat-icon> {{ 'BADGE.HOW_TO_TITLE' | translate }}</h3>
        <ol>
          <li>{{ 'BADGE.STEP_1' | translate }}</li>
          <li>{{ 'BADGE.STEP_2' | translate }}</li>
          <li>{{ 'BADGE.STEP_3' | translate }}</li>
        </ol>
      </div>
    </div>
  `,
  styles: [`
    .badge-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      min-height: 80vh;
      background: #f5f5f5;
    }
    .qr-card {
      width: 100%;
      max-width: 450px;
      padding: 1rem;
      text-align: center;
    }
    .qr-content {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 350px;
      padding: 1.5rem 0;
    }
    .qr-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }
    .qr-image {
      width: 300px;
      height: 300px;
      border: 8px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      border-radius: 8px;
    }
    .progress-bar-container {
      width: 100%;
      max-width: 300px;
    }
    .refresh-text {
      display: block;
      margin-top: 0.5rem;
      color: #666;
    }
    .instructions {
      margin-top: 2rem;
      max-width: 450px;
      color: #444;
      line-height: 1.6;
    }
    .instructions h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .loading-state {
      width: 100%;
      text-align: center;
    }
  `]
})
export class BadgeCreatorComponent implements OnInit, OnDestroy {
  qrUrl: string | null = null;
  timeLeft = 60;
  progressValue = 100;
  private subs = new Subscription();

  constructor(private badgeService: BadgeService) {}

  ngOnInit(): void {
    this.startRefreshCycle();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  startRefreshCycle(): void {
    // Initial fetch
    this.refreshToken();

    // Timer for time left and progress bar (every second)
    const timerSub = interval(1000).subscribe(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
        this.progressValue = (this.timeLeft / 60) * 100;
      } else {
        this.refreshToken();
      }
    });
    this.subs.add(timerSub);
  }

  refreshToken(): void {
    this.qrUrl = null;
    this.badgeService.generateToken().subscribe({
      next: ({ token }) => {
        // Use external QR API to avoid dependency issues if npm install failed
        const baseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
        this.qrUrl = `${baseUrl}?size=300x300&data=${encodeURIComponent(token)}`;
        this.timeLeft = 60;
        this.progressValue = 100;
      },
      error: () => {
        // Retry in 5 seconds if fetch fails
        setTimeout(() => this.refreshToken(), 5000);
      }
    });
  }
}
