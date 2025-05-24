import { useMemo, useRef } from "react";
import Fuse from "fuse.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FlipHorizontal, GitFork, RefreshCw, RotateCcw } from "lucide-react";
import { SiGithub, SiGitea } from "react-icons/si";
import type { Repository } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { formatDate, getStatusColor } from "@/lib/utils";
import type { FilterParams } from "@/types/filter";
import { Skeleton } from "@/components/ui/skeleton";
import { useGiteaConfig } from "@/hooks/useGiteaConfig";

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
}: RepositoryTableProps) {
  const tableParentRef = useRef<HTMLDivElement>(null);
  const { giteaConfig } = useGiteaConfig();

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

  return isLoading ? (
    <div className="border rounded-md">
      <div className="h-[45px] flex items-center justify-between border-b bg-muted/50">
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
          <div className="h-full p-3 text-sm font-medium flex-[2.5]">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="h-full p-3 text-sm font-medium flex-[1]">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="h-full p-3 text-sm font-medium flex-[1]">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="h-full p-3 text-sm font-medium flex-[1]">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="h-full p-3 text-sm font-medium flex-[1]">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="h-full p-3 text-sm font-medium flex-[1]">
            <Skeleton className="h-full w-full" />
          </div>
          <div className="h-full p-3 text-sm font-medium flex-[0.8] text-center">
            <Skeleton className="h-full w-full" />
          </div>
        </div>
      ))}
    </div>
  ) : filteredRepositories.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <GitFork className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">No repositories found</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">
        {hasAnyFilter
          ? "Try adjusting your search or filter criteria."
          : "Configure your GitHub connection to start mirroring repositories."}
      </p>
      {hasAnyFilter ? (
        <Button
          variant="outline"
          onClick={() =>
            setFilter({
              searchTerm: "",
              status: "",
            })
          }
        >
          Clear Filters
        </Button>
      ) : (
        <Button asChild>
          <a href="/config">Configure GitHub</a>
        </Button>
      )}
    </div>
  ) : (
    <div className="flex flex-col border rounded-md">
      {/* table header */}
      <div className="h-[45px] flex items-center justify-between border-b bg-muted/50">
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

      {/* table body wrapper (for a parent in virtualization) */}
      <div
        ref={tableParentRef}
        className="flex flex-col max-h-[calc(100dvh-276px)] overflow-y-auto" //adjusted height to account for status bar
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow, index) => {
            const repo = filteredRepositories[virtualRow.index];
            const isLoading = loadingRepoIds.has(repo.id ?? "");

            return (
              <div
                key={index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                  width: "100%",
                }}
                data-index={virtualRow.index}
                className="h-[65px] flex items-center justify-between bg-transparent border-b hover:bg-muted/50" //the height is set according to the row content. right now the highest row is in the repo column which is arround 64.99px
              >
                {/* Repository  */}
                <div className="h-full p-3 flex items-center gap-2 flex-[2.5]">
                  <GitFork className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{repo.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {repo.fullName}
                    </div>
                  </div>
                  {repo.isPrivate && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                      Private
                    </span>
                  )}
                </div>

                {/* Owner  */}
                <div className="h-full p-3 flex items-center flex-[1]">
                  <p className="text-sm">{repo.owner}</p>
                </div>

                {/* Organization  */}
                <div className="h-full p-3 flex items-center flex-[1]">
                  <p className="text-sm"> {repo.organization || "-"}</p>
                </div>

                {/* Last Mirrored  */}
                <div className="h-full p-3 flex items-center flex-[1]">
                  <p className="text-sm">
                    {repo.lastMirrored
                      ? formatDate(new Date(repo.lastMirrored))
                      : "Never"}
                  </p>
                </div>

                {/* Status  */}
                <div className="h-full p-3 flex items-center gap-x-2 flex-[1]">
                  <div
                    className={`h-2 w-2 rounded-full ${getStatusColor(
                      repo.status
                    )}`}
                  />
                  <span className="text-sm capitalize">{repo.status}</span>
                </div>

                {/* Actions  */}
                <div className="h-full p-3 flex items-center justify-start flex-[1]">
                  <RepoActionButton
                    repo={{ id: repo.id ?? "", status: repo.status }}
                    isLoading={isLoading}
                    onMirror={() => onMirror({ repoId: repo.id ?? "" })}
                    onSync={() => onSync({ repoId: repo.id ?? "" })}
                    onRetry={() => onRetry({ repoId: repo.id ?? "" })}
                  />
                </div>

                {/* Links  */}
                <div className="h-full p-3 flex items-center justify-center gap-x-2 flex-[0.8]">
                  {(() => {
                    const giteaUrl = getGiteaRepoUrl(repo);

                    // Determine tooltip based on status and configuration
                    let tooltip: string;
                    if (!giteaConfig?.url) {
                      tooltip = "Gitea not configured";
                    } else if (repo.status === 'imported') {
                      tooltip = "Repository not yet mirrored to Gitea";
                    } else if (repo.status === 'failed') {
                      tooltip = "Repository mirroring failed";
                    } else if (repo.status === 'mirroring') {
                      tooltip = "Repository is being mirrored to Gitea";
                    } else if (giteaUrl) {
                      tooltip = "View on Gitea";
                    } else {
                      tooltip = "Gitea repository not available";
                    }

                    return giteaUrl ? (
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={giteaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={tooltip}
                        >
                          <SiGitea className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" disabled title={tooltip}>
                        <SiGitea className="h-4 w-4" />
                      </Button>
                    );
                  })()}
                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View on GitHub"
                    >
                      <SiGithub className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Bar */}
      <div className="h-[40px] flex items-center justify-between border-t bg-muted/30 px-3 relative">
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${isLiveActive ? 'bg-emerald-500' : 'bg-primary'}`} />
          <span className="text-sm font-medium text-foreground">
            {hasAnyFilter
              ? `Showing ${filteredRepositories.length} of ${repositories.length} repositories`
              : `${repositories.length} ${repositories.length === 1 ? 'repository' : 'repositories'} total`}
          </span>
        </div>

        {/* Center - Live active indicator */}
        {isLiveActive && (
          <div className="flex items-center gap-1.5 absolute left-1/2 transform -translate-x-1/2">
            <div
              className="h-1 w-1 rounded-full bg-emerald-500"
              style={{
                animation: 'pulse 2s ease-in-out infinite'
              }}
            />
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Live active
            </span>
            <div
              className="h-1 w-1 rounded-full bg-emerald-500"
              style={{
                animation: 'pulse 2s ease-in-out infinite',
                animationDelay: '1s'
              }}
            />
          </div>
        )}

        {hasAnyFilter && (
          <span className="text-xs text-muted-foreground">
            Filters applied
          </span>
        )}
      </div>
    </div>
  );
}

function RepoActionButton({
  repo,
  isLoading,
  onMirror,
  onSync,
  onRetry,
}: {
  repo: { id: string; status: string };
  isLoading: boolean;
  onMirror: () => void;
  onSync: () => void;
  onRetry: () => void;
}) {
  let label = "";
  let icon = <></>;
  let onClick = () => {};
  let disabled = isLoading;

  if (repo.status === "failed") {
    label = "Retry";
    icon = <RotateCcw className="h-4 w-4 mr-1" />;
    onClick = onRetry;
  } else if (["mirrored", "synced", "syncing"].includes(repo.status)) {
    label = "Sync";
    icon = <RefreshCw className="h-4 w-4 mr-1" />;
    onClick = onSync;
    disabled ||= repo.status === "syncing";
  } else if (["imported", "mirroring"].includes(repo.status)) {
    label = "Mirror";
    icon = <FlipHorizontal className="h-4 w-4 mr-1" />; // Don't change this icon to GitFork.
    onClick = onMirror;
    disabled ||= repo.status === "mirroring";
  } else {
    return null; // unsupported status
  }

  return (
    <Button
      variant="ghost"
      disabled={disabled}
      onClick={onClick}
      className="min-w-[80px] justify-start"
    >
      {isLoading ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin mr-1" />
          {label}
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </Button>
  );
}
