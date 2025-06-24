import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw, Building2, Check, AlertCircle, Clock } from "lucide-react";
import { SiGithub, SiGitea } from "react-icons/si";
import type { Organization } from "@/lib/db/schema";
import type { FilterParams } from "@/types/filter";
import Fuse from "fuse.js";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MirrorDestinationEditor } from "./MirrorDestinationEditor";
import { useGiteaConfig } from "@/hooks/useGiteaConfig";

interface OrganizationListProps {
  organizations: Organization[];
  isLoading: boolean;
  filter: FilterParams;
  setFilter: (filter: FilterParams) => void;
  onMirror: ({ orgId }: { orgId: string }) => Promise<void>;
  loadingOrgIds: Set<string>;
  onAddOrganization?: () => void;
  onRefresh?: () => Promise<void>;
}

// Helper function to get status badge variant and icon
const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "imported":
      return { variant: "secondary" as const, label: "Not Mirrored", icon: null };
    case "mirroring":
      return { variant: "outline" as const, label: "Mirroring", icon: Clock };
    case "mirrored":
      return { variant: "default" as const, label: "Mirrored", icon: Check };
    case "failed":
      return { variant: "destructive" as const, label: "Failed", icon: AlertCircle };
    default:
      return { variant: "secondary" as const, label: "Unknown", icon: null };
  }
};

