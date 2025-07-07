import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { links } from "@/data/Sidebar";
import { VersionInfo } from "./VersionInfo";

interface SidebarProps {
  className?: string;
  onNavigate?: (page: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ className, onNavigate, isOpen, onClose }: SidebarProps) {
  const [currentPath, setCurrentPath] = useState<string>("");

  useEffect(() => {
    // Hydration happens here
    const path = window.location.pathname;
    setCurrentPath(path);
  }, []);

  // Listen for URL changes (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigation = (href: string, event: React.MouseEvent) => {
    event.preventDefault();

    // Don't navigate if already on the same page
    if (currentPath === href) return;

    // Update URL without page reload
    window.history.pushState({}, '', href);
    setCurrentPath(href);

    // Map href to page name for the parent component
    const pageMap: Record<string, string> = {
      '/': 'dashboard',
      '/repositories': 'repositories',
      '/organizations': 'organizations',
      '/config': 'configuration',
      '/activity': 'activity-log'
    };

    const pageName = pageMap[href] || 'dashboard';
    onNavigate?.(pageName);
    
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-background border-r flex flex-col h-full lg:h-[calc(100vh-4.5rem)] transition-transform duration-200 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex flex-col h-full">
          <nav className="flex flex-col gap-y-1 lg:gap-y-1 pl-2 pr-3 pt-4 flex-shrink-0">
            {links.map((link, index) => {
              const isActive = currentPath === link.href;
              const Icon = link.icon;

              return (
                <button
                  key={index}
                  onClick={(e) => handleNavigation(link.href, e)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-3 lg:py-2 text-sm lg:text-sm font-medium transition-colors w-full text-left",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 lg:h-4 lg:w-4" />
                  {link.label}
                </button>
              );
            })}
          </nav>

          <div className="flex-1 min-h-0" />

          <div className="px-4 py-4 flex-shrink-0">
            <div className="rounded-md bg-muted p-3 lg:p-3">
              <h4 className="text-sm font-medium mb-2">Need Help?</h4>
              <p className="text-xs text-muted-foreground mb-3 lg:mb-2">
                Check out the documentation for help with setup and configuration.
              </p>
              <a
                href="/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs lg:text-xs text-primary hover:underline py-2 lg:py-0"
              >
                Documentation
                <ExternalLink className="h-3.5 w-3.5 lg:h-3 lg:w-3" />
              </a>
            </div>
            <VersionInfo />
          </div>
        </div>
      </aside>
    </>
  );
}
