import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SiGitea } from "react-icons/si";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { useConfigStatus } from "@/hooks/useConfigStatus";

interface HeaderProps {
  currentPage?: "dashboard" | "repositories" | "organizations" | "configuration" | "activity-log";
}

export function Header({ currentPage }: HeaderProps) {
  const { user, logout, isLoading } = useAuth();
  const { isLiveEnabled, toggleLive } = useLiveRefresh();
  const { isFullyConfigured, isLoading: configLoading } = useConfigStatus();

  // Show Live button on all pages except configuration
  const showLiveButton = currentPage && currentPage !== "configuration";

  // Determine button state and tooltip
  const isLiveActive = isLiveEnabled && isFullyConfigured;
  const getTooltip = () => {
    if (!isFullyConfigured && !configLoading) {
      return 'Configure GitHub and Gitea settings to enable live refresh';
    }
    return isLiveEnabled ? 'Disable live refresh' : 'Enable live refresh';
  };

  const handleLogout = async () => {
    toast.success("Logged out successfully");
    // Small delay to show the toast before redirecting
    await new Promise((resolve) => setTimeout(resolve, 500));
    logout();
  };

  // Auth buttons skeleton loader
  function AuthButtonsSkeleton() {
    return (
      <>
        <Skeleton className="h-10 w-10 rounded-full" /> {/* Avatar placeholder */}
        <Skeleton className="h-10 w-24" /> {/* Button placeholder */}
      </>
    );
  }

  return (
    <header className="border-b bg-background">
      <div className="flex h-[4.5rem] items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2 py-1">
          <SiGitea className="h-6 w-6" />
          <span className="text-xl font-bold">Gitea Mirror</span>
        </a>

        <div className="flex items-center gap-4">
          {showLiveButton && (
            <Button
              variant="outline"
              size="lg"
              className={`flex items-center gap-2 ${!isFullyConfigured && !configLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={isFullyConfigured || configLoading ? toggleLive : undefined}
              title={getTooltip()}
              disabled={!isFullyConfigured && !configLoading}
            >
              <div className={`w-3 h-3 rounded-full ${
                configLoading
                  ? 'bg-yellow-400 animate-pulse'
                  : isLiveActive
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-gray-500'
              }`} />
              <span>LIVE</span>
            </Button>
          )}

          <ModeToggle />

          {isLoading ? (
            <AuthButtonsSkeleton />
          ) : user ? (
            <>
              <Avatar>
                <AvatarImage src="" alt="@shadcn" />
                <AvatarFallback>
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="lg" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <Button variant="outline" size="lg" asChild>
              <a href="/login">Login</a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
