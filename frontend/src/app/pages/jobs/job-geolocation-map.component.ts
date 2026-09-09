import { Component, OnInit, AfterViewInit, Inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { JobService } from '../../core/services/job.service';

declare var L: any; // Leaflet

interface GeolocationItem {
  id: number;
  type: 'photo' | 'state_change';
  latitude: number;
  longitude: number;
  timestamp: string;
  photoUrl?: string;
  photoType?: string;
  changeType?: string;
  description?: string;
}

interface GeolocationData {
  photos: Array<{
    id: number;
    url: string;
    type: string;
    latitude: number;
    longitude: number;
    created_at: string;
  }>;
  stateChanges: Array<{
    id: number;
    change_type: string;
    latitude: number;
    longitude: number;
    created_at: string;
  }>;
}

@Component({
  selector: 'app-job-geolocation-map',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule,
    TranslateModule,
  ],
  template: `
    <div class="geolocation-map-dialog">
      <div class="dialog-header">
        <h2>{{ data.jobTitle }} - {{ 'JOBS.GEOLOCATION_MAP' | translate }}</h2>
      </div>

      <div class="dialog-content">
        <div *ngIf="loading" class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>{{ 'COMMON.LOADING' | translate }}</p>
        </div>

        <div *ngIf="error && !loading" class="error-message">
          <mat-icon>error_outline</mat-icon>
          <p>{{ error }}</p>
        </div>

        <div *ngIf="!loading && !error && items.length > 0" class="map-container">
          <div #mapElement id="map" class="map"></div>
          <div class="items-legend">
            <div class="legend-title">{{ 'JOBS.GEOLOCATION_ITEMS' | translate }}</div>
            <div class="legend-items">
              <div *ngFor="let item of items" class="legend-item"
                [class.photo]="item.type === 'photo'"
                [class.state-change]="item.type === 'state_change'"
                (click)="focusMarker(item)">
                <mat-icon *ngIf="item.type === 'photo'" class="item-icon">photo_camera</mat-icon>
                <mat-icon *ngIf="item.type === 'state_change'" class="item-icon">flag</mat-icon>
                <span class="item-label">
                  <strong>{{ item.description }}</strong>
                  <br />
                  {{ item.timestamp | date:'dd/MM/yyyy HH:mm:ss' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="!loading && !error && items.length === 0" class="empty-state">
          <mat-icon>location_off</mat-icon>
          <p>{{ 'JOBS.NO_GEOLOCATION_DATA' | translate }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .geolocation-map-dialog {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
    }

    .dialog-header {
      padding: 16px;
      border-bottom: 1px solid #e0e0e0;
      flex-shrink: 0;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }

    .dialog-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 16px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 16px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background-color: #ffebee;
      border: 1px solid #ef5350;
      border-radius: 4px;
      color: #c62828;
    }

    .error-message mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .map-container {
      display: flex;
      gap: 16px;
      height: 100%;
    }

    #map {
      flex: 1;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }

    .items-legend {
      width: 250px;
      background: #f5f5f5;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 12px;
      overflow-y: auto;
    }

    .legend-title {
      font-weight: 500;
      margin-bottom: 12px;
      font-size: 14px;
    }

    .legend-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .legend-item {
      display: flex;
      gap: 8px;
      padding: 8px;
      background: white;
      border-radius: 4px;
      border-left: 3px solid #1976d2;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .legend-item:hover {
      background: #f0f0f0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .legend-item.photo {
      border-left-color: #f57c00;
    }

    .legend-item.state-change {
      border-left-color: #2e7d32;
    }

    .item-icon {
      flex-shrink: 0;
      color: #666;
    }

    .item-label {
      font-size: 12px;
      line-height: 1.4;
      flex: 1;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #999;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    :host ::ng-deep .leaflet-popup-content-wrapper {
      border-radius: 4px;
    }

    :host ::ng-deep .popup-content {
      font-size: 12px;
      padding: 8px;
    }

    :host ::ng-deep .popup-title {
      font-weight: 600;
      margin-bottom: 4px;
    }

    :host ::ng-deep .popup-timestamp {
      color: #666;
      font-size: 11px;
      margin-bottom: 4px;
    }

    :host ::ng-deep .popup-description {
      margin: 4px 0;
      color: #333;
    }

    :host ::ng-deep .popup-image {
      margin: 8px 0;
      text-align: center;
    }

    :host ::ng-deep .popup-coords {
      color: #999;
      margin-top: 4px;
      padding-top: 4px;
      border-top: 1px solid #eee;
    }

    :host ::ng-deep .custom-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    }
  `]
})
export class JobGeolocationMapComponent implements OnInit, AfterViewInit {
  @ViewChild('mapElement') mapElement?: ElementRef;

