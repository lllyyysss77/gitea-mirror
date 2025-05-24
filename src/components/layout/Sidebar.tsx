import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { links } from "@/data/Sidebar";
import { VersionInfo } from "./VersionInfo";

interface SidebarProps {
  className?: string;
  onNavigate?: (page: string) => void;
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const [currentPath, setCurrentPath] = useState<string>("");

  useEffect(() => {
    // Hydration happens here
    const path = window.location.pathname;
    setCurrentPath(path);
    console.log("Hydrated path:", path); // Should log now
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
  };

  return (
    <aside className={cn("w-64 border-r bg-background", className)}>
      <div className="flex flex-col h-full pt-4">
        <nav className="flex flex-col gap-y-1 pl-2 pr-3">
          {links.map((link, index) => {
            const isActive = currentPath === link.href;
            const Icon = link.icon;

            return (
              <button
                key={index}
                onClick={(e) => handleNavigation(link.href, e)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full text-left",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto px-4 py-4">
          <div className="rounded-md bg-muted p-3">
            <h4 className="text-sm font-medium mb-2">Need Help?</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Check out the documentation for help with setup and configuration.
            </p>
            <a
              href="/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Documentation
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <VersionInfo />
        </div>
      </div>
    </aside>
  );
}
