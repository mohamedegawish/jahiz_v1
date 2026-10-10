import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, LogIn, Settings } from 'lucide-react';
import { useAuth } from '../../auth/authContext';
import { roleLabel } from '../../lib/labels';
import { NotificationBell } from '../notifications/NotificationBell';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, title, subtitle }) => {
  const { user, logout, status } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    setMenuOpen(false);
    setLoggingOut(false);
    navigate('/login', { replace: true });
  };

  const initials = user ? user.name.split(' ').map((part) => part[0]).slice(0, 2).join('') : '';

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E6EAF0] px-3 sm:px-4 md:px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-2 sm:gap-3 md:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden shrink-0 p-2 rounded-xl text-[#667085] hover:bg-[#F1F4F9] hover:text-[#172033] transition-colors cursor-pointer"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            {title && <h1 className="text-sm sm:text-base font-bold text-[#172033] tracking-tight truncate">{title}</h1>}
            {subtitle && <p className="text-xs text-[#667085] hidden sm:block truncate">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center flex-nowrap gap-2 sm:gap-3 shrink-0">
          {!user && status === 'loading' ? (
            <span className="w-20 sm:w-24 h-8 rounded-xl bg-[#E6EAF0] animate-pulse" aria-hidden="true" />
          ) : !user ? (
            <button
              onClick={() => navigate('/login')}
              className="shrink-0 w-full sm:w-auto min-w-[96px] inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-[#002E4A] hover:bg-[#002E4A] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              تسجيل الدخول
            </button>
          ) : (
            <>
              {/* The role comes from the server (GET /me) and cannot be switched from the UI. */}
              <span
                className="hidden md:inline-flex shrink-0 items-center gap-2 px-3 py-1.5 rounded-xl border border-[#DDEBFD] bg-[#F7F9FC] text-xs font-semibold text-[#002E4A]"
                title="دور حسابك كما يحدده الخادم"
              >
                <span>الدور:</span>
                <span className="font-bold text-[#172033] truncate">{roleLabel(user.role)}</span>
              </span>

              <NotificationBell />

              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="shrink-0 flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 pr-1 sm:pr-2 cursor-pointer"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-tr from-[#002E4A] to-[#004A93] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {initials}
                  </div>
                  <div className="hidden lg:block text-right min-w-0">
                    <div className="text-xs font-bold text-[#172033] leading-tight truncate max-w-[180px]">{user.name}</div>
                    <div className="text-[10px] text-[#667085] leading-tight truncate max-w-[140px]">
                      {user.organization?.name ?? roleLabel(user.role)}
                    </div>
                  </div>
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                    <div role="menu" className="absolute left-0 mt-2 w-64 rounded-2xl bg-white border border-[#E6EAF0] shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2 border-b border-[#F1F4F9]">
                        <div className="text-xs font-bold text-[#172033]">{user.name}</div>
                        <div className="text-[11px] text-[#667085] break-all" dir="ltr">{user.email}</div>
                        <div className="text-[11px] text-[#667085] mt-0.5">{roleLabel(user.role)}</div>
                      </div>
                      {(user.role === 'provider_member' || user.role === 'factory_member') && (
                        <button
                          role="menuitem"
                          onClick={() => {
                            setMenuOpen(false);
                            navigate(user.role === 'provider_member' ? '/provider/settings' : '/factory/settings');
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-right text-xs font-semibold text-[#172033] hover:bg-[#F7F9FC] transition-colors cursor-pointer"
                        >
                          <Settings className="w-4 h-4" />
                          الإعدادات
                        </button>
                      )}
                      <button
                        role="menuitem"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-right text-xs font-semibold text-[#B82B3B] hover:bg-[#FDECEE] transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <LogOut className="w-4 h-4" />
                        {loggingOut ? 'جارٍ تسجيل الخروج...' : 'تسجيل الخروج'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

