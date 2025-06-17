import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Star, Globe, Lock, Shield, Info, MonitorCog } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { MirrorStrategy, GiteaOrgVisibility } from "@/types/config";

interface OrganizationConfigurationProps {
  strategy: MirrorStrategy;
  destinationOrg?: string;
  starredReposOrg?: string;
  visibility: GiteaOrgVisibility;
  onDestinationOrgChange: (org: string) => void;
  onStarredReposOrgChange: (org: string) => void;
  onVisibilityChange: (visibility: GiteaOrgVisibility) => void;
}

const visibilityOptions = [
  { value: "public" as GiteaOrgVisibility, label: "Public", icon: Globe, description: "Visible to everyone" },
  { value: "private" as GiteaOrgVisibility, label: "Private", icon: Lock, description: "Visible to members only" },
  { value: "limited" as GiteaOrgVisibility, label: "Limited", icon: Shield, description: "Visible to logged-in users" },
];

export const OrganizationConfiguration: React.FC<OrganizationConfigurationProps> = ({
  strategy,
  destinationOrg,
  starredReposOrg,
  visibility,
  onDestinationOrgChange,
  onStarredReposOrgChange,
  onVisibilityChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
          <MonitorCog className="h-4 w-4" />
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
  );
};