import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Info, 
  GitBranch, 
  Star, 
  Building2, 
  Lock, 
  Archive,
  GitPullRequest,
  Tag,
  FileText,
  MessageSquare,
  Target,
  BookOpen,
  GitFork
} from "lucide-react";
import type { GitHubConfig, MirrorOptions, AdvancedOptions } from "@/types/config";
import { cn } from "@/lib/utils";

interface GitHubMirrorSettingsProps {
  githubConfig: GitHubConfig;
  mirrorOptions: MirrorOptions;
  advancedOptions: AdvancedOptions;
  onGitHubConfigChange: (config: GitHubConfig) => void;
  onMirrorOptionsChange: (options: MirrorOptions) => void;
  onAdvancedOptionsChange: (options: AdvancedOptions) => void;
}

export function GitHubMirrorSettings({
  githubConfig,
  mirrorOptions,
  advancedOptions,
  onGitHubConfigChange,
  onMirrorOptionsChange,
  onAdvancedOptionsChange,
}: GitHubMirrorSettingsProps) {
  
  const handleGitHubChange = (field: keyof GitHubConfig, value: boolean) => {
    onGitHubConfigChange({ ...githubConfig, [field]: value });
  };

  const handleMirrorChange = (field: keyof MirrorOptions, value: boolean) => {
    onMirrorOptionsChange({ ...mirrorOptions, [field]: value });
  };

  const handleMetadataComponentChange = (component: keyof MirrorOptions['metadataComponents'], value: boolean) => {
    onMirrorOptionsChange({
      ...mirrorOptions,
      metadataComponents: {
        ...mirrorOptions.metadataComponents,
        [component]: value,
      },
    });
  };

  const handleAdvancedChange = (field: keyof AdvancedOptions, value: boolean) => {
    onAdvancedOptionsChange({ ...advancedOptions, [field]: value });
  };

  // When metadata is disabled, all components should be disabled
  const isMetadataEnabled = mirrorOptions.mirrorMetadata;

  return (
    <div className="space-y-6">
      {/* Repository Selection Section */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Repository Selection
          </h4>
          <p className="text-xs text-muted-foreground mb-4">
            Choose which repositories to include in mirroring
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="private-repos"
              checked={githubConfig.privateRepositories}
              onCheckedChange={(checked) => handleGitHubChange('privateRepositories', !!checked)}
            />
            <div className="space-y-0.5 flex-1">
              <Label
                htmlFor="private-repos"
                className="text-sm font-normal cursor-pointer flex items-center gap-2"
              >
                <Lock className="h-3.5 w-3.5" />
                Include private repositories
              </Label>
              <p className="text-xs text-muted-foreground">
                Mirror your private repositories (requires appropriate token permissions)
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="starred-repos"
              checked={githubConfig.mirrorStarred}
              onCheckedChange={(checked) => handleGitHubChange('mirrorStarred', !!checked)}
            />
            <div className="space-y-0.5 flex-1">
              <Label
                htmlFor="starred-repos"
                className="text-sm font-normal cursor-pointer flex items-center gap-2"
              >
                <Star className="h-3.5 w-3.5" />
                Mirror starred repositories
              </Label>
              <p className="text-xs text-muted-foreground">
                Include repositories you've starred on GitHub
              </p>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Content & Data Section */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Archive className="h-4 w-4" />
            Content & Data
          </h4>
          <p className="text-xs text-muted-foreground mb-4">
            Select what content to mirror from each repository
          </p>
        </div>

        <div className="space-y-3">
          {/* Code is always mirrored - shown as info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 dark:bg-muted/20 rounded-md">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm">Source code & branches</p>
              <p className="text-xs text-muted-foreground">Always included</p>
            </div>
            <Badge variant="secondary" className="text-xs">Default</Badge>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="mirror-releases"
              checked={mirrorOptions.mirrorReleases}
              onCheckedChange={(checked) => handleMirrorChange('mirrorReleases', !!checked)}
            />
            <div className="space-y-0.5 flex-1">
              <Label
                htmlFor="mirror-releases"
                className="text-sm font-normal cursor-pointer flex items-center gap-2"
              >
                <Tag className="h-3.5 w-3.5" />
                Releases & Tags
              </Label>
              <p className="text-xs text-muted-foreground">
                Include GitHub releases, tags, and associated assets
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="mirror-metadata"
                checked={mirrorOptions.mirrorMetadata}
                onCheckedChange={(checked) => handleMirrorChange('mirrorMetadata', !!checked)}
              />
              <div className="space-y-0.5 flex-1">
                <Label
                  htmlFor="mirror-metadata"
                  className="text-sm font-normal cursor-pointer flex items-center gap-2"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Repository Metadata
                </Label>
                <p className="text-xs text-muted-foreground">
                  Mirror issues, pull requests, and other repository data
                </p>
              </div>
            </div>

            {/* Metadata sub-options */}
            {mirrorOptions.mirrorMetadata && (
              <div className="ml-7 space-y-2 p-3 bg-muted/30 dark:bg-muted/10 rounded-md">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="metadata-issues"
                      checked={mirrorOptions.metadataComponents.issues}
                      onCheckedChange={(checked) => handleMetadataComponentChange('issues', !!checked)}
                      disabled={!isMetadataEnabled}
                    />
                    <Label
                      htmlFor="metadata-issues"
                      className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Issues
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="metadata-prs"
                      checked={mirrorOptions.metadataComponents.pullRequests}
                      onCheckedChange={(checked) => handleMetadataComponentChange('pullRequests', !!checked)}
                      disabled={!isMetadataEnabled}
                    />
                    <Label
                      htmlFor="metadata-prs"
                      className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                    >
                      <GitPullRequest className="h-3 w-3" />
                      Pull Requests
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="metadata-labels"
                      checked={mirrorOptions.metadataComponents.labels}
                      onCheckedChange={(checked) => handleMetadataComponentChange('labels', !!checked)}
                      disabled={!isMetadataEnabled}
                    />
                    <Label
                      htmlFor="metadata-labels"
                      className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                    >
                      <Tag className="h-3 w-3" />
                      Labels
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="metadata-milestones"
                      checked={mirrorOptions.metadataComponents.milestones}
                      onCheckedChange={(checked) => handleMetadataComponentChange('milestones', !!checked)}
                      disabled={!isMetadataEnabled}
                    />
                    <Label
                      htmlFor="metadata-milestones"
                      className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                    >
                      <Target className="h-3 w-3" />
                      Milestones
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="metadata-wiki"
                      checked={mirrorOptions.metadataComponents.wiki}
                      onCheckedChange={(checked) => handleMetadataComponentChange('wiki', !!checked)}
                      disabled={!isMetadataEnabled}
                    />
                    <Label
                      htmlFor="metadata-wiki"
                      className="text-sm font-normal cursor-pointer flex items-center gap-1.5"
                    >
                      <BookOpen className="h-3 w-3" />
                      Wiki
                    </Label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Filtering & Behavior Section */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Filtering & Behavior
          </h4>
          <p className="text-xs text-muted-foreground mb-4">
            Fine-tune what gets excluded from mirroring
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="skip-forks"
              checked={advancedOptions.skipForks}
              onCheckedChange={(checked) => handleAdvancedChange('skipForks', !!checked)}
            />
            <div className="space-y-0.5 flex-1">
              <Label
                htmlFor="skip-forks"
                className="text-sm font-normal cursor-pointer flex items-center gap-2"
              >
                <GitFork className="h-3.5 w-3.5" />
                Skip forked repositories
              </Label>
              <p className="text-xs text-muted-foreground">
                Exclude repositories that are forks of other projects
              </p>
            </div>
          </div>

          {githubConfig.mirrorStarred && (
            <div className="flex items-start space-x-3">
              <Checkbox
                id="skip-starred-metadata"
                checked={advancedOptions.skipStarredIssues}
                onCheckedChange={(checked) => handleAdvancedChange('skipStarredIssues', !!checked)}
              />
              <div className="space-y-0.5 flex-1">
                <Label
                  htmlFor="skip-starred-metadata"
                  className="text-sm font-normal cursor-pointer flex items-center gap-2"
                >
                  <Star className="h-3.5 w-3.5" />
                  Lightweight starred repository mirroring
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs">
                        <p className="text-xs">
                          When enabled, starred repositories will only mirror code, 
                          skipping issues, PRs, and other metadata to reduce storage 
                          and improve performance.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Only mirror code from starred repos, skip issues and metadata
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}