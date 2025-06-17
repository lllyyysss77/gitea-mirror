import { useCallback, useEffect, useState } from "react";
import RepositoryTable from "./RepositoryTable";
import type { MirrorJob, Repository } from "@/lib/db/schema";
import { useAuth } from "@/hooks/useAuth";
import {
  repoStatusEnum,
  type AddRepositoriesApiRequest,
  type AddRepositoriesApiResponse,
  type RepositoryApiResponse,
  type RepoStatus,
} from "@/types/Repository";
import { apiRequest, showErrorToast } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, FlipHorizontal, RotateCcw, X } from "lucide-react";
import type { MirrorRepoRequest, MirrorRepoResponse } from "@/types/mirror";
import { useSSE } from "@/hooks/useSEE";
import { useFilterParams } from "@/hooks/useFilterParams";
import { toast } from "sonner";
import type { SyncRepoRequest, SyncRepoResponse } from "@/types/sync";
import { OwnerCombobox, OrganizationCombobox } from "./RepositoryComboboxes";
import type { RetryRepoRequest, RetryRepoResponse } from "@/types/retry";
import AddRepositoryDialog from "./AddRepositoryDialog";

import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { useConfigStatus } from "@/hooks/useConfigStatus";
import { useNavigation } from "@/components/layout/MainLayout";

