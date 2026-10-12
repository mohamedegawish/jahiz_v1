import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Factory, 
  Building2, 
  CheckCircle2, 
  Hash,
  Layers, 
  FileText, 
  BarChart3, 
  Users, 
  ClipboardCheck, 
  Compass, 
  Send, 
  Receipt, 
  X,
  ChevronRight,
  ChevronLeft,
  Home,
  UserPlus,
  LogIn,
  Megaphone,
  ScrollText,
  Settings,
  ShieldCheck,
  FilePen,
  Bell,
  Landmark,
  Map as MapIcon,
  Route as RouteIcon,
  ShoppingCart,
  Clapperboard,
  Globe,
} from 'lucide-react';
import { api } from '../../api';
import { useAuth } from '../../auth/authContext';
import { useApiQuery } from '../../hooks/useApiQuery';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItem {
  label: string;
  path: string;
  icon: any;
  badge?: number;
  highlight?: boolean;
  onClick?: () => void;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/** Work waiting for the signed-in user, from the API's own list totals. */
interface Badges {
  approvals: number;
  factoryApprovals?: number;
  listings?: number;
  changes?: number;
  inbox: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse
}) => {
  const { user, status } = useAuth();
  const location = useLocation();
  // Work waiting for this user, from the API's own totals: pending provider reviews (IMC) and unanswered requests (provider).
  // Re-read when the user navigates (throttled below), so a badge clears after the work is done.
  const role = user?.role;
  // Re-read on navigation, at most once per 30 seconds, so clicking through pages does not
  // spend the API rate limit on badge counts.
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const refreshWindow = useMemo(() => Math.floor(Date.now() / 30_000), [location.pathname]);
  const badges = useApiQuery<Badges>(
    async (signal) => {
      if (role === 'imc_admin') {
        const summary = await api.reviewSummary(signal);
        return {
          approvals: summary.providers.pending,
          factoryApprovals: summary.factories.pending,
          listings: summary.listings.pending,
          changes: summary.change_requests.providers + summary.change_requests.factories,
          inbox: 0,
        };
      }
      if (role === 'provider_member') {
        // Requests awaiting a response, plus threads with unread messages.
        const [pending, unread] = await Promise.all([
          api.providerRequests.list({ per_page: 1, filter: { status: 'pending' }, signal }),
          api.providerRequests.list({ per_page: 1, filter: { unread: true }, signal }),
        ]);
        return { approvals: 0, inbox: pending.meta.total + unread.meta.total };
      }
      if (role === 'factory_member') {
        return { approvals: 0, inbox: (await api.providerRequests.list({ per_page: 1, filter: { unread: true }, signal })).meta.total };
      }
      return { approvals: 0, inbox: 0 };
    },
    [role, refreshWindow],
    { enabled: role !== undefined },
  );
  const pendingApprovals = badges.data?.approvals || undefined;
  const pendingFactoryApprovals = badges.data?.factoryApprovals || undefined;
  const pendingListings = badges.data?.listings || undefined;
  const pendingChanges = badges.data?.changes || undefined;
  const pendingInbox = badges.data?.inbox || undefined;

  // Sections every visitor sees at the top. Portals are not listed: a signed-in user has exactly
  // one portal, decided by the server, and an anonymous visitor signs in first. Every role —
  // including IMC administrators — keeps «الصفحة الرئيسية» (owner brief, round 4).
  const getSharedSections = (): NavSection[] => [
    {
      title: user ? 'الصفحة الرئيسية' : 'الصفحة الرئيسية والتسجيل',
      items: user || status === 'loading'
        ? [{ label: 'الصفحة الرئيسية', path: '/', icon: Home }]
        : [
            { label: 'الصفحة الرئيسية', path: '/', icon: Home },
            { label: 'تسجيل الدخول', path: '/login', icon: LogIn },
            { label: 'تسجيل منشأة صناعية', path: '/register/factory', icon: UserPlus },
            { label: 'تسجيل مقدّم خدمة', path: '/register/provider', icon: UserPlus }
          ]
    }
  ];

  // Navigation configuration based on current portal role
  const getRoleSections = (): NavSection[] => {
    switch (user?.role) {
      case 'imc_admin':
        return [
          {
            title: 'نظرة عامة والتحليلات',
            items: [
              { label: 'لوحة القيادة والمؤشرات', path: '/admin/dashboard', icon: LayoutDashboard }
            ]
          },
          {
            title: 'المراجعة والاعتماد',
            items: [
              { label: 'اعتماد مقدّمي الخدمات', path: '/admin/approvals/providers', icon: CheckCircle2, badge: pendingApprovals },
              { label: 'اعتماد المنشآت الصناعية', path: '/admin/approvals/factories', icon: ShieldCheck, badge: pendingFactoryApprovals },
              { label: 'الخدمات وقوائم مقدّمي الخدمات', path: '/admin/services', icon: Layers, badge: pendingListings },
              { label: 'تعديلات البيانات الحساسة', path: '/admin/change-requests', icon: FilePen, badge: pendingChanges }
            ]
          },
          {
            title: 'إدارة المنظومة الصناعية',
            items: [
              { label: 'المصانع المسجلة', path: '/admin/factories', icon: Factory },
              { label: 'أرقام IMC المسجلة', path: '/admin/imc-numbers', icon: Hash },
              { label: 'مقدم الخدمة', path: '/admin/providers', icon: Building2 },
              { label: 'إدارة تقييم الجاهزية الرقمية', path: '/admin/readiness', icon: ClipboardCheck },
              { label: 'خطط التحول الرقمي', path: '/admin/roadmaps', icon: RouteIcon },
              { label: 'طلبات الخدمة والتفاوض', path: '/admin/requests', icon: Send },
              { label: 'الإعلانات والحملات الترويجية', path: '/admin/ads', icon: Megaphone },
              { label: 'فيديو الواجهة الرئيسية', path: '/admin/hero-video', icon: Clapperboard },
              { label: 'محتوى صفحة الهبوط', path: '/admin/landing', icon: Globe }
            ]
          },
          {
            title: 'الحوكمة والماليات',
            items: [
              { label: 'الاتفاقيات والعقود', path: '/admin/contracts', icon: FileText },
              { label: 'الماليات والفواتير', path: '/admin/reports', icon: BarChart3 },
              { label: 'الإعدادات المالية والتعاقدية', path: '/admin/financial-settings', icon: Landmark },
              { label: 'حسابات المستخدمين', path: '/admin/users', icon: Users },
              { label: 'الإشعارات', path: '/notifications', icon: Bell },
              { label: 'سجل التدقيق', path: '/admin/audit-logs', icon: ScrollText }
            ]
          }
        ];

      case 'provider_member':
        return [
          {
            title: 'بوابة مقدّم الخدمة',
            items: [
              { label: 'لوحة التحكم', path: '/provider/dashboard', icon: LayoutDashboard },
              { label: 'خدماتي', path: '/provider/services', icon: Layers },
              { label: 'طلبات المصانع', path: '/provider/requests', icon: Send, badge: pendingInbox },
              { label: 'العقود', path: '/provider/contracts', icon: FileText },
              { label: 'الفواتير', path: '/provider/invoices', icon: Receipt },
              { label: 'التقارير', path: '/provider/reports', icon: BarChart3 },
              { label: 'الإعدادات', path: '/provider/settings', icon: Settings }
            ]
          }
        ];

      case 'factory_member':
        return [
          {
            title: 'بوابة المنشأة الصناعية',
            items: [
              { label: 'لوحة التحكم', path: '/factory/dashboard', icon: LayoutDashboard },
              { label: 'تقييم الجاهزية الرقمية', path: '/factory/assessment', icon: ClipboardCheck },
              { label: 'الخدمات', path: '/factory/services', icon: Compass },
              { label: 'خطة الطلبات', path: '/factory/cart', icon: ShoppingCart },
              { label: 'خطة التحول الرقمي', path: '/factory/roadmap', icon: MapIcon },
              { label: 'خدماتي', path: '/factory/requests', icon: Layers, badge: pendingInbox },
              { label: 'العقود', path: '/factory/contracts', icon: FileText },
              { label: 'الفواتير', path: '/factory/invoices', icon: Receipt },
              { label: 'الإعدادات', path: '/factory/settings', icon: Settings }
            ]
          }
        ];

      default:
        return []; // anonymous visitor: only the shared sections
    }
  };

  const navSections: NavSection[] = [...getSharedSections(), ...getRoleSections()];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-[#172033]/40 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-40 bg-[#002E4A] flex flex-col transition-all duration-300 ease-in-out shadow-lg lg:shadow-none ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-72`}
      >
        {/* Top Branding Section */}
        <div className="h-16 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white p-1">
              <img src="/jahiz-logo-vector.svg" alt="جَاهِز" className={isCollapsed ? 'h-6 w-auto max-w-full object-contain' : 'h-9 w-auto object-contain'} />
            </span>
          </div>

          {/* Close on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Collapse toggle on desktop */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            title={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Portal Indicator Pill */}
        <div className={`px-4 py-2.5 shrink-0 ${isCollapsed ? 'text-center' : ''}`}>
          {!isCollapsed ? (
            <span className="text-[11px] font-bold text-white/55">
              {user?.role === 'provider_member' ? 'لوحة الشريك التكنولوجي' :
               user?.role === 'factory_member' ? 'بوابة المنشأة الصناعية' : 'منظومة جَاهِز'}
            </span>
          ) : null}
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((section, idx) => (
            <div key={idx} className="space-y-1">
              {!isCollapsed && (
                <div className={`px-3 mb-2 text-[10px] font-bold uppercase tracking-wider ${
                  idx === 0 ? 'text-[#E67E00]' : 'text-white/40'
                }`}>
                  {section.title}
                </div>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      item.onClick?.();
                      if (window.innerWidth < 1024) onClose();
                    }}
                    title={isCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative cursor-pointer ${
                      isActive
                        ? 'bg-white/10 text-white font-bold shadow-xs'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    } ${item.highlight && !isActive ? 'border border-[#E67E00]/50 bg-white/5 text-white' : ''}`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-[#E67E00]' : 'text-white/60'
                    }`} />

                    {!isCollapsed && (
                      <span className="truncate flex-1 text-right">{item.label}</span>
                    )}

                    {item.badge !== undefined && !isCollapsed && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E45B6A] text-white">
                        {item.badge}
                      </span>
                    )}

                    {/* Active vertical indicator bar */}
                    {isActive && (
                      <span className="absolute right-0 top-2 bottom-2 w-1 bg-[#E67E00] rounded-l-full" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};

