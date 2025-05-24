import { StatusCard } from "./StatusCard";
import { RecentActivity } from "./RecentActivity";
import { RepositoryList } from "./RepositoryList";
import { GitFork, Clock, FlipHorizontal, Building2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MirrorJob, Organization, Repository } from "@/lib/db/schema";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/utils";
import type { DashboardApiResponse } from "@/types/dashboard";
import { useSSE } from "@/hooks/useSEE";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { useConfigStatus } from "@/hooks/useConfigStatus";

export function Dashboard() {
  const { user } = useAuth();
  const { registerRefreshCallback } = useLiveRefresh();
  const isPageVisible = usePageVisibility();
  const { isFullyConfigured } = useConfigStatus();

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activities, setActivities] = useState<MirrorJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [repoCount, setRepoCount] = useState<number>(0);
  const [orgCount, setOrgCount] = useState<number>(0);
  const [mirroredCount, setMirroredCount] = useState<number>(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Dashboard auto-refresh timer (30 seconds)
  const dashboardTimerRef = useRef<NodeJS.Timeout | null>(null);
  const DASHBOARD_REFRESH_INTERVAL = 30000; // 30 seconds

  // Create a stable callback using useCallback
  const handleNewMessage = useCallback((data: MirrorJob) => {
    if (data.repositoryId) {
      setRepositories((prevRepos) =>
        prevRepos.map((repo) =>
          repo.id === data.repositoryId
            ? { ...repo, status: data.status, details: data.details }
            : repo
        )
      );
    } else if (data.organizationId) {
      setOrganizations((prevOrgs) =>
        prevOrgs.map((org) =>
          org.id === data.organizationId
            ? { ...org, status: data.status, details: data.details }
            : org
        )
      );
    }

    setActivities((prevActivities) => [data, ...prevActivities]);

    console.log("Received new log:", data);
  }, []);

  // Use the SSE hook
  const { connected } = useSSE({
    userId: user?.id,
    onMessage: handleNewMessage,
  });

  // Extract fetchDashboardData as a stable callback
  const fetchDashboardData = useCallback(async (showToast = false) => {
    try {
      if (!user || !user.id) {
        return false;
      }

      // Don't fetch data if configuration is not complete
      if (!isFullyConfigured) {
        if (showToast) {
          toast.info("Please configure GitHub and Gitea settings first");
        }
        return false;
      }

      const response = await apiRequest<DashboardApiResponse>(
        `/dashboard?userId=${user.id}`,
        {
          method: "GET",
        }
      );

      if (response.success) {
        setRepositories(response.repositories);
        setOrganizations(response.organizations);
        setActivities(response.activities);
        setRepoCount(response.repoCount);
        setOrgCount(response.orgCount);
        setMirroredCount(response.mirroredCount);
        setLastSync(response.lastSync);

        if (showToast) {
          toast.success("Dashboard data refreshed successfully");
        }
        return true;
      } else {
        toast.error(response.error || "Error fetching dashboard data");
        return false;
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error fetching dashboard data"
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isFullyConfigured]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Setup dashboard auto-refresh (30 seconds) and register with live refresh
  useEffect(() => {
    // Clear any existing timer
    if (dashboardTimerRef.current) {
      clearInterval(dashboardTimerRef.current);
      dashboardTimerRef.current = null;
    }

    // Set up 30-second auto-refresh only when page is visible and configuration is complete
    if (isPageVisible && isFullyConfigured) {
      dashboardTimerRef.current = setInterval(() => {
        fetchDashboardData();
      }, DASHBOARD_REFRESH_INTERVAL);
    }

    // Cleanup on unmount or when page becomes invisible
    return () => {
      if (dashboardTimerRef.current) {
        clearInterval(dashboardTimerRef.current);
        dashboardTimerRef.current = null;
      }
    };
  }, [isPageVisible, isFullyConfigured, fetchDashboardData]);

  // Register with global live refresh system
  useEffect(() => {
    const unregister = registerRefreshCallback(() => {
      fetchDashboardData();
    });

    return unregister;
  }, [registerRefreshCallback, fetchDashboardData]);

  // Status Card Skeleton component
  function StatusCardSkeleton() {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
          <Skeleton className="h-4 w-4 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    );
  }

  return isLoading || !connected ? (
    <div className="flex flex-col gap-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCardSkeleton />
        <StatusCardSkeleton />
        <StatusCardSkeleton />
        <StatusCardSkeleton />
      </div>

      <div className="flex gap-x-6 items-start">
        {/* Repository List Skeleton */}
        <div className="w-1/2 border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>

        {/* Recent Activity Skeleton */}
        <div className="w-1/2 border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="flex flex-col gap-y-6">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatusCard
          title="Total Repositories"
          value={repoCount}
          icon={<GitFork className="h-4 w-4" />}
          description="Repositories being mirrored"
        />
        <StatusCard
          title="Mirrored"
          value={mirroredCount}
          icon={<FlipHorizontal className="h-4 w-4" />}
          description="Successfully mirrored"
        />
        <StatusCard
          title="Organizations"
          value={orgCount}
          icon={<Building2 className="h-4 w-4" />}
          description="GitHub organizations"
        />
        <StatusCard
          title="Last Sync"
          value={
            lastSync
              ? new Date(lastSync).toLocaleString("en-US", {
                  month: "2-digit",
                  day: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "N/A"
          }
          icon={<Clock className="h-4 w-4" />}
          description="Last successful sync"
        />
      </div>

      <div className="flex gap-x-6 items-start">
        <RepositoryList repositories={repositories} />

        {/* the api already sends 10 activities only but slicing in case of realtime updates */}
        <RecentActivity activities={activities.slice(0, 10)} />
      </div>
    </div>
  );
}
