import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { SiGitea } from "react-icons/si";
import { ModeToggle } from "@/components/theme/ModeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export function Header() {
  const { user, logout, isLoading } = useAuth();

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
