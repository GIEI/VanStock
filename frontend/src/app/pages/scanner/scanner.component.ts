import { Component, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';
import { PhotoUrlPipe } from '../../core/pipes/photo-url.pipe';
import { TranslateModule } from '@ngx-translate/core';

type ScanState = 'idle' | 'scanning' | 'found' | 'not-found' | 'error';

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PhotoUrlPipe,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  templateUrl: './scanner.component.html',
  styleUrls: ['./scanner.component.scss'],
})
export class ScannerComponent implements OnDestroy {
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;

  state: ScanState = 'idle';
  scannedCode   = '';
  manualCode    = '';
  foundProduct: Product | null = null;
  errorMessage  = '';
  hasMultipleCameras = false;

  private codeReader?: BrowserMultiFormatReader;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private controls?: any;

  constructor(
    private productService: ProductService,
    private router:         Router,
    private snack:          MatSnackBar,
  ) {}

  async startScan(): Promise<void> {
    this.state        = 'scanning';
    this.scannedCode  = '';
    this.foundProduct = null;
    this.errorMessage = '';

    try {
      this.codeReader = new BrowserMultiFormatReader();
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();

      // Exclude virtual cameras (OBS, etc.)
      const realDevices = devices.filter(d => {
        const label = d.label.toLowerCase();
        return !label.includes('virtual') && !label.includes('obs');
      });
      const candidates = realDevices.length > 0 ? realDevices : devices;

      // Prefer back camera on mobile, otherwise first real camera
      const device = candidates.find(d => {
        const label = d.label.toLowerCase();
        return label.includes('back') || label.includes('rear') || label.includes('environment');
      }) ?? candidates[0];

      if (!device) throw new Error('Nessuna camera disponibile');

      this.hasMultipleCameras = devices.length > 1;

      // decodeFromVideoDevice returns IScannerControls with a stop() method
      this.controls = await this.codeReader.decodeFromVideoDevice(
        device.deviceId,
        this.videoEl.nativeElement,
        (result, err) => {
          if (result) {
            this.onCodeScanned(result.getText());
          }
          // Ignore NotFoundException — fires normally when no barcode in frame
          if (err && err.name !== 'NotFoundException') {
            console.warn('Scanner error:', err);
          }
        }
      );
    } catch (err: unknown) {
      this.state = 'error';
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        this.errorMessage = 'Permesso alla camera negato. Abilitalo nelle impostazioni del browser.';
      } else {
        this.errorMessage = msg;
      }
    }
  }

  stopScan(): void {
    this.controls?.stop?.();
    this.controls = undefined;
    this.state = 'idle';
  }

  onCodeScanned(code: string): void {
    if (this.state !== 'scanning') return;
    this.scannedCode = code;
    this.stopScan();
    this.lookupCode(code);
  }

  manualSearch(): void {
    if (!this.manualCode.trim()) return;
    this.lookupCode(this.manualCode.trim());
  }

  private lookupCode(code: string): void {
    this.state        = 'scanning';
    this.foundProduct = null;
    this.productService.getByBarcode(code).subscribe({
      next: product => {
        this.state        = 'found';
        this.foundProduct = product;
      },
      error: err => {
        if (err.status === 404) {
          this.state = 'not-found';
          this.scannedCode = code;
        } else {
          this.state        = 'error';
          this.errorMessage = 'Errore di rete';
        }
      },
    });
  }

  goToProduct(): void {
    if (this.foundProduct) {
      this.router.navigate(['/products', this.foundProduct.id]);
    }
  }

  createWithBarcode(): void {
    this.router.navigate(['/products/new'], {
      queryParams: { barcode: this.scannedCode },
    });
  }

  addMovement(type: 'carico' | 'scarico'): void {
    if (!this.foundProduct) return;
    this.router.navigate(['/movements/new'], {
      queryParams: { product_id: this.foundProduct.id, type },
    });
  }

  reset(): void {
    this.state        = 'idle';
    this.scannedCode  = '';
    this.manualCode   = '';
    this.foundProduct = null;
    this.errorMessage = '';
  }

  ngOnDestroy(): void {
    this.stopScan();
  }

  stockClass(p: Product): string {
    if (p.quantity === 0)          return 'badge-critical';
    if (p.quantity < p.min_stock) return 'badge-warning';
    return 'badge-ok';
  }
}