  loading = true;
  error: string | null = null;
  items: GeolocationItem[] = [];
  private map: any;
  private markers: Map<number, any> = new Map();

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { jobId: number; jobTitle: string },
    private jobService: JobService,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.loadGeolocationData();
  }

  ngAfterViewInit(): void {
    if (!this.error && this.items.length > 0) {
      this.initializeMap();
    }
  }

  private loadGeolocationData(): void {
    this.jobService.getGeolocationData(this.data.jobId).subscribe({
      next: (data: GeolocationData) => {
        this.items = this.convertToItems(data);
        this.loading = false;
        // Initialize map after view init
        setTimeout(() => {
          if (this.mapElement && !this.error) {
            this.initializeMap();
          }
        }, 100);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load geolocation data';
        this.loading = false;
      },
    });
  }

  private convertToItems(data: GeolocationData): GeolocationItem[] {
    const items: GeolocationItem[] = [];

    // Add photos — prefix id with 'p:' to avoid collisions with state_change ids in the markers Map
    data.photos?.forEach(photo => {
      items.push({
        id: `p:${photo.id}` as any,
        type: 'photo',
        latitude: Number(photo.latitude),
        longitude: Number(photo.longitude),
        timestamp: photo.created_at,
        photoUrl: photo.url,
        photoType: photo.type,
        description: this.translate.instant(photo.type === 'problem' ? 'JOBS.PHOTO_BEFORE' : 'JOBS.PHOTO_AFTER'),
      });
    });

    // Add state changes — prefix id with 's:' to avoid collisions with photo ids
    data.stateChanges?.forEach(change => {
      items.push({
        id: `s:${change.id}` as any,
        type: 'state_change',
        latitude: Number(change.latitude),
        longitude: Number(change.longitude),
        timestamp: change.created_at,
        changeType: change.change_type,
        description: this.formatChangeType(change.change_type),
      });
    });

    // Filter out items without valid coordinates, then sort by timestamp
    return items
      .filter(i => i.latitude !== 0 && i.longitude !== 0 && !isNaN(i.latitude) && !isNaN(i.longitude))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private formatChangeType(changeType: string): string {
    const mapping: { [key: string]: string } = {
      'accept':    'Job Accepted',
      'arrived':   'Marked as Arrived',
      'rejected':  'Job Rejected',
      'completed': 'Job Completed',
      'signed':    'Job Signed / Closed',
    };
    return mapping[changeType] || changeType;
  }

  private initializeMap(): void {
    if (!this.mapElement || this.items.length === 0) return;

    // Initialize Leaflet map
    this.map = L.map(this.mapElement.nativeElement).setView([45.4642, 9.1900], 10);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);

    // Add markers for each item
    this.items.forEach(item => {
      const isPhoto = item.type === 'photo';
      const icon = L.divIcon({
        html: `<div class="marker-icon ${item.type}">
                 ${isPhoto ? '📷' : '🚩'}
               </div>`,
        iconSize: [32, 32],
        className: 'custom-marker',
      });

      const marker = L.marker([item.latitude, item.longitude], { icon })
        .addTo(this.map)
        .bindPopup(this.createPopupContent(item));

      this.markers.set(item.id, marker);
    });

    // Fit bounds to show all markers
    if (this.items.length > 0) {
      const group = new (L as any).featureGroup(Array.from(this.markers.values()));
      this.map.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }

  focusMarker(item: GeolocationItem): void {
    if (!this.map) return;
    this.map.setView([item.latitude, item.longitude], 16);
    const marker = this.markers.get(item.id);
    if (marker) marker.openPopup();
  }

  private createPopupContent(item: GeolocationItem): string {
    const title = item.type === 'photo' ? `📷 ${item.description}` : `🚩 ${item.description}`;
    let content = `<div class="popup-content">
                    <div class="popup-title">${title}</div>
                    <div class="popup-timestamp">${new Date(item.timestamp).toLocaleString()}</div>`;

    if (item.description) {
      content += `<div class="popup-description">${item.description}</div>`;
    }

    if (item.photoUrl && item.type === 'photo') {
      const fullUrl = item.photoUrl.startsWith('http')
        ? item.photoUrl
        : window.location.origin + item.photoUrl;
      const isVideo = /\.(mp4|webm|mov|mkv|3gp)$/i.test(item.photoUrl);
      if (isVideo) {
        content += `<div class="popup-image">
                      <video src="${fullUrl}" controls style="max-width: 150px; border-radius: 4px;" preload="metadata"></video>
                    </div>`;
      } else {
        content += `<div class="popup-image">
                      <img src="${fullUrl}" alt="Photo" style="max-width: 150px; border-radius: 4px;" />
                    </div>`;
      }
    }

    content += `<div class="popup-coords">
                  <small>📍 ${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}</small>
                </div>
              </div>`;

    return content;
  }
}
