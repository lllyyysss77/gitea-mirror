import * as React from "react";
import { AuthProvider } from "@/hooks/useAuth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LiveRefreshProvider } from "@/hooks/useLiveRefresh";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <LiveRefreshProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </LiveRefreshProvider>
    </AuthProvider>
  );
}
