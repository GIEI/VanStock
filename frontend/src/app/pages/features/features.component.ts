import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Company } from '../../core/models/user.model';
import { CompanyService } from '../../core/services/company.service';
import { CompanyFeature, Feature, FeatureResource, FeaturesService } from '../../core/services/features.service';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatCheckboxModule, MatFormFieldModule,
    MatIconModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatSnackBarModule],
  templateUrl: './features.component.html',
  styleUrls: ['./features.component.scss'],
})
export class FeaturesComponent implements OnInit {
  companies: Company[] = [];
  features: Feature[] = [];
  companyFeatures: CompanyFeature[] = [];
  resources: FeatureResource[] = [];
  selectedBindingFeatureKey: string | null = null;
  selectedResourceKeys = new Set<string>();
  newFeatureMenuKeys = new Set<string>();
  selectedCompanyId: number | null = null;
  featureKey = '';
  featureName = '';
  featureDescription = '';
  loading = false;

  constructor(
    private companySvc: CompanyService,
    private featuresSvc: FeaturesService,
    private route: ActivatedRoute,
    private snack: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.companySvc.list().subscribe({
      next: companies => {
        this.companies = companies;
        const requestedId = Number(this.route.snapshot.queryParamMap.get('companyId'));
        this.selectedCompanyId = companies.some(c => c.id === requestedId) ? requestedId : companies[0]?.id ?? null;
        this.loadCompanyFeatures();
      },
      error: () => this.showError(),
    });
    this.loadFeatures();
    this.featuresSvc.resourcesCatalog().subscribe({ next: resources => this.resources = resources, error: () => this.showError() });
  }

  loadFeatures(): void {
    this.featuresSvc.list().subscribe({ next: features => this.features = features, error: () => this.showError() });
  }

  loadCompanyFeatures(): void {
    if (!this.selectedCompanyId) { this.companyFeatures = []; return; }
    this.loading = true;
    this.featuresSvc.forCompany(this.selectedCompanyId).subscribe({
      next: features => { this.companyFeatures = features; this.loading = false; },
      error: () => { this.loading = false; this.showError(); },
    });
  }

  create(): void {
    const featureKey = this.featureKey.trim().toUpperCase();
    const name = this.featureName.trim();
    if (!featureKey || !name) return;
    this.featuresSvc.create(featureKey, name, this.featureDescription.trim()).subscribe({
      next: created => {
        this.featureKey = ''; this.featureName = ''; this.featureDescription = '';
        const resourceKeys = this.expandMenuResources(this.newFeatureMenuKeys);
        const done = () => {
          this.newFeatureMenuKeys = new Set();
          this.selectedBindingFeatureKey = created.feature_key;
          this.selectedResourceKeys = new Set(resourceKeys);
          this.snack.open('Funzionalità creata e disabilitata per tutte le Company.', 'OK', { duration: 3500 });
          this.loadFeatures(); this.loadCompanyFeatures();
        };
        if (resourceKeys.length) this.featuresSvc.setResources(created.feature_key, resourceKeys).subscribe({ next: done, error: err => this.showError(err) });
        else done();
      },
      error: err => this.showError(err),
    });
  }

  setCompanyFeature(feature: CompanyFeature, enabled: boolean): void {
    if (!this.selectedCompanyId) return;
    const previous = feature.enabled;
    feature.enabled = enabled;
    this.featuresSvc.setForCompany(this.selectedCompanyId, feature.feature_key, enabled).subscribe({
      next: updated => { feature.enabled = updated.enabled; },
      error: err => { feature.enabled = previous; this.showError(err); },
    });
  }

  setFeatureActive(feature: Feature, isActive: boolean): void {
    const previous = feature.is_active;
    feature.is_active = isActive;
    this.featuresSvc.update(feature.feature_key, { is_active: isActive }).subscribe({
      next: updated => { feature.is_active = updated.is_active; },
      error: err => { feature.is_active = previous; this.showError(err); },
    });
  }

  loadBindings(): void {
    this.selectedResourceKeys = new Set();
    if (!this.selectedBindingFeatureKey) return;
    this.featuresSvc.resourcesForFeature(this.selectedBindingFeatureKey).subscribe({
      next: resources => this.selectedResourceKeys = new Set(resources.map(resource => resource.resource_key)),
      error: () => this.showError(),
    });
  }

  toggleResource(resourceKey: string, checked: boolean): void {
    const resources = this.expandMenuResources([resourceKey]);
    if (checked) resources.forEach(key => this.selectedResourceKeys.add(key));
    else resources.forEach(key => this.selectedResourceKeys.delete(key));
    this.selectedResourceKeys = new Set(this.selectedResourceKeys);
  }

  toggleNewFeatureMenu(resourceKey: string, checked: boolean): void {
    const menuKeys = this.menuResourcesFor(resourceKey);
    if (checked) menuKeys.forEach(key => this.newFeatureMenuKeys.add(key));
    else menuKeys.forEach(key => this.newFeatureMenuKeys.delete(key));
    this.newFeatureMenuKeys = new Set(this.newFeatureMenuKeys);
  }

  isMenuSelected(resourceKey: string, keys: Set<string>): boolean {
    return this.menuResourcesFor(resourceKey).every(key => keys.has(key));
  }

  get menuResources(): FeatureResource[] {
    return this.resources.filter(resource => resource.resource_type === 'MENU');
  }

  private menuResourcesFor(resourceKey: string): string[] {
    const resource = this.resources.find(item => item.resource_key === resourceKey);
    if (!resource?.bundle_key) return [resourceKey];
    return this.menuResources.filter(item => item.bundle_key === resource.bundle_key).map(item => item.resource_key);
  }

  private expandMenuResources(menuKeys: Iterable<string>): string[] {
    const bundleKeys = new Set([...menuKeys]
      .map(key => this.resources.find(resource => resource.resource_key === key)?.bundle_key)
      .filter((key): key is string => !!key));
    const expanded = this.resources.filter(resource => resource.bundle_key && bundleKeys.has(resource.bundle_key)).map(resource => resource.resource_key);
    return [...new Set([...menuKeys, ...expanded])];
  }

  saveBindings(): void {
    if (!this.selectedBindingFeatureKey) return;
    this.featuresSvc.setResources(this.selectedBindingFeatureKey, [...this.selectedResourceKeys]).subscribe({
      next: () => this.snack.open('Target tecnici associati alla Feature.', 'OK', { duration: 3000 }),
      error: err => this.showError(err),
    });
  }

  private showError(err?: any): void {
    this.snack.open(err?.error?.error || 'Operazione non riuscita.', 'OK', { duration: 4000 });
  }
}
