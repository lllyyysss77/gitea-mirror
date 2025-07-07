import React from "react";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Info, GitBranch, FolderTree, Star, Building2, User, Building } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

export type MirrorStrategy = "preserve" | "single-org" | "flat-user" | "mixed";

interface OrganizationStrategyProps {
  strategy: MirrorStrategy;
  destinationOrg?: string;
  starredReposOrg?: string;
  onStrategyChange: (strategy: MirrorStrategy) => void;
  githubUsername?: string;
  giteaUsername?: string;
}

const strategyConfig = {
  preserve: {
    title: "Preserve Structure",
    icon: FolderTree,
    description: "Keep the exact same org structure as GitHub",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
    borderColor: "border-blue-200 dark:border-blue-900",
    repoColors: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      icon: "text-blue-600 dark:text-blue-400"
    }
  },
  "single-org": {
    title: "Single Organization",
    icon: Building2,
    description: "Consolidate all repositories into one Gitea organization",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-900",
    repoColors: {
      bg: "bg-purple-50 dark:bg-purple-950/30",
      icon: "text-purple-600 dark:text-purple-400"
    }
  },
  "flat-user": {
    title: "User Repositories",
    icon: User,
    description: "Place all repositories directly under your user account",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-900",
    repoColors: {
      bg: "bg-green-50 dark:bg-green-950/30",
      icon: "text-green-600 dark:text-green-400"
    }
  },
  "mixed": {
    title: "Mixed Mode",
    icon: GitBranch,
    description: "Personal repos in single org, org repos preserve structure",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    borderColor: "border-orange-200 dark:border-orange-900",
    repoColors: {
      bg: "bg-orange-50 dark:bg-orange-950/30",
      icon: "text-orange-600 dark:text-orange-400"
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

  if (strategy === "mixed") {
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
  
  return null;
};

export const OrganizationStrategy: React.FC<OrganizationStrategyProps> = ({
  strategy,
  destinationOrg,
  starredReposOrg,
  onStrategyChange,
  githubUsername,
  giteaUsername,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Building className="h-4 w-4" />
            Organization Strategy
          </h4>
          <p className="text-xs text-muted-foreground">
            Choose how your repositories will be organized in Gitea
          </p>
        </div>
        
        <div className="flex-shrink-0">
          <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
              <button 
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                type="button"
              >
                <Info className="h-3.5 w-3.5" />
                <span>Override Options</span>
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="bottom" align="start" className="w-[380px]">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-sm mb-1.5">Fine-tune Your Mirror Destinations</h4>
                  <p className="text-xs text-muted-foreground">
                    After selecting a strategy, you can customize destinations for specific organizations and repositories.
                  </p>
                </div>
                
                <div className="space-y-2.5 pt-2 border-t">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">Organization Overrides</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-5">
                      Click the edit button on any organization card to redirect all its repositories to a different Gitea organization.
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">Repository Overrides</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-5">
                      Use the inline editor in the repository table's "Destination" column to set custom destinations for individual repositories.
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Star className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-xs font-medium">Starred Repositories</span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-5">
                      Always go to the configured starred repos organization and cannot be overridden.
                    </p>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Priority:</span> Repository override → Organization override → Strategy default
                  </p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
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
                    <div className="p-3 sm:p-4">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem 
                          value={key} 
                          id={key} 
                          className="mt-1"
                        />
                        
                        <div className={cn(
                          "rounded-lg p-2 flex-shrink-0",
                          isSelected ? config.bgColor : "bg-muted dark:bg-muted/50"
                        )}>
                          <Icon className={cn(
                            "h-4 w-4",
                            isSelected ? config.color : "text-muted-foreground dark:text-muted-foreground/70"
                          )} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{config.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {config.description}
                              </p>
                            </div>
                            
                            <HoverCard openDelay={200}>
                              <HoverCardTrigger asChild>
                                <span 
                                  className="inline-flex p-1 sm:p-1.5 hover:bg-muted rounded-md transition-colors cursor-help flex-shrink-0 ml-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                                </span>
                              </HoverCardTrigger>
                              <HoverCardContent side="left" align="center" className="w-[500px]">
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
                              </HoverCardContent>
                            </HoverCard>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                </label>
              </div>
            );
          })}
        </div>
      </RadioGroup>
    </div>
  );
};