import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import SignaturePad from 'signature_pad';

@Component({
  selector: 'app-signature-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './signature-dialog.component.html',
  styleUrls: ['./signature-dialog.component.scss']
})
export class SignatureDialogComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  private signaturePad!: SignaturePad;

  constructor(
    private dialogRef: MatDialogRef<SignatureDialogComponent>,
    private zone: NgZone,
  ) {}

  ngAfterViewInit() {
    this.signaturePad = new SignaturePad(this.canvas.nativeElement, {
      backgroundColor: 'rgb(255, 255, 255)',
      penColor: 'rgb(0, 0, 0)',
    });

    // Wait one tick so the dialog has finished laying out and
    // canvas.offsetWidth/Height have their real values.
    setTimeout(() => this.initCanvas(), 0);
  }

  ngOnDestroy() {
    // No window resize listener to remove — we intentionally don't attach one.
    // Resizing mid-signature would call clear() and destroy the drawn content.
  }

  private initCanvas(): void {
    const canvas = this.canvas.nativeElement;
    const ratio  = Math.max(window.devicePixelRatio || 1, 1);

    // Use the CSS-rendered size (guaranteed to be non-zero after the setTimeout tick)
    canvas.width  = canvas.offsetWidth  * ratio;
    canvas.height = canvas.offsetHeight * ratio;
    canvas.getContext('2d')?.scale(ratio, ratio);

    // Only clear once at startup — never on resize
    this.signaturePad.clear();
  }

  clear(): void {
    this.signaturePad.clear();
  }

  cancel(): void {
    this.dialogRef.close();
  }

  confirm(): void {
    if (this.signaturePad.isEmpty()) return;
    const dataUrl = this.signaturePad.toDataURL('image/png');
    this.dialogRef.close(dataUrl);
  }
}
