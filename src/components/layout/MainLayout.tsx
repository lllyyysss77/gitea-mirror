import { useState, useEffect, createContext, useContext } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { Dashboard } from "@/components/dashboard/Dashboard";
import Repository from "../repositories/Repository";
import Providers from "./Providers";
import { ConfigTabs } from "../config/ConfigTabs";
import { ActivityLog } from "../activity/ActivityLog";
import { Organization } from "../organizations/Organization";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/hooks/useAuth";
import { useRepoSync } from "@/hooks/useSyncRepo";
import { useConfigStatus } from "@/hooks/useConfigStatus";

// Navigation context to signal when navigation happens
const NavigationContext = createContext<{ navigationKey: number }>({ navigationKey: 0 });

export const useNavigation = () => useContext(NavigationContext);

interface AppProps {
  page:
    | "dashboard"
    | "repositories"
    | "organizations"
    | "configuration"
    | "activity-log";
  "client:load"?: boolean;
  "client:idle"?: boolean;
  "client:visible"?: boolean;
  "client:media"?: string;
  "client:only"?: boolean | string;
}

export default function App({ page }: AppProps) {
  return (
    <Providers>
      <AppWithProviders page={page} />
    </Providers>
  );
}

function AppWithProviders({ page: initialPage }: AppProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: configLoading } = useConfigStatus();
  const [currentPage, setCurrentPage] = useState<AppProps['page']>(initialPage);
  const [navigationKey, setNavigationKey] = useState(0);

  useRepoSync({
    userId: user?.id,
    enabled: user?.syncEnabled,
    interval: user?.syncInterval,
    lastSync: user?.lastSync,
    nextSync: user?.nextSync,
  });

  // Handle navigation from sidebar
  const handleNavigation = (pageName: string) => {
    setCurrentPage(pageName as AppProps['page']);
    // Increment navigation key to force components to refresh their loading state
    setNavigationKey(prev => prev + 1);
  };

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const pageMap: Record<string, AppProps['page']> = {
        '/': 'dashboard',
        '/repositories': 'repositories',
        '/organizations': 'organizations',
        '/config': 'configuration',
        '/activity': 'activity-log'
      };

      const pageName = pageMap[path] || 'dashboard';
      setCurrentPage(pageName);
      // Also increment navigation key for browser navigation to trigger loading states
      setNavigationKey(prev => prev + 1);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Show loading state only during initial auth/config loading
  const isInitialLoading = authLoading || (configLoading && !user);

  if (isInitialLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <NavigationContext.Provider value={{ navigationKey }}>
      <main className="flex min-h-screen flex-col">
        <Header currentPage={currentPage} onNavigate={handleNavigation} />
        <div className="flex flex-1">
          <Sidebar onNavigate={handleNavigation} />
          <section className="flex-1 p-6 overflow-y-auto h-[calc(100dvh-4.55rem)]">
            {currentPage === "dashboard" && <Dashboard />}
            {currentPage === "repositories" && <Repository />}
            {currentPage === "organizations" && <Organization />}
            {currentPage === "configuration" && <ConfigTabs />}
            {currentPage === "activity-log" && <ActivityLog />}
          </section>
        </div>
        <Toaster />
      </main>
    </NavigationContext.Provider>
  );
}