export function OrganizationList({
  organizations,
  isLoading,
  filter,
  setFilter,
  onMirror,
  loadingOrgIds,
  onAddOrganization,
  onRefresh,
}: OrganizationListProps) {
  const { giteaConfig } = useGiteaConfig();

  // Helper function to construct Gitea organization URL
  const getGiteaOrgUrl = (organization: Organization): string | null => {
    if (!giteaConfig?.url) {
      return null;
    }

    // Only provide Gitea links for organizations that have been mirrored
    const validStatuses = ['mirroring', 'mirrored'];
    if (!validStatuses.includes(organization.status || '')) {
      return null;
    }

    // Use destinationOrg if available, otherwise use the organization name
    const orgName = organization.destinationOrg || organization.name;
    if (!orgName) {
      return null;
    }

    // Ensure the base URL doesn't have a trailing slash
    const baseUrl = giteaConfig.url.endsWith('/')
      ? giteaConfig.url.slice(0, -1)
      : giteaConfig.url;

    return `${baseUrl}/${orgName}`;
  };

  const handleUpdateDestination = async (orgId: string, newDestination: string | null) => {
    // Call API to update organization destination
    const response = await fetch(`/api/organizations/${orgId}`, {
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
      throw new Error(errorData.error || "Failed to update organization");
    }

    // Refresh organizations data
    if (onRefresh) {
      await onRefresh();
    }
  };

  const hasAnyFilter = Object.values(filter).some(
    (val) => val?.toString().trim() !== ""
  );

  const filteredOrganizations = useMemo(() => {
    let result = organizations;

    if (filter.membershipRole) {
      result = result.filter((org) => org.membershipRole === filter.membershipRole);
    }

    if (filter.status) {
      result = result.filter((org) => org.status === filter.status);
    }

    if (filter.searchTerm) {
      const fuse = new Fuse(result, {
        keys: ["name", "type"],
        threshold: 0.3,
      });
      result = fuse.search(filter.searchTerm).map((res) => res.item);
    }

    return result;
  }, [organizations, filter]);

  return isLoading ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[136px] w-full" />
      ))}
    </div>
  ) : filteredOrganizations.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium">No organizations found</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">
        {hasAnyFilter
          ? "Try adjusting your search or filter criteria."
          : "Add GitHub organizations to mirror their repositories."}
      </p>
      {hasAnyFilter ? (
        <Button
          variant="outline"
          onClick={() => {
            setFilter({
              searchTerm: "",
              membershipRole: "",
            });
          }}
        >
          Clear Filters
        </Button>
      ) : (
        <Button onClick={onAddOrganization}>
          <Plus className="h-4 w-4 mr-2" />
          Add Organization
        </Button>
      )}
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredOrganizations.map((org, index) => {
        const isLoading = loadingOrgIds.has(org.id ?? "");
        const statusBadge = getStatusBadge(org.status);
        const StatusIcon = statusBadge.icon;

        return (
          <Card 
            key={index} 
            className={cn(
              "overflow-hidden p-4 transition-all hover:shadow-md min-h-[160px]",
              isLoading && "opacity-75"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <a 
                    href={`/repositories?organization=${encodeURIComponent(org.name || '')}`}
                    className="font-medium hover:underline cursor-pointer"
                  >
                    {org.name}
                  </a>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      org.membershipRole === "member"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                    }`}
                  >
                    {org.membershipRole}
                  </span>
                </div>

                {/* Destination override section */}
                <div className="mt-2">
                  <MirrorDestinationEditor
                    organizationId={org.id!}
                    organizationName={org.name!}
                    currentDestination={org.destinationOrg}
                    onUpdate={(newDestination) => handleUpdateDestination(org.id!, newDestination)}
                    isUpdating={isLoading}
                  />
                </div>
              </div>
              <Badge variant={statusBadge.variant} className="ml-2">
                {StatusIcon && <StatusIcon className={cn(
                  "h-3 w-3",
                  org.status === "mirroring" && "animate-pulse"
                )} />}
                {statusBadge.label}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground mb-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {org.repositoryCount}{" "}
                  {org.repositoryCount === 1 ? "repository" : "repositories"}
                </span>
              </div>
              {/* Always render this section to prevent layout shift */}
              <div className="flex gap-4 mt-2 text-xs min-h-[20px]">
                {isLoading || (org.status === "mirroring" && org.publicRepositoryCount === undefined) ? (
                  <>
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-16" />
                  </>
                ) : (
                  <>
                    {org.publicRepositoryCount !== undefined ? (
                      <span className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        {org.publicRepositoryCount} public
                      </span>
                    ) : null}
                    {org.privateRepositoryCount !== undefined && org.privateRepositoryCount > 0 ? (
                      <span className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-orange-500" />
                        {org.privateRepositoryCount} private
                      </span>
                    ) : null}
                    {org.forkRepositoryCount !== undefined && org.forkRepositoryCount > 0 ? (
                      <span className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        {org.forkRepositoryCount} fork{org.forkRepositoryCount !== 1 ? 's' : ''}
                      </span>
                    ) : null}
                    {/* Show a placeholder if no counts are available to maintain height */}
                    {org.publicRepositoryCount === undefined && 
                     org.privateRepositoryCount === undefined && 
                     org.forkRepositoryCount === undefined && (
                      <span className="invisible">Loading counts...</span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {org.status === "imported" && (
                  <Button
                    size="sm"
                    onClick={() => org.id && onMirror({ orgId: org.id })}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                        Starting...
                      </>
                    ) : (
                      "Mirror"
                    )}
                  </Button>
                )}
                
                {org.status === "mirroring" && (
                  <Button size="sm" disabled variant="outline">
                    <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                    Mirroring...
                  </Button>
                )}
                
                {org.status === "mirrored" && (
                  <Button size="sm" disabled variant="secondary">
                    <Check className="h-3 w-3 mr-2" />
                    Mirrored
                  </Button>
                )}
                
                {org.status === "failed" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => org.id && onMirror({ orgId: org.id })}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 mr-2" />
                        Retry
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1">
                {(() => {
                  const giteaUrl = getGiteaOrgUrl(org);

                  // Determine tooltip based on status and configuration
                  let tooltip: string;
                  if (!giteaConfig?.url) {
                    tooltip = "Gitea not configured";
                  } else if (org.status === 'imported') {
                    tooltip = "Organization not yet mirrored to Gitea";
                  } else if (org.status === 'failed') {
                    tooltip = "Organization mirroring failed";
                  } else if (org.status === 'mirroring') {
                    tooltip = "Organization is being mirrored to Gitea";
                  } else if (giteaUrl) {
                    tooltip = "View on Gitea";
                  } else {
                    tooltip = "Gitea organization not available";
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
                    href={`https://github.com/${org.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View on GitHub"
                  >
                     <SiGithub className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
