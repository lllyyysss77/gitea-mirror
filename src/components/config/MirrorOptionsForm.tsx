import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "../ui/checkbox";
import type { MirrorOptions } from "@/types/config";
import { RefreshCw, Info } from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "../ui/tooltip";

interface MirrorOptionsFormProps {
  config: MirrorOptions;
  setConfig: React.Dispatch<React.SetStateAction<MirrorOptions>>;
  onAutoSave?: (config: MirrorOptions) => Promise<void>;
  isAutoSaving?: boolean;
}

export function MirrorOptionsForm({
  config,
  setConfig,
  onAutoSave,
  isAutoSaving = false,
}: MirrorOptionsFormProps) {
  const handleChange = (name: string, checked: boolean) => {
    let newConfig = { ...config };

    if (name === "mirrorMetadata") {
      newConfig.mirrorMetadata = checked;
      // If disabling metadata, also disable all components
      if (!checked) {
        newConfig.metadataComponents = {
          issues: false,
          pullRequests: false, // Keep for backwards compatibility but not shown in UI
          labels: false,
          milestones: false,
          wiki: false,
        };
      }
    } else if (name.startsWith("metadataComponents.")) {
      const componentName = name.split(".")[1] as keyof typeof config.metadataComponents;
      newConfig.metadataComponents = {
        ...config.metadataComponents,
        [componentName]: checked,
      };
    } else {
      newConfig = {
        ...config,
        [name]: checked,
      };
    }

    setConfig(newConfig);

    // Auto-save
    if (onAutoSave) {
      onAutoSave(newConfig);
    }
  };

  return (
    <Card className="self-start">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          Mirror Options
          {isAutoSaving && (
            <div className="flex items-center text-sm text-muted-foreground">
              <RefreshCw className="h-3 w-3 animate-spin mr-1" />
              <span className="text-xs">Auto-saving...</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Repository Content */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">Repository Content</h4>
          
          <div className="flex items-center">
            <Checkbox
              id="mirror-releases"
              checked={config.mirrorReleases}
              onCheckedChange={(checked) =>
                handleChange("mirrorReleases", Boolean(checked))
              }
            />
            <label
              htmlFor="mirror-releases"
              className="ml-2 text-sm select-none flex items-center"
            >
              Mirror releases
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 cursor-pointer text-muted-foreground">
                    <Info size={14} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-xs">
                  Include GitHub releases and tags in the mirror
                </TooltipContent>
              </Tooltip>
            </label>
          </div>
          
          <div className="flex items-center">
            <Checkbox
              id="mirror-lfs"
              checked={config.mirrorLFS}
              onCheckedChange={(checked) =>
                handleChange("mirrorLFS", Boolean(checked))
              }
            />
            <label
              htmlFor="mirror-lfs"
              className="ml-2 text-sm select-none flex items-center"
            >
              Mirror LFS (Large File Storage)
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 cursor-pointer text-muted-foreground">
                    <Info size={14} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-xs">
                  Mirror Git LFS objects. Requires LFS to be enabled on your Gitea server and Git v2.1.2+
                </TooltipContent>
              </Tooltip>
            </label>
          </div>

          <div className="flex items-center">
            <Checkbox
              id="mirror-metadata"
              checked={config.mirrorMetadata}
              onCheckedChange={(checked) =>
                handleChange("mirrorMetadata", Boolean(checked))
              }
            />
            <label
              htmlFor="mirror-metadata"
              className="ml-2 text-sm select-none flex items-center"
            >
              Mirror metadata
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 cursor-pointer text-muted-foreground">
                    <Info size={14} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-xs">
                  Include issues, pull requests, labels, milestones, and wiki
                </TooltipContent>
              </Tooltip>
            </label>
          </div>

          {/* Metadata Components */}
          {config.mirrorMetadata && (
            <div className="ml-6 space-y-3 border-l-2 border-muted pl-4">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Metadata Components
              </h5>
              
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center">
                  <Checkbox
                    id="metadata-issues"
                    checked={config.metadataComponents.issues}
                    onCheckedChange={(checked) =>
                      handleChange("metadataComponents.issues", Boolean(checked))
                    }
                    disabled={!config.mirrorMetadata}
                  />
                  <label
                    htmlFor="metadata-issues"
                    className="ml-2 text-sm select-none"
                  >
                    Issues
                  </label>
                </div>

                <div className="flex items-center">
                  <Checkbox
                    id="metadata-pullRequests"
                    checked={config.metadataComponents.pullRequests}
                    onCheckedChange={(checked) =>
                      handleChange("metadataComponents.pullRequests", Boolean(checked))
                    }
                    disabled={!config.mirrorMetadata}
                  />
                  <label
                    htmlFor="metadata-pullRequests"
                    className="ml-2 text-sm select-none"
                  >
                    Pull Requests (as issues)
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 ml-1 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-sm">
                        <div className="space-y-2">
                          <p className="font-semibold">Pull Requests are mirrored as issues</p>
                          <p className="text-xs">
                            Due to Gitea API limitations, PRs cannot be created as actual pull requests.
                            Instead, they are mirrored as issues with:
                          </p>
                          <ul className="text-xs space-y-1 ml-3">
                            <li>• [PR #number] prefix in title</li>
                            <li>• Full PR description and metadata</li>
                            <li>• Commit history (up to 10 commits)</li>
                            <li>• File changes summary</li>
                            <li>• Diff preview (first 5 files)</li>
                            <li>• Review comments preserved</li>
                            <li>• Merge/close status tracking</li>
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <div className="flex items-center">
                  <Checkbox
                    id="metadata-labels"
                    checked={config.metadataComponents.labels}
                    onCheckedChange={(checked) =>
                      handleChange("metadataComponents.labels", Boolean(checked))
                    }
                    disabled={!config.mirrorMetadata}
                  />
                  <label
                    htmlFor="metadata-labels"
                    className="ml-2 text-sm select-none"
                  >
                    Labels
                  </label>
                </div>

                <div className="flex items-center">
                  <Checkbox
                    id="metadata-milestones"
                    checked={config.metadataComponents.milestones}
                    onCheckedChange={(checked) =>
                      handleChange("metadataComponents.milestones", Boolean(checked))
                    }
                    disabled={!config.mirrorMetadata}
                  />
                  <label
                    htmlFor="metadata-milestones"
                    className="ml-2 text-sm select-none"
                  >
                    Milestones
                  </label>
                </div>

                <div className="flex items-center">
                  <Checkbox
                    id="metadata-wiki"
                    checked={config.metadataComponents.wiki}
                    onCheckedChange={(checked) =>
                      handleChange("metadataComponents.wiki", Boolean(checked))
                    }
                    disabled={!config.mirrorMetadata}
                  />
                  <label
                    htmlFor="metadata-wiki"
                    className="ml-2 text-sm select-none"
                  >
                    Wiki
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
