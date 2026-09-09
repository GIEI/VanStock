import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BadgeService } from '../../core/services/badge.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { OverrideRequestDialogComponent } from './override-request-dialog.component';

@Component({
  selector: 'app-badge-scanner',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    TranslateModule
  ],
  template: `
    <div class="scanner-container">
      <mat-card class="scanner-card">
        <mat-card-header>
          <mat-card-title>{{ 'BADGE.SCANNER_TITLE' | translate }}</mat-card-title>
        </mat-card-header>

        <mat-card-content class="scanner-content">
          <div class="video-wrapper">
            <video #videoElement class="video-preview"></video>
            <div class="scan-overlay" [class.scanning]="isScanning">
              <div class="scan-line"></div>
            </div>
          </div>

          <div class="actions" *ngIf="!isScanning">
            <button mat-flat-button color="primary" (click)="startScanner()" class="full-width">
              <mat-icon>camera_alt</mat-icon> {{ 'BADGE.START_SCAN' | translate }}
            </button>
          </div>

          <div class="actions" *ngIf="isScanning">
            <button mat-stroked-button color="warn" (click)="stopScanner()" class="full-width">
              <mat-icon>stop</mat-icon> {{ 'COMMON.CANCEL' | translate }}
            </button>
          </div>
        </mat-card-content>

        <mat-card-footer class="footer-actions">
          <button mat-button color="accent" (click)="openOverrideRequest()">
            {{ 'BADGE.PROBLEMS_QR' | translate }}
          </button>
        </mat-card-footer>
      </mat-card>

      <div class="last-result" *ngIf="lastRecord">
        <mat-card class="result-card">
          <mat-icon color="primary">check_circle</mat-icon>
          <div class="result-text">
            <strong>{{ lastMessage }}</strong>
            <small>{{ lastRecord.date | date:'shortTime' }}</small>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .scanner-container {
      padding: 1rem;
      max-width: 600px;
      margin: 0 auto;
    }
    .scanner-card {
      overflow: hidden;
    }
    .scanner-content {
      padding: 0 !important;
      position: relative;
    }
    .video-wrapper {
      position: relative;
      width: 100%;
      background: #000;
      aspect-ratio: 1;
      overflow: hidden;
    }
    .video-preview {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .scan-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      border: 40px solid rgba(0,0,0,0.5);
      pointer-events: none;
      display: none;
    }
    .scan-overlay.scanning {
      display: block;
    }
    .scan-line {
      position: absolute;
      top: 0;
      width: 100%;
      height: 2px;
      background: #2196f3;
      box-shadow: 0 0 8px #2196f3;
      animation: scan 2s infinite;
    }
    @keyframes scan {
      0% { top: 0; }
      100% { top: 100%; }
    }
    .actions {
      padding: 1.5rem;
    }
    .footer-actions {
      text-align: center;
      padding: 0.5rem;
      border-top: 1px solid #eee;
    }
    .full-width {
      width: 100%;
      padding: 1.5rem !important;
    }
    .last-result {
      margin-top: 1.5rem;
    }
    .result-card {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #e3f2fd;
    }
    .result-text {
      display: flex;
      flex-direction: column;
    }
  `]
})
export class BadgeScannerComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  
  isScanning = false;
  lastRecord: any = null;
  lastMessage = '';
  
  private codeReader   = new BrowserMultiFormatReader();
  private scanControls: { stop: () => void } | null = null;
  private scanTimeout: any;

  constructor(
    private badgeService: BadgeService,
    private snack: MatSnackBar,
    private dialog: MatDialog,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.stopScanner();
  }

  async startScanner(): Promise<void> {
    this.isScanning = true;
    try {
      this.scanControls = await this.codeReader.decodeFromVideoElement(
        this.videoElement.nativeElement,
        (result, _error) => {
          if (result) {
            this.handleScan(result.getText());
            this.scanControls?.stop();
          }
        }
      );
      
      // Auto-stop after 60 seconds of no results to save battery
      this.scanTimeout = setTimeout(() => this.stopScanner(), 60000);
    } catch (err) {
      console.error(err);
      this.snack.open(this.translate.instant('BADGE.CAMERA_ERROR'), 'OK', { duration: 4000 });
      this.isScanning = false;
    }
  }

  stopScanner(): void {
    this.scanControls?.stop();
    this.scanControls = null;
    this.isScanning = false;
    if (this.scanTimeout) clearTimeout(this.scanTimeout);
  }

  handleScan(token: string): void {
    this.stopScanner();
    this.badgeService.scan(token).subscribe({
      next: res => {
        this.lastRecord  = res.attendance;
        this.lastMessage = res.message;
        this.snack.open(res.message, 'OK', { duration: 5000 });
      },
      error: err => {
        const msg = err.error?.error || 'Errore durante la scansione';
        this.snack.open(msg, 'OK', { duration: 5000 });
      }
    });
  }

  openOverrideRequest(): void {
    this.stopScanner();
    this.dialog.open(OverrideRequestDialogComponent, {
      width: '90%',
      maxWidth: '500px'
    });
  }
}
