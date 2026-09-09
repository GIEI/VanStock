import { Routes } from '@angular/router';
import { authGuard, adminGuard, superAdminGuard, homeGuard, companyResourceGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', canActivate: [homeGuard], loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },

  // Public routes
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'accept-invite',
    loadComponent: () => import('./pages/accept-invite/accept-invite.component').then(m => m.AcceptInviteComponent),
  },

  // Protected routes
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'products',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/products/products.component').then(m => m.ProductsComponent),
  },
  {
    path: 'products/new',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/product-form/product-form.component').then(m => m.ProductFormComponent),
  },
  {
    path: 'products/:id/edit',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/product-form/product-form.component').then(m => m.ProductFormComponent),
  },
  {
    path: 'products/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent),
  },
  {
    path: 'scanner',
    canActivate: [authGuard, companyResourceGuard('WEB_ROUTE_SCANNER')],
    loadComponent: () => import('./pages/scanner/scanner.component').then(m => m.ScannerComponent),
  },
  {
    path: 'movements',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/movements/movements.component').then(m => m.MovementsComponent),
  },
  {
    path: 'movements/new',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/movement-form/movement-form.component').then(m => m.MovementFormComponent),
  },
  {
    path: 'locations',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/locations/locations.component').then(m => m.LocationsComponent),
  },
  {
    path: 'users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/users/users.component').then(m => m.UsersComponent),
  },
  {
    path: 'companies',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () => import('./pages/companies/companies.component').then(m => m.CompaniesComponent),
  },
  {
    path: 'features',
    canActivate: [authGuard, superAdminGuard],
    loadComponent: () => import('./pages/features/features.component').then(m => m.FeaturesComponent),
  },
  {
    path: 'clients',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/clients/clients.component').then(m => m.ClientsComponent),
  },
  {
    path: 'jobs',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/jobs/jobs.component').then(m => m.JobsComponent),
  },
  {
    path: 'jobs/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/job-detail/job-detail.component').then(m => m.JobDetailComponent),
  },
  {
    path: 'scheduling',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/scheduling/scheduling.component').then(m => m.SchedulingComponent),
  },
  {
    path: 'analytics',
    canActivate: [authGuard, adminGuard, companyResourceGuard('WEB_ROUTE_ANALYTICS')],
    loadComponent: () => import('./pages/analytics/analytics.component').then(m => m.AnalyticsComponent),
  },

  {
    path: 'vehicle-calendar',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/vehicle-calendar/vehicle-calendar.component').then(m => m.VehicleCalendarComponent),
  },
  {
    path: 'van-report',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/van-report/van-report.component').then(m => m.VanReportComponent),
  },
  {
    path: 'van-load',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/van-load/van-load.component').then(m => m.VanLoadComponent),
  },
  {
    path: 'reports',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/reports/reports.component').then(m => m.ReportsComponent),
  },
  {
    path: 'suppliers',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/suppliers/suppliers.component').then(m => m.SuppliersComponent),
  },
  {
    path: 'margins',
    canActivate: [authGuard, adminGuard, companyResourceGuard('WEB_ROUTE_MARGINS')],
    loadComponent: () => import('./pages/margins/margins.component').then(m => m.MarginsComponent),
  },
  {
    path: 'purchase-orders',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/purchase-orders/purchase-orders.component').then(m => m.PurchaseOrdersComponent),
  },
  {
    path: 'purchase-orders/:id',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/purchase-order-detail/purchase-order-detail.component').then(m => m.PurchaseOrderDetailComponent),
  },
  {
    path: 'timeline',
    canActivate: [authGuard, adminGuard, companyResourceGuard('WEB_ROUTE_TIMELINE')],
    loadComponent: () => import('./pages/timeline/timeline.component').then(m => m.TimelineComponent),
  },
  {
    path: 'import-export',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/import-export/import-export.component').then(m => m.ImportExportComponent),
  },
  {
    path: 'fix-magazzino',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/fix-magazzino/fix-magazzino.component').then(m => m.FixMagazzinoComponent),
  },
  {
    path: 'error-logs',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/error-logs/error-logs.component').then(m => m.ErrorLogsComponent),
  },
  {
    path: 'inventory-audit',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/inventory-audit/inventory-audit.component').then(m => m.InventoryAuditComponent),
  },

  {
    path: 'badge-creator',
    canActivate: [authGuard, adminGuard, companyResourceGuard('WEB_ROUTE_BADGE_CREATOR')],
    loadComponent: () => import('./pages/badge-creator/badge-creator.component').then(m => m.BadgeCreatorComponent),
  },
  {
    path: 'attendance',
    canActivate: [authGuard, adminGuard, companyResourceGuard('WEB_ROUTE_ATTENDANCE')],
    loadComponent: () => import('./pages/attendance/attendance.component').then(m => m.AttendanceComponent),
  },
  {
    path: 'system',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/system/system.component').then(m => m.SystemComponent),
  },
  {
    path: 'my-absences',
    canActivate: [authGuard, companyResourceGuard('WEB_ROUTE_MY_ABSENCES')],
    loadComponent: () => import('./pages/my-absences/my-absences.component').then(m => m.MyAbsencesComponent),
  },
  { path: '**', canActivate: [homeGuard], loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent) },
];
