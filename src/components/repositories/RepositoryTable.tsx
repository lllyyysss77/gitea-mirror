import { useMemo, useRef } from "react";
import Fuse from "fuse.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FlipHorizontal, GitFork, RefreshCw, RotateCcw, Star, Lock } from "lucide-react";
import { SiGithub, SiGitea } from "react-icons/si";
import type { Repository } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { formatDate, getStatusColor } from "@/lib/utils";
import type { FilterParams } from "@/types/filter";
import { Skeleton } from "@/components/ui/skeleton";
import { useGiteaConfig } from "@/hooks/useGiteaConfig";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InlineDestinationEditor } from "./InlineDestinationEditor";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RepositoryTableProps {
  repositories: Repository[];
  isLoading: boolean;
  isLiveActive?: boolean;
  filter: FilterParams;
  setFilter: (filter: FilterParams) => void;
  onMirror: ({ repoId }: { repoId: string }) => Promise<void>;
  onSync: ({ repoId }: { repoId: string }) => Promise<void>;
  onRetry: ({ repoId }: { repoId: string }) => Promise<void>;
  loadingRepoIds: Set<string>;
  selectedRepoIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  onRefresh?: () => Promise<void>;
}

export default function RepositoryTable({
  repositories,
  isLoading,
  isLiveActive = false,
  filter,
  setFilter,
  onMirror,
  onSync,
  onRetry,
  loadingRepoIds,
  selectedRepoIds,
  onSelectionChange,
  onRefresh,
}: RepositoryTableProps) {
  const tableParentRef = useRef<HTMLDivElement>(null);
  const { giteaConfig } = useGiteaConfig();

  const handleUpdateDestination = async (repoId: string, newDestination: string | null) => {
    // Call API to update repository destination
    const response = await fetch(`/api/repositories/${repoId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        destinationOrg: newDestination,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update repository");
    }

    // Refresh repositories data
    if (onRefresh) {
      await onRefresh();
    }
  };

  // Helper function to construct Gitea repository URL
  const getGiteaRepoUrl = (repository: Repository): string | null => {
    if (!giteaConfig?.url) {
      return null;
    }

    // Only provide Gitea links for repositories that have been or are being mirrored
    const validStatuses = ['mirroring', 'mirrored', 'syncing', 'synced'];
    if (!validStatuses.includes(repository.status)) {
      return null;
    }

    // Use mirroredLocation if available, otherwise construct from repository data
    let repoPath: string;
    if (repository.mirroredLocation) {
      repoPath = repository.mirroredLocation;
    } else {
      // Fallback: construct the path based on repository data
      const owner = repository.organization || repository.owner;
      repoPath = `${owner}/${repository.name}`;
    }

    // Ensure the base URL doesn't have a trailing slash
    const baseUrl = giteaConfig.url.endsWith('/')
      ? giteaConfig.url.slice(0, -1)
      : giteaConfig.url;

    return `${baseUrl}/${repoPath}`;
  };

  const hasAnyFilter = Object.values(filter).some(
    (val) => val?.toString().trim() !== ""
  );

  const filteredRepositories = useMemo(() => {
    let result = repositories;

    if (filter.status) {
      result = result.filter((repo) => repo.status === filter.status);
    }

    if (filter.owner) {
      result = result.filter((repo) => repo.owner === filter.owner);
    }

    if (filter.organization) {
      result = result.filter(
        (repo) => repo.organization === filter.organization
      );
    }

    if (filter.searchTerm) {
      const fuse = new Fuse(result, {
        keys: ["name", "fullName", "owner", "organization"],
        threshold: 0.3,
      });
      result = fuse.search(filter.searchTerm).map((res) => res.item);
    }

    return result;
  }, [repositories, filter]);

  const rowVirtualizer = useVirtualizer({
    count: filteredRepositories.length,
    getScrollElement: () => tableParentRef.current,
    estimateSize: () => 65,
    overscan: 5,
  });

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredRepositories.map(repo => repo.id).filter((id): id is string => !!id));
      onSelectionChange(allIds);
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectRepo = (repoId: string, checked: boolean) => {
    const newSelection = new Set(selectedRepoIds);
    if (checked) {
      newSelection.add(repoId);
    } else {
      newSelection.delete(repoId);
    }
    onSelectionChange(newSelection);
  };

  const isAllSelected = filteredRepositories.length > 0 && 
    filteredRepositories.every(repo => repo.id && selectedRepoIds.has(repo.id));
  const isPartiallySelected = selectedRepoIds.size > 0 && !isAllSelected;

  // Mobile card layout for repository
  const RepositoryCard = ({ repo }: { repo: Repository }) => {
    const isLoading = repo.id ? loadingRepoIds.has(repo.id) : false;
    const isSelected = repo.id ? selectedRepoIds.has(repo.id) : false;
    const giteaUrl = getGiteaRepoUrl(repo);

    return (
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => repo.id && handleSelectRepo(repo.id, checked as boolean)}
              className="mt-1"
            />
            <div className="flex-1 space-y-3">
              {/* Repository Info */}
              <div>
                <h3 className="font-medium text-sm break-all">{repo.name}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {repo.isPrivate && <Badge variant="secondary" className="text-xs"><Lock className="h-3 w-3 mr-1" />Private</Badge>}
                  {repo.isForked && <Badge variant="secondary" className="text-xs"><GitFork className="h-3 w-3 mr-1" />Fork</Badge>}
                  {repo.isStarred && <Badge variant="secondary" className="text-xs"><Star className="h-3 w-3 mr-1" />Starred</Badge>}
                </div>
              </div>

              {/* Owner & Organization */}
              <div className="text-xs text-muted-foreground">
                <div>Owner: {repo.owner}</div>
                {repo.organization && <div>Org: {repo.organization}</div>}
                {repo.destinationOrg && <div>Destination: {repo.destinationOrg}</div>}
              </div>

              {/* Status & Last Mirrored */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${getStatusColor(repo.status)}`} />
                  <span className="capitalize">{repo.status}</span>
                </div>
                <span className="text-muted-foreground">
                  {repo.lastMirrored ? formatDate(repo.lastMirrored) : "Never"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {(repo.status === "imported" || repo.status === "failed") && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => repo.id && onMirror({ repoId: repo.id })}
                    disabled={isLoading}
                  >
                    <FlipHorizontal className="h-3 w-3 mr-1" />
                    Mirror
                  </Button>
                )}
                {(repo.status === "mirrored" || repo.status === "synced") && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => repo.id && onSync({ repoId: repo.id })}
                    disabled={isLoading}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Sync
                  </Button>
                )}
                {repo.status === "failed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => repo.id && onRetry({ repoId: repo.id })}
                    disabled={isLoading}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}
                
                {/* Links */}
                <div className="flex gap-1 ml-auto">
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View on GitHub"
                    >
                      <SiGithub className="h-4 w-4" />
                    </a>
                  </Button>
                  {giteaUrl ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a
                        href={giteaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View on Gitea"
                      >
                        <SiGitea className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="Not mirrored to Gitea">
                      <SiGitea className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return isLoading ? (
    <div className="space-y-3 lg:space-y-0">
      {/* Mobile skeleton */}
      <div className="lg:hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="mb-3">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-4 w-4 mt-1" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop skeleton */}
      <div className="hidden lg:block border rounded-md">
        <div className="h-[45px] flex items-center justify-between border-b bg-muted/50">
          <div className="h-full p-3 flex items-center justify-center flex-[0.3]">
            <Skeleton className="h-4 w-4" />
          </div>
          <div className="h-full p-3 text-sm font-medium flex-[2.5]">
            Repository
          </div>
          <div className="h-full p-3 text-sm font-medium flex-[1]">Owner</div>
          <div className="h-full p-3 text-sm font-medium flex-[1]">
            Organization
          </div>
          <div className="h-full p-3 text-sm font-medium flex-[1]">
            Last Mirrored
          </div>
          <div className="h-full p-3 text-sm font-medium flex-[1]">Status</div>
          <div className="h-full p-3 text-sm font-medium flex-[1]">
            Actions
          </div>
          <div className="h-full p-3 text-sm font-medium flex-[0.8] text-center">
            Links
          </div>
        </div>

        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-[65px] flex items-center justify-between border-b bg-transparent"
          >
            <div className="h-full p-3 flex items-center justify-center flex-[0.3]">
              <Skeleton className="h-4 w-4" />
            </div>
            <div className="h-full p-3 flex-[2.5]">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-24 mt-1" />
            </div>
            <div className="h-full p-3 flex-[1]">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="h-full p-3 flex-[1]">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="h-full p-3 flex-[1]">
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="h-full p-3 flex-[1]">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="h-full p-3 flex-[1]">
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="h-full p-3 flex-[0.8] flex items-center justify-center gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div>
      {hasAnyFilter && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Showing {filteredRepositories.length} of {repositories.length} repositories
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilter({
                searchTerm: "",
                status: "",
                organization: "",
                owner: "",
              })
            }
          >
            Clear filters
          </Button>
        </div>
      )}

      {filteredRepositories.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {hasAnyFilter
              ? "No repositories match the current filters"
              : "No repositories found"}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="lg:hidden">
            {/* Select all checkbox */}
            <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded-md">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all repositories"
              />
              <span className="text-sm font-medium">
                Select All ({filteredRepositories.length})
              </span>
            </div>

            {/* Repository cards */}
            {filteredRepositories.map((repo) => (
              <RepositoryCard key={repo.id} repo={repo} />
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden lg:block border rounded-md">
            {/* Table header */}
            <div className="h-[45px] flex items-center justify-between border-b bg-muted/50">
              <div className="h-full p-3 flex items-center justify-center flex-[0.3]">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all repositories"
                />
              </div>
              <div className="h-full p-3 text-sm font-medium flex-[2.5]">
                Repository
              </div>
              <div className="h-full p-3 text-sm font-medium flex-[1]">Owner</div>
              <div className="h-full p-3 text-sm font-medium flex-[1]">
                Organization
              </div>
              <div className="h-full p-3 text-sm font-medium flex-[1]">
                Last Mirrored
              </div>
              <div className="h-full p-3 text-sm font-medium flex-[1]">Status</div>
              <div className="h-full p-3 text-sm font-medium flex-[1]">
                Actions
              </div>
              <div className="h-full p-3 text-sm font-medium flex-[0.8] text-center">
                Links
              </div>
            </div>

            {/* Table body with virtualization */}
            <div
              ref={tableParentRef}
              className="overflow-auto max-h-[calc(100dvh-25rem)]"
              style={{
                contain: "strict",
              }}
            >
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const repo = filteredRepositories[virtualRow.index];
                  const isLoading = repo.id ? loadingRepoIds.has(repo.id) : false;
                  const isSelected = repo.id ? selectedRepoIds.has(repo.id) : false;
                  const giteaUrl = getGiteaRepoUrl(repo);

                  return (
                    <div
                      key={virtualRow.key}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className="flex items-center justify-between border-b bg-transparent hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-full p-3 flex items-center justify-center flex-[0.3]">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => repo.id && handleSelectRepo(repo.id, checked as boolean)}
                        />
                      </div>
                      <div className="h-full p-3 flex-[2.5] pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{repo.name}</span>
                          {repo.isPrivate && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Lock className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Private repository</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {repo.isForked && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <GitFork className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Forked repository</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {repo.isStarred && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Star className="h-3 w-3 text-yellow-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Starred repository</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {repo.fullName}
                        </p>
                      </div>
                      <div className="h-full p-3 flex-[1] text-sm">
                        {repo.owner}
                      </div>
                      <div className="h-full p-3 flex-[1] text-sm">
                        <div className="flex flex-col">
                          <span>{repo.organization || "-"}</span>
                          {repo.destinationOrg && repo.id && (
                            <InlineDestinationEditor
                              repositoryId={repo.id}
                              currentDestination={repo.destinationOrg}
                              onUpdate={handleUpdateDestination}
                            />
                          )}
                        </div>
                      </div>
                      <div className="h-full p-3 flex-[1] text-sm">
                        {repo.lastMirrored ? formatDate(repo.lastMirrored) : "Never"}
                      </div>
                      <div className="h-full p-3 flex-[1] flex items-center">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${getStatusColor(
                              repo.status
                            )}`}
                          />
                          <span className="text-sm capitalize">{repo.status}</span>
                        </div>
                      </div>
                      <div className="h-full p-3 flex-[1] flex items-center gap-1">
                        {(repo.status === "imported" || repo.status === "failed") && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => repo.id && onMirror({ repoId: repo.id })}
                            disabled={isLoading}
                          >
                            <FlipHorizontal className="h-4 w-4 mr-2" />
                            Mirror
                          </Button>
                        )}
                        {(repo.status === "mirrored" || repo.status === "synced") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => repo.id && onSync({ repoId: repo.id })}
                            disabled={isLoading}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync
                          </Button>
                        )}
                        {repo.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => repo.id && onRetry({ repoId: repo.id })}
                            disabled={isLoading}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Retry
                          </Button>
                        )}
                      </div>
                      <div className="h-full p-3 flex-[0.8] flex items-center justify-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" asChild>
                                <a
                                  href={repo.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <SiGithub className="h-4 w-4" />
                                </a>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>View on GitHub</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {giteaUrl ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" asChild>
                                  <a
                                    href={giteaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <SiGitea className="h-4 w-4" />
                                  </a>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View on Gitea</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" disabled>
                                  <SiGitea className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Not mirrored to Gitea</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}