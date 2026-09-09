import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ProductService } from '../../core/services/product.service';
import { Product } from '../../core/models/product.model';

export interface RequiredMaterial { product_id: number; quantity_required: number; product_name?: string; sku?: string; }

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Materiali richiesti</h2>
    <mat-dialog-content>
      <div class="filters"><mat-form-field appearance="outline"><mat-label>Cerca SKU o prodotto</mat-label><input matInput [(ngModel)]="query" (ngModelChange)="load()"></mat-form-field><mat-form-field appearance="outline"><mat-label>Categoria</mat-label><mat-select [(ngModel)]="category" (selectionChange)="load()"><mat-option value="">Tutte</mat-option><mat-option *ngFor="let item of categories" [value]="item.name">{{item.name}}</mat-option></mat-select></mat-form-field></div>
      <p>Elementi selezionati: {{ selected.size }}</p>
      <div class="row head"><span></span><span>Prodotto</span><span>SKU</span><span>Quantità richiesta</span></div>
      <div class="row" *ngFor="let product of products"><mat-checkbox [checked]="selected.has(product.id)" (change)="toggle(product, $event.checked)"></mat-checkbox><span>{{product.name}}</span><span>{{product.sku || '—'}}</span><input type="number" min="0" step="0.001" [ngModel]="quantity(product.id)" (ngModelChange)="setQuantity(product, $event)"></div>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button mat-dialog-close>Annulla</button><button mat-raised-button color="primary" (click)="save()">Salva materiali</button></mat-dialog-actions>`,
  styles: [`.filters,.row{display:grid;grid-template-columns:40px 1fr 140px 160px;gap:12px;align-items:center}.filters{grid-template-columns:1fr 220px}.row{padding:8px 0;border-bottom:1px solid #eee}.head{font-weight:600}.row input{width:100%;padding:8px;box-sizing:border-box}@media(max-width:600px){.filters{grid-template-columns:1fr}.row{grid-template-columns:32px 1fr 100px}.row span:nth-child(3){display:none}}`]
})
export class RequiredMaterialsDialogComponent implements OnInit {
  products: Product[] = []; categories: { id: number; name: string }[] = []; query = ''; category = '';
  selected = new Map<number, RequiredMaterial>();
  constructor(@Inject(MAT_DIALOG_DATA) initial: RequiredMaterial[], private ref: MatDialogRef<RequiredMaterialsDialogComponent>, private productsSvc: ProductService) { initial.forEach(item => this.selected.set(item.product_id, item)); }
  ngOnInit(): void { this.productsSvc.categories().subscribe(items => this.categories = items); this.load(); }
  load(): void { this.productsSvc.list({ q: this.query || undefined, category: this.category || undefined, limit: 100 }).subscribe(response => this.products = response.data); }
  quantity(id: number): number { return this.selected.get(id)?.quantity_required ?? 0; }
  toggle(product: Product, checked: boolean): void { if (checked) this.selected.set(product.id, { product_id: product.id, quantity_required: this.quantity(product.id) || 1, product_name: product.name, sku: product.sku ?? undefined }); else this.selected.delete(product.id); this.selected = new Map(this.selected); }
  setQuantity(product: Product, value: number): void { const quantity = Number(value) || 0; if (quantity > 0) this.selected.set(product.id, { product_id: product.id, quantity_required: quantity, product_name: product.name, sku: product.sku ?? undefined }); else this.selected.delete(product.id); this.selected = new Map(this.selected); }
  save(): void { this.ref.close([...this.selected.values()]); }
}
