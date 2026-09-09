import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { filter, map, takeUntil } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { DashboardService } from './core/services/dashboard.service';
import { AuthService } from './core/services/auth.service';
import { LanguageService, LANGUAGES } from './core/services/language.service';
import { PhotoUrlPipe } from './core/pipes/photo-url.pipe';
import { PushNotificationService } from './core/services/push-notification.service';
import { NotificationCenterService } from './core/services/notification-center.service';
import { AppNotification } from './core/models/notification.model';

interface NavItem {
  labelKey:   string;
  icon:       string;
  route:      string;
  adminOnly?: boolean;
  superOnly?: boolean;
  feature?: string;
  resource?: string;
}

const ADMIN_GROUP_ROUTES = new Set(['/clients', '/companies', '/features', '/import-export', '/inventory-audit', '/locations', '/suppliers', '/users', '/fix-magazzino', '/error-logs', '/system']);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    DragDropModule,
    TranslateModule,
    PhotoUrlPipe,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'VanStock';
  lowStockCount    = 0;
  isHandset        = false;
  pushSubscribed   = false;
  pushLoading      = false;

  readonly languages = LANGUAGES;

  private destroy$    = new Subject<void>();
  private lastUserId: number | null = null;

  adminGroupExpanded = false;

  // Mutable display arrays — populated by rebuildDisplayItems()
  displayFlatItems:  NavItem[] = [];
  displayAdminItems: NavItem[] = [];

  allNavItems: NavItem[] = [
    { labelKey: 'NAV.DASHBOARD',        icon: 'dashboard',        route: '/dashboard'        },
    { labelKey: 'NAV.PRODUCTS',         icon: 'inventory_2',      route: '/products'         },
    { labelKey: 'NAV.SCANNER',          icon: 'qr_code_scanner',  route: '/scanner',          resource: 'WEB_MENU_SCANNER' },
    { labelKey: 'NAV.MOVEMENTS',        icon: 'swap_horiz',       route: '/movements'        },
    { labelKey: 'NAV.JOBS',             icon: 'work',             route: '/jobs'             },
    { labelKey: 'NAV.PURCHASE_ORDERS',  icon: 'shopping_cart',    route: '/purchase-orders',  adminOnly: true },
    { labelKey: 'NAV.VAN_LOAD',         icon: 'upload',           route: '/van-load'         },
    { labelKey: 'NAV.VAN_REPORT',       icon: 'summarize',        route: '/van-report'       },
    { labelKey: 'NAV.VEHICLE_CALENDAR', icon: 'event_available',  route: '/vehicle-calendar' },
    { labelKey: 'NAV.REPORTS',          icon: 'assignment',       route: '/reports'          },
    { labelKey: 'NAV.MARGINS',          icon: 'trending_up',      route: '/margins',          adminOnly: true, resource: 'WEB_MENU_MARGINS' },
    { labelKey: 'NAV.SCHEDULING',       icon: 'calendar_month',   route: '/scheduling',       adminOnly: true },
    { labelKey: 'NAV.TIMELINE',         icon: 'view_timeline',    route: '/timeline',         adminOnly: true, resource: 'WEB_MENU_TIMELINE' },
    { labelKey: 'NAV.ANALYTICS',        icon: 'show_chart',       route: '/analytics',        adminOnly: true, resource: 'WEB_MENU_ANALYTICS' },
    { labelKey: 'NAV.BADGE_CREATOR',    icon: 'screen_share',     route: '/badge-creator',    adminOnly: true, resource: 'WEB_MENU_BADGE_CREATOR' },
    { labelKey: 'NAV.ATTENDANCE',       icon: 'schedule',         route: '/attendance',       adminOnly: true, resource: 'WEB_MENU_ATTENDANCE' },
    { labelKey: 'NAV.MY_ABSENCES',      icon: 'event_busy',       route: '/my-absences',      resource: 'WEB_MENU_MY_ABSENCES' },
    // ── Amministrazione group (A→Z by English name) ──────────────────────────
    { labelKey: 'NAV.CLIENTS',       icon: 'people',        route: '/clients',       adminOnly: true },
    { labelKey: 'NAV.COMPANIES',     icon: 'business',      route: '/companies',     superOnly: true },
    { labelKey: 'NAV.FEATURES',          icon: 'toggle_on',  route: '/features',      superOnly: true },
    { labelKey: 'NAV.IMPORT_EXPORT', icon: 'import_export', route: '/import-export', adminOnly: true },
    { labelKey: 'NAV.LOCATIONS',     icon: 'place',         route: '/locations',     adminOnly: true },
    { labelKey: 'NAV.SUPPLIERS',     icon: 'store',         route: '/suppliers',     adminOnly: true },
    { labelKey: 'NAV.USERS',         icon: 'group',         route: '/users',         adminOnly: true },
    { labelKey: 'NAV.FIX_MAGAZZINO',      icon: 'build',        route: '/fix-magazzino',   adminOnly: true },
    { labelKey: 'NAV.INVENTORY_AUDIT',    icon: 'fact_check',   route: '/inventory-audit', adminOnly: true },
    { labelKey: 'ADMIN.ERROR_LOGS',       icon: 'bug_report',   route: '/error-logs',      adminOnly: true },
    { labelKey: 'NAV.SYSTEM',             icon: 'settings',     route: '/system',           adminOnly: true },
  ];

  constructor(
    private breakpointObserver: BreakpointObserver,
    private dashboardService:   DashboardService,
    public  auth:               AuthService,
    public  langSvc:            LanguageService,
    private router:             Router,
    public  push:               PushNotificationService,
    public  notif:              NotificationCenterService,
    private snack:              MatSnackBar,
    private cdr:                ChangeDetectorRef,
  ) {}

  // ── Nav display arrays ───────────────────────────────────────────────────

  rebuildDisplayItems(): void {
    const visible = this.allNavItems.filter(item => {
      const roleAllowed = item.superOnly ? this.auth.isSuperAdmin
        : item.adminOnly ? this.auth.isAdmin
        : true;
      return roleAllowed && (!item.resource || this.auth.hasResource(item.resource));
    });
    const flat  = visible.filter(i => !ADMIN_GROUP_ROUTES.has(i.route));
    const admin = visible.filter(i =>  ADMIN_GROUP_ROUTES.has(i.route));

    const userId = this.auth.currentUser?.id;
    if (userId && this.auth.isAdmin) {
      try {
        const saved = localStorage.getItem(`nav_order_${userId}`);
        if (saved) {
          const order: string[] = JSON.parse(saved);
          this.displayFlatItems  = this.applyOrder(flat,  order);
          this.displayAdminItems = this.applyOrder(admin, order);
          return;
        }
      } catch { /* ignore */ }
    }
    this.displayFlatItems  = flat;
    this.displayAdminItems = admin;
  }

  private applyOrder(items: NavItem[], order: string[]): NavItem[] {
    return [...items].sort((a, b) => {
      const ia = order.indexOf(a.route);
      const ib = order.indexOf(b.route);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }

  onDropFlat(event: CdkDragDrop<NavItem[]>): void {
    moveItemInArray(this.displayFlatItems, event.previousIndex, event.currentIndex);
    this.saveNavOrder();
  }

  onDropAdmin(event: CdkDragDrop<NavItem[]>): void {
    moveItemInArray(this.displayAdminItems, event.previousIndex, event.currentIndex);
    this.saveNavOrder();
  }

  private saveNavOrder(): void {
    const userId = this.auth.currentUser?.id;
    if (!userId) return;
    const order = [...this.displayFlatItems, ...this.displayAdminItems].map(i => i.route);
    localStorage.setItem(`nav_order_${userId}`, JSON.stringify(order));
  }

  get isAdminGroupActive(): boolean {
    return this.displayAdminItems.some(item => this.router.url.startsWith(item.route));
  }

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn;
  }

  ngOnInit(): void {
    this.langSvc.init();

    // Subscribe to user changes to detect when logo is updated
    this.auth.user$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.rebuildDisplayItems();
      this.cdr.markForCheck();
    });

    this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.TabletPortrait])
      .pipe(map(r => r.matches), takeUntil(this.destroy$))
      .subscribe(val => (this.isHandset = val));

    this.rebuildDisplayItems();
    this.loadAlerts();

    if (this.isLoggedIn) this.notif.startPolling();
    this.auth.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      if (user) this.notif.startPolling();
      else this.notif.stopPolling();
    });

    if (this.push.isSupported) {
      this.push.listenForMessages();
      this.push.subscription$.pipe(takeUntil(this.destroy$))
        .subscribe(sub => (this.pushSubscribed = !!sub));
    }

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.loadAlerts();
      // Rebuild whenever the logged-in user changes (login / logout / switch)
      const currentUserId = this.auth.currentUser?.id ?? null;
      if (currentUserId !== this.lastUserId) {
        this.lastUserId = currentUserId;
        this.rebuildDisplayItems();
      }
      if (this.isAdminGroupActive) this.adminGroupExpanded = true;
    });

    if (this.isAdminGroupActive) this.adminGroupExpanded = true;
  }

  ngOnDestroy(): void {
    this.notif.stopPolling();
    this.destroy$.next();
    this.destroy$.complete();
  }

  openNotification(n: AppNotification): void {
    if (!n.read_at) this.notif.markAsRead(n.id);
    if (n.url) this.router.navigateByUrl(n.url);
  }

  loadAlerts(): void {
    if (!this.auth.isLoggedIn) return;
    this.dashboardService.stats().subscribe({
      next:  stats => (this.lowStockCount = stats.low_stock_count),
      error: () => {},
    });
  }

  async togglePush(): Promise<void> {
    if (this.pushLoading) return;
    this.pushLoading = true;
    try {
      if (this.pushSubscribed) {
        await this.push.unsubscribe();
        this.pushSubscribed = false;
        this.snack.open('Notifiche disattivate', 'OK', { duration: 3000 });
      } else {
        await Promise.race([
          this.push.subscribe(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout: il browser non ha risposto entro 30 secondi')), 30_000)
          ),
        ]);
        this.pushSubscribed = true;
        this.snack.open('Notifiche attivate con successo', 'OK', { duration: 3000 });
      }
    } catch (err: unknown) {
      const msg: string =
        err instanceof Error
          ? err.message
          : typeof (err as any)?.message === 'string'
            ? (err as any).message
            : JSON.stringify(err);
      const lc = msg.toLowerCase();
      if (lc.includes('denied') || lc.includes('permission') || lc.includes('negat')) {
        this.snack.open('Permesso notifiche negato. Abilitalo nelle impostazioni del browser.', 'OK', { duration: 6000 });
      } else if (lc.includes('not supported') || lc.includes('isenabled') || lc.includes('not allowed')) {
        this.snack.open('Le notifiche push non sono supportate da questo browser.', 'OK', { duration: 5000 });
      } else {
        this.snack.open('Impossibile attivare le notifiche: ' + msg, 'OK', { duration: 5000 });
      }
    } finally {
      this.pushLoading = false;
    }
  }

  logout(): void {
    this.displayFlatItems  = [];
    this.displayAdminItems = [];
    this.auth.logout();
  }
}
