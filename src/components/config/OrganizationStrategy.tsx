import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Info, GitBranch, FolderTree, Package, Star, Building2, User } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type MirrorStrategy = "preserve" | "single-org" | "flat-user";

interface OrganizationStrategyProps {
  strategy: MirrorStrategy;
  destinationOrg?: string;
  starredReposOrg?: string;
  onStrategyChange: (strategy: MirrorStrategy) => void;
  onDestinationOrgChange: (org: string) => void;
  onStarredReposOrgChange: (org: string) => void;
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
    details: [
      "Personal repos → Your Gitea username",
      "Org repos → Same org name in Gitea",
      "Team structure preserved"
    ]
  },
  "single-org": {
    title: "Consolidate to One Org",
    icon: Building2,
    description: "Mirror all repositories into a single organization",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    borderColor: "border-purple-200 dark:border-purple-900",
    details: [
      "All repos in one place",
      "Simplified management",
      "Custom organization name"
    ]
  },
  "flat-user": {
    title: "Flat User Structure",
    icon: User,
    description: "Mirror all repositories under your user account",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/20",
    borderColor: "border-green-200 dark:border-green-900",
    details: [
      "All repos under your username",
      "No organizations needed",
      "Simple and personal"
    ]
  }
};

const StrategyVisualizer: React.FC<{ 
  strategy: MirrorStrategy; 
  destinationOrg?: string;
  starredReposOrg?: string;
  githubUsername?: string;
  giteaUsername?: string;
}> = ({ strategy, destinationOrg, starredReposOrg, githubUsername = "you", giteaUsername = "you" }) => {
  const renderPreserveStructure = () => (
    <div className="flex items-center justify-between gap-8 p-6">
      <div className="flex-1">
        <div className="text-sm font-medium text-muted-foreground mb-3">GitHub</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <User className="h-4 w-4" />
            <span className="text-sm">{githubUsername}/my-repo</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <Building2 className="h-4 w-4" />
            <span className="text-sm">my-org/team-repo</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <Star className="h-4 w-4" />
            <span className="text-sm">awesome/starred-repo</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center">
        <GitBranch className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="flex-1">
        <div className="text-sm font-medium text-muted-foreground mb-3">Gitea</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm">{giteaUsername}/my-repo</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm">my-org/team-repo</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded">
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm">{starredReposOrg || "starred"}/starred-repo</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSingleOrg = () => (
    <div className="flex items-center justify-between gap-8 p-6">
      <div className="flex-1">
        <div className="text-sm font-medium text-muted-foreground mb-3">GitHub</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <User className="h-4 w-4" />
            <span className="text-sm">{githubUsername}/my-repo</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <Building2 className="h-4 w-4" />
            <span className="text-sm">my-org/team-repo</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <Star className="h-4 w-4" />
            <span className="text-sm">awesome/starred-repo</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center">
        <GitBranch className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="flex-1">
        <div className="text-sm font-medium text-muted-foreground mb-3">Gitea</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-950/30 rounded">
            <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm">{destinationOrg || "github-mirrors"}/my-repo</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-950/30 rounded">
            <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm">{destinationOrg || "github-mirrors"}/team-repo</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-950/30 rounded">
            <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm">{starredReposOrg || "starred"}/starred-repo</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFlatUser = () => (
    <div className="flex items-center justify-between gap-8 p-6">
      <div className="flex-1">
        <div className="text-sm font-medium text-muted-foreground mb-3">GitHub</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <User className="h-4 w-4" />
            <span className="text-sm">{githubUsername}/my-repo</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <Building2 className="h-4 w-4" />
            <span className="text-sm">my-org/team-repo</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
            <Star className="h-4 w-4" />
            <span className="text-sm">awesome/starred-repo</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center">
        <GitBranch className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="flex-1">
        <div className="text-sm font-medium text-muted-foreground mb-3">Gitea</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded">
            <User className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm">{giteaUsername}/my-repo</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded">
            <User className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm">{giteaUsername}/team-repo</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded">
            <Building2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm">{starredReposOrg || "starred"}/starred-repo</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-4">
      <Card className="overflow-hidden">
        <div className="bg-muted/50 p-3 border-b">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Repository Mapping Preview
          </h4>
        </div>
        {strategy === "preserve" && renderPreserveStructure()}
        {strategy === "single-org" && renderSingleOrg()}
        {strategy === "flat-user" && renderFlatUser()}
      </Card>
    </div>
  );
};

export const OrganizationStrategy: React.FC<OrganizationStrategyProps> = ({
  strategy,
  destinationOrg,
  starredReposOrg,
  onStrategyChange,
  onDestinationOrgChange,
  onStarredReposOrgChange,
  githubUsername,
  giteaUsername,
}) => {

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Organization Strategy</h3>
        <p className="text-sm text-muted-foreground">
          Choose how your repositories will be organized in Gitea
        </p>
      </div>

      <RadioGroup value={strategy} onValueChange={onStrategyChange}>
        <div className="grid gap-4">
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
                    <div className="p-4">
                      <div className="flex items-start gap-4">
                        <RadioGroupItem 
                          value={key} 
                          id={key} 
                          className="mt-1"
                        />
                        
                        <div className={cn(
                          "rounded-lg p-2",
                          isSelected ? config.bgColor : "bg-muted dark:bg-muted/50"
                        )}>
                          <Icon className={cn(
                            "h-5 w-5",
                            isSelected ? config.color : "text-muted-foreground dark:text-muted-foreground/70"
                          )} />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{config.title}</h4>
                            {isSelected && (
                              <Badge variant="secondary" className="text-xs">
                                Selected
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {config.description}
                          </p>
                          
                          <div className="space-y-1">
                            {config.details.map((detail, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <div className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  isSelected ? config.bgColor : "bg-muted dark:bg-muted/50"
                                )} />
                                <span className="text-xs text-muted-foreground">{detail}</span>
                              </div>
                            ))}
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

      {strategy === "single-org" && (
        <div className="space-y-4">
          <Card className="p-4 border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20">
            <div className="space-y-3">
              <div>
                <Label htmlFor="destinationOrg" className="flex items-center gap-2">
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
                  className="mt-1.5"
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card className="p-4 border-orange-200 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20">
        <div className="space-y-3">
          <div>
            <Label htmlFor="starredReposOrg" className="flex items-center gap-2">
              <Star className="h-4 w-4 text-orange-600 dark:text-orange-400" />
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
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground dark:text-muted-foreground/70 mt-1">
              Keep starred repos organized separately from your own repositories
            </p>
          </div>
        </div>
      </Card>

      <StrategyVisualizer 
        strategy={strategy}
        destinationOrg={destinationOrg}
        starredReposOrg={starredReposOrg}
        githubUsername={githubUsername}
        giteaUsername={giteaUsername}
      />
    </div>
  );
};