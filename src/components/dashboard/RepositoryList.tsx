import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitFork } from "lucide-react";
import { SiGithub, SiGitea } from "react-icons/si";
import type { Repository } from "@/lib/db/schema";
import { getStatusColor } from "@/lib/utils";
import { useGiteaConfig } from "@/hooks/useGiteaConfig";

interface RepositoryListProps {
  repositories: Repository[];
}

export function RepositoryList({ repositories }: RepositoryListProps) {
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
      // If repository has organization and preserveOrgStructure would be true, use org
      // Otherwise use the repository owner
      const owner = repository.organization || repository.owner;
      repoPath = `${owner}/${repository.name}`;
    }

    // Ensure the base URL doesn't have a trailing slash
    const baseUrl = giteaConfig.url.endsWith('/')
      ? giteaConfig.url.slice(0, -1)
      : giteaConfig.url;

    return `${baseUrl}/${repoPath}`;
  };

  return (
    <Card className="w-full">
      {/* calculating the max height based non the other elements and sizing styles */}
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Repositories</CardTitle>
        <Button variant="outline" asChild>
          <a href="/repositories">View All</a>
        </Button>
      </CardHeader>
      <CardContent className="max-h-[calc(100dvh-22.5rem)] overflow-y-auto">
        {repositories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <GitFork className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No repositories found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Configure your GitHub connection to start mirroring repositories.
            </p>
            <Button asChild>
              <a href="/config">Configure GitHub</a>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {repositories.map((repo, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-x-4 py-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium">{repo.name}</h4>
                    {repo.isPrivate && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                        Private
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {repo.owner}
                    </span>
                    {repo.organization && (
                      <span className="text-xs text-muted-foreground">
                        • {repo.organization}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={`h-2 w-2 rounded-full ${getStatusColor(
                      repo.status
                    )}`}
                  />
                  <span className="text-xs capitalize w-[3rem]">
                    {/* setting the minimum width to 3rem corresponding to the largest status (mirrored) so that all are left alligned */}
                    {repo.status}
                  </span>
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
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
