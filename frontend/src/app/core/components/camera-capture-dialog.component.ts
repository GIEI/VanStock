import { Component, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-camera-capture-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>Scatta una foto</h2>
    <mat-dialog-content class="capture-content">
      <div class="video-wrapper" [class.hidden]="!!error">
        <video #videoEl class="capture-video" autoplay muted playsinline></video>
        <div *ngIf="!ready" class="video-loading">
          <mat-spinner diameter="32"></mat-spinner>
        </div>
      </div>
      <canvas #canvasEl style="display:none"></canvas>
      <p *ngIf="error" class="capture-error">
        <mat-icon>videocam_off</mat-icon>
        {{error}}
      </p>
      <p *ngIf="!error && !ready" class="capture-hint">Avvio fotocamera...</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button type="button" mat-button (click)="cancel()">Annulla</button>
      <button type="button" mat-raised-button color="primary"
              [disabled]="!ready" (click)="capture()">
        <mat-icon>photo_camera</mat-icon> Scatta
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .capture-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 0 0 8px;
    }
    .video-wrapper {
      position: relative;
      width: 100%;
      max-width: 400px;
      aspect-ratio: 4/3;
      background: #000;
      border-radius: 12px;
      overflow: hidden;
    }
    .video-wrapper.hidden { display: none; }
    .capture-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .video-loading {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.5);
    }
    .capture-error {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #dc2626;
      font-size: 14px;
      margin: 0;
      text-align: center;
    }
    .capture-hint { color: #888; font-size: 13px; margin: 0; }
    h2 { margin-bottom: 0; }
  `],
})
export class CameraCaptureDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;

  ready = false;
  error = '';

  private stream?: MediaStream;

  constructor(private dialogRef: MatDialogRef<CameraCaptureDialogComponent>) {}

  async ngAfterViewInit(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      this.videoEl.nativeElement.srcObject = this.stream;
      this.videoEl.nativeElement.onloadedmetadata = () => { this.ready = true; };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error = msg.includes('Permission') || msg.includes('NotAllowed')
        ? 'Permesso fotocamera negato. Abilitalo nelle impostazioni del browser.'
        : 'Fotocamera non disponibile su questo dispositivo.';
    }
  }

  capture(): void {
    const video  = this.videoEl.nativeElement;
    const canvas = this.canvasEl.nativeElement;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (blob) {
        const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
        this.stopStream();
        this.dialogRef.close(file);
      }
    }, 'image/jpeg', 0.92);
  }

  cancel(): void {
    this.stopStream();
    this.dialogRef.close(null);
  }

  ngOnDestroy(): void {
    this.stopStream();
  }

  private stopStream(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = undefined;
  }
}