export default function Repository() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { user } = useAuth();
  const { registerRefreshCallback, isLiveEnabled } = useLiveRefresh();
  const { isGitHubConfigured, isFullyConfigured } = useConfigStatus();
  const { navigationKey } = useNavigation();
  const { filter, setFilter } = useFilterParams({
    searchTerm: "",
    status: "",
    organization: "",
    owner: "",
  });
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [selectedRepoIds, setSelectedRepoIds] = useState<Set<string>>(new Set());

  // Read organization filter from URL when component mounts
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orgParam = urlParams.get("organization");

    if (orgParam) {
      setFilter((prev) => ({ ...prev, organization: orgParam }));
    }
  }, [setFilter]);

  const [loadingRepoIds, setLoadingRepoIds] = useState<Set<string>>(new Set()); // this is used when the api actions are performed

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
    }

    console.log("Received new log:", data);
  }, []);

  // Use the SSE hook
  const { connected } = useSSE({
    userId: user?.id,
    onMessage: handleNewMessage,
  });

  const fetchRepositories = useCallback(async (isLiveRefresh = false) => {
    if (!user?.id) return;

    // Don't fetch repositories if GitHub is not configured or still loading config
    if (!isGitHubConfigured) {
      setIsInitialLoading(false);
      return false;
    }

    try {
      // Set appropriate loading state based on refresh type
      if (!isLiveRefresh) {
        setIsInitialLoading(true);
      }

      const response = await apiRequest<RepositoryApiResponse>(
        `/github/repositories?userId=${user.id}`,
        {
          method: "GET",
        }
      );

      if (response.success) {
        setRepositories(response.repositories);
        return true;
      } else {
        // Only show error toast for manual refreshes to avoid spam during live updates
        if (!isLiveRefresh) {
          showErrorToast(response.error || "Error fetching repositories", toast);
        }
        return false;
      }
    } catch (error) {
      // Only show error toast for manual refreshes to avoid spam during live updates
      if (!isLiveRefresh) {
        showErrorToast(error, toast);
      }
      return false;
    } finally {
      if (!isLiveRefresh) {
        setIsInitialLoading(false);
      }
    }
  }, [user?.id, isGitHubConfigured]); // Only depend on user.id, not entire user object

  useEffect(() => {
    // Reset loading state when component becomes active
    setIsInitialLoading(true);
    fetchRepositories(false); // Manual refresh, not live
  }, [fetchRepositories, navigationKey]); // Include navigationKey to trigger on navigation

  // Register with global live refresh system
  useEffect(() => {
    // Only register for live refresh if GitHub is configured
    if (!isGitHubConfigured) {
      return;
    }

    const unregister = registerRefreshCallback(() => {
      fetchRepositories(true); // Live refresh
    });

    return unregister;
  }, [registerRefreshCallback, fetchRepositories, isGitHubConfigured]);

  const handleRefresh = async () => {
    const success = await fetchRepositories(false); // Manual refresh, show loading skeleton
    if (success) {
      toast.success("Repositories refreshed successfully.");
    }
  };

  const handleMirrorRepo = async ({ repoId }: { repoId: string }) => {
    try {
      if (!user || !user.id) {
        return;
      }

      setLoadingRepoIds((prev) => new Set(prev).add(repoId));

      const reqPayload: MirrorRepoRequest = {
        userId: user.id,
        repositoryIds: [repoId],
      };

      const response = await apiRequest<MirrorRepoResponse>(
        "/job/mirror-repo",
        {
          method: "POST",
          data: reqPayload,
        }
      );

      if (response.success) {
        toast.success(`Mirroring started for repository ID: ${repoId}`);
        setRepositories((prevRepos) =>
          prevRepos.map((repo) => {
            const updated = response.repositories.find((r) => r.id === repo.id);
            return updated ? updated : repo;
          })
        );
      } else {
        showErrorToast(response.error || "Error starting mirror job", toast);
      }
    } catch (error) {
      showErrorToast(error, toast);
    } finally {
      setLoadingRepoIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(repoId);
        return newSet;
      });
    }
  };

  const handleMirrorAllRepos = async () => {
    try {
      if (!user || !user.id || repositories.length === 0) {
        return;
      }

      // Filter out repositories that are already mirroring to avoid duplicate operations. also filter out mirrored (mirrored can be synced and not mirrored again)
      const eligibleRepos = repositories.filter(
        (repo) =>
          repo.status !== "mirroring" && repo.status !== "mirrored" && repo.id //not ignoring failed ones because we want to retry them if not mirrored. if mirrored, gitea fucnion handlers will silently ignore them
      );

      if (eligibleRepos.length === 0) {
        toast.info("No eligible repositories to mirror");
        return;
      }

      // Get all repository IDs
      const repoIds = eligibleRepos.map((repo) => repo.id as string);

      // Set loading state for all repositories being mirrored
      setLoadingRepoIds((prev) => {
        const newSet = new Set(prev);
        repoIds.forEach((id) => newSet.add(id));
        return newSet;
      });

      const reqPayload: MirrorRepoRequest = {
        userId: user.id,
        repositoryIds: repoIds,
      };

      const response = await apiRequest<MirrorRepoResponse>(
        "/job/mirror-repo",
        {
          method: "POST",
          data: reqPayload,
        }
      );

      if (response.success) {
        toast.success(`Mirroring started for ${repoIds.length} repositories`);
        setRepositories((prevRepos) =>
          prevRepos.map((repo) => {
            const updated = response.repositories.find((r) => r.id === repo.id);
            return updated ? updated : repo;
          })
        );
      } else {
        showErrorToast(response.error || "Error starting mirror jobs", toast);
      }
    } catch (error) {
      showErrorToast(error, toast);
    } finally {
      // Reset loading states - we'll let the SSE updates handle status changes
      setLoadingRepoIds(new Set());
    }
  };

  // Bulk action handlers
  const handleBulkMirror = async () => {
    if (selectedRepoIds.size === 0) return;
    
    const selectedRepos = repositories.filter(repo => repo.id && selectedRepoIds.has(repo.id));
    const eligibleRepos = selectedRepos.filter(
      repo => repo.status === "imported" || repo.status === "failed"
    );

    if (eligibleRepos.length === 0) {
      toast.info("No eligible repositories to mirror in selection");
      return;
    }

    const repoIds = eligibleRepos.map(repo => repo.id as string);
    
    setLoadingRepoIds(prev => {
      const newSet = new Set(prev);
      repoIds.forEach(id => newSet.add(id));
      return newSet;
    });

    try {
      const response = await apiRequest<MirrorRepoResponse>("/job/mirror-repo", {
        method: "POST",
        data: { userId: user?.id, repositoryIds: repoIds }
      });

      if (response.success) {
        toast.success(`Mirroring started for ${repoIds.length} repositories`);
        setRepositories(prevRepos =>
          prevRepos.map(repo => {
            const updated = response.repositories.find(r => r.id === repo.id);
            return updated ? updated : repo;
          })
        );
        setSelectedRepoIds(new Set());
      } else {
        showErrorToast(response.error || "Error starting mirror jobs", toast);
      }
    } catch (error) {
      showErrorToast(error, toast);
    } finally {
      setLoadingRepoIds(new Set());
    }
  };

  const handleBulkSync = async () => {
    if (selectedRepoIds.size === 0) return;
    
    const selectedRepos = repositories.filter(repo => repo.id && selectedRepoIds.has(repo.id));
    const eligibleRepos = selectedRepos.filter(
      repo => repo.status === "mirrored" || repo.status === "synced"
    );

    if (eligibleRepos.length === 0) {
      toast.info("No eligible repositories to sync in selection");
      return;
    }

    const repoIds = eligibleRepos.map(repo => repo.id as string);
    
    setLoadingRepoIds(prev => {
      const newSet = new Set(prev);
      repoIds.forEach(id => newSet.add(id));
      return newSet;
    });

    try {
      const response = await apiRequest<SyncRepoResponse>("/job/sync-repo", {
        method: "POST",
        data: { userId: user?.id, repositoryIds: repoIds }
      });

      if (response.success) {
        toast.success(`Syncing started for ${repoIds.length} repositories`);
        setRepositories(prevRepos =>
          prevRepos.map(repo => {
            const updated = response.repositories.find(r => r.id === repo.id);
            return updated ? updated : repo;
          })
        );
        setSelectedRepoIds(new Set());
      } else {
        showErrorToast(response.error || "Error starting sync jobs", toast);
      }
    } catch (error) {
      showErrorToast(error, toast);
    } finally {
      setLoadingRepoIds(new Set());
    }
  };

  const handleBulkRetry = async () => {
    if (selectedRepoIds.size === 0) return;
    
    const selectedRepos = repositories.filter(repo => repo.id && selectedRepoIds.has(repo.id));
    const eligibleRepos = selectedRepos.filter(repo => repo.status === "failed");

    if (eligibleRepos.length === 0) {
      toast.info("No failed repositories in selection to retry");
      return;
    }

    const repoIds = eligibleRepos.map(repo => repo.id as string);
    
    setLoadingRepoIds(prev => {
      const newSet = new Set(prev);
      repoIds.forEach(id => newSet.add(id));
      return newSet;
    });

    try {
      const response = await apiRequest<RetryRepoResponse>("/job/retry-repo", {
        method: "POST",
        data: { userId: user?.id, repositoryIds: repoIds }
      });

      if (response.success) {
        toast.success(`Retrying ${repoIds.length} repositories`);
        setRepositories(prevRepos =>
          prevRepos.map(repo => {
            const updated = response.repositories.find(r => r.id === repo.id);
            return updated ? updated : repo;
          })
        );
        setSelectedRepoIds(new Set());
      } else {
        showErrorToast(response.error || "Error retrying jobs", toast);
      }
    } catch (error) {
      showErrorToast(error, toast);
    } finally {
      setLoadingRepoIds(new Set());
    }
  };

  const handleSyncRepo = async ({ repoId }: { repoId: string }) => {
    try {
      if (!user || !user.id) {
        return;
      }

      setLoadingRepoIds((prev) => new Set(prev).add(repoId));

      const reqPayload: SyncRepoRequest = {
        userId: user.id,
        repositoryIds: [repoId],
      };

      const response = await apiRequest<SyncRepoResponse>("/job/sync-repo", {
        method: "POST",
        data: reqPayload,
      });

      if (response.success) {
        toast.success(`Syncing started for repository ID: ${repoId}`);
        setRepositories((prevRepos) =>
          prevRepos.map((repo) => {
            const updated = response.repositories.find((r) => r.id === repo.id);
            return updated ? updated : repo;
          })
        );
      } else {
        showErrorToast(response.error || "Error starting sync job", toast);
      }
    } catch (error) {
      showErrorToast(error, toast);
    } finally {
      setLoadingRepoIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(repoId);
        return newSet;
      });
    }
  };

  const handleRetryRepoAction = async ({ repoId }: { repoId: string }) => {
    try {
      if (!user || !user.id) {
        return;
      }

      setLoadingRepoIds((prev) => new Set(prev).add(repoId));

      const reqPayload: RetryRepoRequest = {
        userId: user.id,
        repositoryIds: [repoId],
      };

      const response = await apiRequest<RetryRepoResponse>("/job/retry-repo", {
        method: "POST",
        data: reqPayload,
      });

      if (response.success) {
        toast.success(`Retrying job for repository ID: ${repoId}`);
        setRepositories((prevRepos) =>
          prevRepos.map((repo) => {
            const updated = response.repositories.find((r) => r.id === repo.id);
            return updated ? updated : repo;
          })
        );
      } else {
        showErrorToast(response.error || "Error retrying job", toast);
      }
    } catch (error) {
      showErrorToast(error, toast);
    } finally {
      setLoadingRepoIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(repoId);
        return newSet;
      });
    }
  };

  const handleAddRepository = async ({
    repo,
    owner,
  }: {
    repo: string;
    owner: string;
  }) => {
    try {
      if (!user || !user.id) {
        return;
      }

      const reqPayload: AddRepositoriesApiRequest = {
        userId: user.id,
        repo,
        owner,
      };

      const response = await apiRequest<AddRepositoriesApiResponse>(
        "/sync/repository",
        {
          method: "POST",
          data: reqPayload,
        }
      );

      if (response.success) {
        toast.success(`Repository added successfully`);
        setRepositories((prevRepos) => [...prevRepos, response.repository]);

        await fetchRepositories(false); // Manual refresh after adding repository

        setFilter((prev) => ({
          ...prev,
          searchTerm: repo,
        }));
      } else {
        showErrorToast(response.error || "Error adding repository", toast);
      }
    } catch (error) {
      showErrorToast(error, toast);
    }
  };

  // Get unique owners and organizations for comboboxes
  const ownerOptions = Array.from(
    new Set(
      repositories.map((repo) => repo.owner).filter((v): v is string => !!v)
    )
  ).sort();
  const orgOptions = Array.from(
    new Set(
      repositories
        .map((repo) => repo.organization)
        .filter((v): v is string => !!v)
    )
  ).sort();

  // Determine what actions are available for selected repositories
  const getAvailableActions = () => {
    if (selectedRepoIds.size === 0) return [];
    
    const selectedRepos = repositories.filter(repo => repo.id && selectedRepoIds.has(repo.id));
    const statuses = new Set(selectedRepos.map(repo => repo.status));
    
    const actions = [];
    
    // Check if any selected repos can be mirrored
    if (selectedRepos.some(repo => repo.status === "imported" || repo.status === "failed")) {
      actions.push('mirror');
    }
    
    // Check if any selected repos can be synced
    if (selectedRepos.some(repo => repo.status === "mirrored" || repo.status === "synced")) {
      actions.push('sync');
    }
    
    // Check if any selected repos are failed
    if (selectedRepos.some(repo => repo.status === "failed")) {
      actions.push('retry');
    }
    
    return actions;
  };
  
  const availableActions = getAvailableActions();

  return (
    <div className="flex flex-col gap-y-8">
      {/* Combine search and actions into a single flex row */}
      <div className="flex flex-row items-center gap-4 w-full flex-wrap">
        <div className="relative flex-grow min-w-[180px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search repositories..."
            className="pl-8 h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={filter.searchTerm}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, searchTerm: e.target.value }))
            }
          />
        </div>

        {/* Owner Combobox */}
        <OwnerCombobox
          options={ownerOptions}
          value={filter.owner || ""}
          onChange={(owner: string) =>
            setFilter((prev) => ({ ...prev, owner }))
          }
        />

        {/* Organization Combobox */}
        <OrganizationCombobox
          options={orgOptions}
          value={filter.organization || ""}
          onChange={(organization: string) =>
            setFilter((prev) => ({ ...prev, organization }))
          }
        />

        <Select
          value={filter.status || "all"}
          onValueChange={(value) =>
            setFilter((prev) => ({
              ...prev,
              status: value === "all" ? "" : (value as RepoStatus),
            }))
          }
        >
          <SelectTrigger className="w-[140px] h-9 max-h-9">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            {["all", ...repoStatusEnum.options].map((status) => (
              <SelectItem key={status} value={status}>
                {status === "all"
                  ? "All Status"
                  : status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          title="Refresh repositories"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* Context-aware action buttons */}
        {selectedRepoIds.size === 0 ? (
          <Button
            variant="default"
            onClick={handleMirrorAllRepos}
            disabled={isInitialLoading || loadingRepoIds.size > 0}
          >
            <FlipHorizontal className="h-4 w-4 mr-2" />
            Mirror All
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-md">
              <span className="text-sm font-medium">
                {selectedRepoIds.size} selected
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSelectedRepoIds(new Set())}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {availableActions.includes('mirror') && (
              <Button
                variant="default"
                size="sm"
                onClick={handleBulkMirror}
                disabled={loadingRepoIds.size > 0}
              >
                <FlipHorizontal className="h-4 w-4 mr-2" />
                Mirror ({selectedRepoIds.size})
              </Button>
            )}
            
            {availableActions.includes('sync') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkSync}
                disabled={loadingRepoIds.size > 0}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync ({selectedRepoIds.size})
              </Button>
            )}
            
            {availableActions.includes('retry') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkRetry}
                disabled={loadingRepoIds.size > 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            )}
          </div>
        )}
      </div>

      {!isGitHubConfigured ? (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-md">
          <h3 className="text-xl font-semibold mb-2">GitHub Not Configured</h3>
          <p className="text-muted-foreground text-center mb-4">
            You need to configure your GitHub credentials before you can fetch and mirror repositories.
          </p>
          <Button
            variant="default"
            onClick={() => {
              window.history.pushState({}, '', '/config');
              // We need to trigger a page change event for the navigation system
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
          >
            Go to Configuration
          </Button>
        </div>
      ) : (
        <RepositoryTable
          repositories={repositories}
          isLoading={isInitialLoading || !connected}
          isLiveActive={isLiveEnabled && isFullyConfigured}
          filter={filter}
          setFilter={setFilter}
          onMirror={handleMirrorRepo}
          onSync={handleSyncRepo}
          onRetry={handleRetryRepoAction}
          loadingRepoIds={loadingRepoIds}
          selectedRepoIds={selectedRepoIds}
          onSelectionChange={setSelectedRepoIds}
        />
      )}

      <AddRepositoryDialog
        onAddRepository={handleAddRepository}
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
      />
    </div>
  );
}
