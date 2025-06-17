import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Info, GitBranch, FolderTree, Star, Building2, User, Globe, Lock, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { GiteaOrgVisibility } from "@/types/config";

export type MirrorStrategy = "preserve" | "single-org" | "flat-user";

interface OrganizationStrategyProps {
  strategy: MirrorStrategy;
  destinationOrg?: string;
  starredReposOrg?: string;
  visibility: GiteaOrgVisibility;
  onStrategyChange: (strategy: MirrorStrategy) => void;
  onDestinationOrgChange: (org: string) => void;
  onStarredReposOrgChange: (org: string) => void;
  onVisibilityChange: (visibility: GiteaOrgVisibility) => void;
  githubUsername?: string;
  giteaUsername?: string;
}

const strategyConfig = {
  preserve: {
    title: "Mirror GitHub Structure",
    icon: FolderTree,
    description: "Keep the same organization structure as GitHub",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-900",
    repoColors: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      icon: "text-blue-600 dark:text-blue-400"
    }
  },
  "single-org": {
    title: "Consolidate to One Org",
    icon: Building2,
    description: "Mirror all repositories into a single organization",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-900",
    repoColors: {
      bg: "bg-purple-50 dark:bg-purple-950/30",
      icon: "text-purple-600 dark:text-purple-400"
    }
  },
  "flat-user": {
    title: "Flat User Structure",
    icon: User,
    description: "Mirror all repositories under your user account",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-900",
    repoColors: {
      bg: "bg-green-50 dark:bg-green-950/30",
      icon: "text-green-600 dark:text-green-400"
    }
  }
};

