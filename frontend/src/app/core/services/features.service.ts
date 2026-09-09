import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface Feature {
  feature_key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  enabled_company_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CompanyFeature extends Feature {
  enabled: boolean;
}

export interface FeatureResource {
  resource_key: string;
  platform: 'WEB' | 'MOBILE' | 'BACKEND';
  resource_type: 'MENU' | 'ROUTE' | 'API_GROUP' | 'JOB';
  name: string;
  bundle_key: string | null;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class FeaturesService {
  constructor(private api: ApiService) {}

  list(): Observable<Feature[]> { return this.api.get<Feature[]>('/features'); }

  create(featureKey: string, name: string, description: string): Observable<Feature> {
    return this.api.post<Feature>('/features', { feature_key: featureKey, name, description });
  }

  update(featureKey: string, payload: Partial<Pick<Feature, 'name' | 'description' | 'is_active'>>): Observable<Feature> {
    return this.api.patch<Feature>(`/features/${featureKey}`, payload);
  }

  forCompany(companyId: number): Observable<CompanyFeature[]> {
    return this.api.get<CompanyFeature[]>(`/companies/${companyId}/features`);
  }

  setForCompany(companyId: number, featureKey: string, enabled: boolean): Observable<CompanyFeature> {
    return this.api.put<CompanyFeature>(`/companies/${companyId}/features/${featureKey}`, { enabled });
  }

  resourcesCatalog(): Observable<FeatureResource[]> { return this.api.get<FeatureResource[]>('/features/resources/catalog'); }

  resourcesForFeature(featureKey: string): Observable<FeatureResource[]> {
    return this.api.get<FeatureResource[]>(`/features/${featureKey}/resources`);
  }

  setResources(featureKey: string, resourceKeys: string[]): Observable<void> {
    return this.api.put<void>(`/features/${featureKey}/resources`, { resource_keys: resourceKeys });
  }
}
