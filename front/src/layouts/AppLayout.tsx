import React, { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { RouteFallback } from '../components/ui/RouteFallback';

/** Layout of the signed-in portals (IMC, factory, provider): sidebar and header. Public pages use PublicLayout. */
export const AppLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-row-reverse text-right" dir="rtl">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-[60] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-[#002E4A] focus:shadow-lg"
      >
        تخطَّ إلى المحتوى
      </a>
      {/* Sidebar (Right-anchored in RTL) */}
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div 
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:mr-20' : 'lg:mr-64'
        }`}
      >
        {/* Sticky Header */}
        <Header 
          onToggleSidebar={() => setMobileSidebarOpen(true)}
        />

        {/* Page Content Viewport */}
        <main id="main-content" className="flex-1 w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