const MappingPreview: React.FC<{ 
  strategy: MirrorStrategy;
  config: typeof strategyConfig.preserve;
  destinationOrg?: string;
  starredReposOrg?: string;
  githubUsername?: string;
  giteaUsername?: string;
}> = ({ strategy, config, destinationOrg, starredReposOrg, githubUsername, giteaUsername }) => {
  const displayGithubUsername = githubUsername || "<username>";
  const displayGiteaUsername = giteaUsername || "<username>";
  const isGithubPlaceholder = !githubUsername;
  const isGiteaPlaceholder = !giteaUsername;
  
  if (strategy === "preserve") {
    return (
      <div className="flex items-center justify-between gap-6">
        <div className="flex-1">
          <div className="text-xs font-medium text-muted-foreground mb-2">GitHub</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-xs">
              <User className="h-3 w-3" />
              <span className={cn(isGithubPlaceholder && "text-muted-foreground italic")}>{displayGithubUsername}/my-repo</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-xs">
              <Building2 className="h-3 w-3" />
              <span>my-org/team-repo</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-xs">
              <Star className="h-3 w-3" />
              <span>awesome/starred-repo</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1">
          <div className="text-xs font-medium text-muted-foreground mb-2">Gitea</div>
          <div className="space-y-1.5">
            <div className={cn("flex items-center gap-2 p-1.5 rounded text-xs", config.repoColors.bg)}>
              <User className={cn("h-3 w-3", config.repoColors.icon)} />
              <span className={cn(isGiteaPlaceholder && "text-muted-foreground italic")}>{displayGiteaUsername}/my-repo</span>
            </div>
            <div className={cn("flex items-center gap-2 p-1.5 rounded text-xs", config.repoColors.bg)}>
              <Building2 className={cn("h-3 w-3", config.repoColors.icon)} />
              <span>my-org/team-repo</span>
            </div>
            <div className={cn("flex items-center gap-2 p-1.5 rounded text-xs", config.repoColors.bg)}>
              <Building2 className={cn("h-3 w-3", config.repoColors.icon)} />
              <span>{starredReposOrg || "starred"}/starred-repo</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (strategy === "single-org") {
    return (
      <div className="flex items-center justify-between gap-6">
        <div className="flex-1">
          <div className="text-xs font-medium text-muted-foreground mb-2">GitHub</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-xs">
              <User className="h-3 w-3" />
              <span className={cn(isGithubPlaceholder && "text-muted-foreground italic")}>{displayGithubUsername}/my-repo</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-xs">
              <Building2 className="h-3 w-3" />
              <span>my-org/team-repo</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-xs">
              <Star className="h-3 w-3" />
              <span>awesome/starred-repo</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1">
          <div className="text-xs font-medium text-muted-foreground mb-2">Gitea</div>
          <div className="space-y-1.5">
            <div className={cn("flex items-center gap-2 p-1.5 rounded text-xs", config.repoColors.bg)}>
              <Building2 className={cn("h-3 w-3", config.repoColors.icon)} />
              <span>{destinationOrg || "github-mirrors"}/my-repo</span>
            </div>
            <div className={cn("flex items-center gap-2 p-1.5 rounded text-xs", config.repoColors.bg)}>
              <Building2 className={cn("h-3 w-3", config.repoColors.icon)} />
              <span>{destinationOrg || "github-mirrors"}/team-repo</span>
            </div>
            <div className={cn("flex items-center gap-2 p-1.5 rounded text-xs", config.repoColors.bg)}>
              <Building2 className={cn("h-3 w-3", config.repoColors.icon)} />
              <span>{starredReposOrg || "starred"}/starred-repo</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (strategy === "flat-user") {
    return (
      <div className="flex items-center justify-between gap-6">
        <div className="flex-1">
          <div className="text-xs font-medium text-muted-foreground mb-2">GitHub</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-xs">
              <User className="h-3 w-3" />
              <span className={cn(isGithubPlaceholder && "text-muted-foreground italic")}>{displayGithubUsername}/my-repo</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-xs">
              <Building2 className="h-3 w-3" />
              <span>my-org/team-repo</span>
            </div>
            <div className="flex items-center gap-2 p-1.5 bg-gray-50 dark:bg-gray-800 rounded text-xs">
              <Star className="h-3 w-3" />
              <span>awesome/starred-repo</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="flex-1">
          <div className="text-xs font-medium text-muted-foreground mb-2">Gitea</div>
          <div className="space-y-1.5">
            <div className={cn("flex items-center gap-2 p-1.5 rounded text-xs", config.repoColors.bg)}>
              <User className={cn("h-3 w-3", config.repoColors.icon)} />
              <span className={cn(isGiteaPlaceholder && "text-muted-foreground italic")}>{displayGiteaUsername}/my-repo</span>
            </div>
            <div className={cn("flex items-center gap-2 p-1.5 rounded text-xs", config.repoColors.bg)}>
              <User className={cn("h-3 w-3", config.repoColors.icon)} />
              <span className={cn(isGiteaPlaceholder && "text-muted-foreground italic")}>{displayGiteaUsername}/team-repo</span>
            </div>
            <div className={cn("flex items-center gap-2 p-1.5 rounded text-xs", config.repoColors.bg)}>
              <Building2 className={cn("h-3 w-3", config.repoColors.icon)} />
              <span>{starredReposOrg || "starred"}/starred-repo</span>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

export const OrganizationStrategy: React.FC<OrganizationStrategyProps> = ({
  strategy,
  destinationOrg,
  starredReposOrg,
  visibility,
  onStrategyChange,
  onDestinationOrgChange,
  onStarredReposOrgChange,
  onVisibilityChange,
  githubUsername,
  giteaUsername,
}) => {
  const visibilityOptions = [
    { value: "public" as GiteaOrgVisibility, label: "Public", icon: Globe, description: "Visible to everyone" },
    { value: "private" as GiteaOrgVisibility, label: "Private", icon: Lock, description: "Visible to members only" },
    { value: "limited" as GiteaOrgVisibility, label: "Limited", icon: Shield, description: "Visible to logged-in users" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-1">Organization Strategy</h3>
        <p className="text-sm text-muted-foreground">
          Choose how your repositories will be organized in Gitea
        </p>
      </div>

      <RadioGroup value={strategy} onValueChange={onStrategyChange}>
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
          {(Object.entries(strategyConfig) as [MirrorStrategy, typeof strategyConfig.preserve][]).map(([key, config]) => {
            const isSelected = strategy === key;
            const Icon = config.icon;

            return (
              <div key={key}>
                <label htmlFor={key} className="cursor-pointer">
                  <Card 
                    className={cn(
                      "relative",
                      isSelected && `${config.borderColor} border-2`,
                      !isSelected && "border-muted"
                    )}
                  >
                    <div className="p-3">
                      <div className="flex items-center gap-3">
                        <RadioGroupItem 
                          value={key} 
                          id={key} 
                        />
                        
                        <div className={cn(
                          "rounded-lg p-2",
                          isSelected ? config.bgColor : "bg-muted dark:bg-muted/50"
                        )}>
                          <Icon className={cn(
                            "h-4 w-4",
                            isSelected ? config.color : "text-muted-foreground dark:text-muted-foreground/70"
                          )} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm">{config.title}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {config.description}
                          </p>
                        </div>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <button 
                              type="button"
                              className="p-1.5 hover:bg-muted rounded-md transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent side="left" align="center" className="w-[500px]">
                            <div className="space-y-3">
                              <h4 className="font-medium text-sm">Repository Mapping Preview</h4>
                              <MappingPreview 
                                strategy={key}
                                config={config}
                                destinationOrg={destinationOrg}
                                starredReposOrg={starredReposOrg}
                                githubUsername={githubUsername}
                                giteaUsername={giteaUsername}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </Card>
                </label>
              </div>
            );
          })}
        </div>
      </RadioGroup>

      <Separator className="my-4" />

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization Configuration
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strategy === "single-org" ? (
            <>
              {/* Destination Organization - Left Column */}
              <div className="space-y-1">
                <Label htmlFor="destinationOrg" className="text-sm font-normal flex items-center gap-2">
                  Destination Organization
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>All repositories will be mirrored to this organization</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="destinationOrg"
                  value={destinationOrg || ""}
                  onChange={(e) => onDestinationOrgChange(e.target.value)}
                  placeholder="github-mirrors"
                  className=""
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Organization for consolidated repositories
                </p>
              </div>

              {/* Starred Repositories Organization - Right Column */}
              <div className="space-y-1">
                <Label htmlFor="starredReposOrg" className="text-sm font-normal flex items-center gap-2">
                  <Star className="h-3.5 w-3.5" />
                  Starred Repositories Organization
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Starred repositories will be organized separately in this organization</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="starredReposOrg"
                  value={starredReposOrg || ""}
                  onChange={(e) => onStarredReposOrgChange(e.target.value)}
                  placeholder="starred"
                  className=""
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Keep starred repos organized separately
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Starred Repositories Organization - Left Column */}
              <div className="space-y-1">
                <Label htmlFor="starredReposOrg" className="text-sm font-normal flex items-center gap-2">
                  <Star className="h-3.5 w-3.5" />
                  Starred Repositories Organization
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Starred repositories will be organized separately in this organization</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="starredReposOrg"
                  value={starredReposOrg || ""}
                  onChange={(e) => onStarredReposOrgChange(e.target.value)}
                  placeholder="starred"
                  className=""
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Keep starred repos organized separately
                </p>
              </div>

              {/* Organization Visibility - Right Column */}
              <div className="space-y-2">
                <Label className="text-sm font-normal flex items-center gap-2">
                  Organization Visibility
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Visibility for newly created organizations</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="flex gap-2">
                  {visibilityOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = visibility === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onVisibilityChange(option.value)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all",
                          "border flex-1",
                          isSelected
                            ? "bg-accent border-accent-foreground/20"
                            : "bg-background hover:bg-accent/50 border-input"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Organization Visibility - Full width when single-org is selected */}
        {strategy === "single-org" && (
          <div className="space-y-2">
            <Label className="text-sm font-normal flex items-center gap-2">
              Organization Visibility
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Visibility for newly created organizations</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className="flex gap-2">
              {visibilityOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = visibility === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onVisibilityChange(option.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm transition-all",
                      "border",
                      isSelected
                        ? "bg-accent border-accent-foreground/20"
                        : "bg-background hover:bg-accent/50 border-input"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};