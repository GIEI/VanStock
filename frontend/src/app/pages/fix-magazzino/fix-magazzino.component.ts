import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SelectionModel } from '@angular/cdk/collections';
import { ProductService } from '../../core/services/product.service';
import { LocationService } from '../../core/services/location.service';
import { Location } from '../../core/models/location.model';

@Component({
  selector: 'app-fix-magazzino',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule
  ],
  templateUrl: './fix-magazzino.component.html',
  styleUrls: ['./fix-magazzino.component.scss']
})
export class FixMagazzinoComponent implements OnInit {
  products: any[] = [];
  locations: Location[] = [];
  loading = true;
  fixing = false;
  
  selection = new SelectionModel<any>(true, []);
  targetLocationId: number | null = null;

  displayedColumns = ['select', 'sku', 'name', 'total_quantity', 'unassigned_quantity'];

  constructor(
    private productService: ProductService,
    private locationService: LocationService,
    private snack: MatSnackBar,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.load();
    this.locationService.list().subscribe(locs => this.locations = locs);
  }

  load(): void {
    this.loading = true;
    this.productService.getUnassigned().subscribe({
      next: (prods) => {
        console.log('[DEBUG] Unassigned products received:', prods);
        if (prods && prods.length > 0) {
          console.log('[DEBUG] First item sample:', JSON.stringify(prods[0]));
        } else {
          console.log('[DEBUG] Received empty array from /unassigned');
        }
        this.products = prods;
        this.selection.clear();
        this.loading = false;
      },
      error: (err) => {
        console.error('[ERROR] Failed to fetch unassigned products:', err);
        this.snack.open(this.translate.instant('FIX_MAGAZZINO.ERROR'), 'OK', { duration: 5000 });
        this.loading = false;
      }
    });
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.products.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.selection.select(...this.products);
  }

  fixSelected(): void {
    if (!this.targetLocationId || this.selection.isEmpty()) return;
    
    this.fixing = true;
    const ids = this.selection.selected.map(p => p.id);
    
    this.productService.fixUnassigned(ids, this.targetLocationId).subscribe({
      next: () => {
        this.snack.open(this.translate.instant('FIX_MAGAZZINO.SUCCESS'), 'OK', { duration: 3000 });
        this.fixing = false;
        this.load();
      },
      error: () => {
        this.snack.open(this.translate.instant('FIX_MAGAZZINO.ERROR'), 'OK', { duration: 3000 });
        this.fixing = false;
      }
    });
  }
  
  get targetLocationName(): string {
    const loc = this.locations.find(l => l.id === this.targetLocationId);
    return loc ? loc.name : '';
  }
}
