import { Component, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { BrowserMultiFormatReader } from '@zxing/browser';

@Component({
  selector: 'app-barcode-scan-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Scansiona barcode</h2>
    <mat-dialog-content class="scan-content">
      <div class="video-wrapper">
        <video #videoEl class="scan-video" autoplay muted playsinline></video>
        <div class="scan-overlay">
          <div class="scan-line"></div>
        </div>
      </div>
      <p *ngIf="error" class="scan-error">{{error}}</p>
      <p *ngIf="!error && !ready" class="scan-hint">
        <mat-spinner diameter="20" style="display:inline-block;margin-right:8px"></mat-spinner>
        Avvio camera...
      </p>
      <p *ngIf="ready" class="scan-hint">Inquadra il barcode</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" mat-button (click)="cancel()">Annulla</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .scan-content { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 0 0 8px; }
    .video-wrapper { position: relative; width: 100%; max-width: 340px; aspect-ratio: 4/3; background: #000; border-radius: 8px; overflow: hidden; }
    .scan-video { width: 100%; height: 100%; object-fit: cover; display: block; }
    .scan-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
    .scan-line {
      width: 80%; height: 2px;
      background: rgba(255,80,80,0.85);
      box-shadow: 0 0 8px 2px rgba(255,80,80,0.6);
      animation: scanMove 2s ease-in-out infinite alternate;
    }
    @keyframes scanMove {
      from { transform: translateY(-60px); }
      to   { transform: translateY(60px); }
    }
    .scan-hint  { color: #888; font-size: 14px; margin: 0; display: flex; align-items: center; }
    .scan-error { color: #f44336; font-size: 14px; margin: 0; text-align: center; }
    h2 { margin-bottom: 0; }
  `],
})
export class BarcodeScanDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;

  ready = false;
  error = '';

  private codeReader?: BrowserMultiFormatReader;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private controls?: any;

  constructor(private dialogRef: MatDialogRef<BarcodeScanDialogComponent>) {}

  async ngAfterViewInit(): Promise<void> {
    try {
      this.codeReader = new BrowserMultiFormatReader();

      this.controls = await this.codeReader.decodeFromConstraints(
        { video: { facingMode: { ideal: 'environment' } } },
        this.videoEl.nativeElement,
        (result, err) => {
          if (result) {
            this.stopAndReturn(result.getText());
          }
          if (err && err.name !== 'NotFoundException') {
            console.warn('Scanner error:', err);
          }
        }
      );

      this.ready = true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error = msg.includes('Permission') || msg.includes('NotAllowed')
        ? 'Permesso alla camera negato. Abilitalo nelle impostazioni del browser.'
        : 'Fotocamera non disponibile su questo dispositivo.';
    }
  }

  private stopAndReturn(code: string): void {
    this.controls?.stop?.();
    this.controls = undefined;
    this.dialogRef.close(code);
  }

  cancel(): void {
    this.controls?.stop?.();
    this.controls = undefined;
    this.dialogRef.close(null);
  }

  ngOnDestroy(): void {
    this.controls?.stop?.();
  }
}
