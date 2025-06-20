import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { githubApi } from "@/lib/api";
import type { GitHubConfig, MirrorOptions, AdvancedOptions } from "@/types/config";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { GitHubMirrorSettings } from "./GitHubMirrorSettings";
import { Separator } from "../ui/separator";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface GitHubConfigFormProps {
  config: GitHubConfig;
  setConfig: React.Dispatch<React.SetStateAction<GitHubConfig>>;
  mirrorOptions: MirrorOptions;
  setMirrorOptions: React.Dispatch<React.SetStateAction<MirrorOptions>>;
  advancedOptions: AdvancedOptions;
  setAdvancedOptions: React.Dispatch<React.SetStateAction<AdvancedOptions>>;
  onAutoSave?: (githubConfig: GitHubConfig) => Promise<void>;
  onMirrorOptionsAutoSave?: (mirrorOptions: MirrorOptions) => Promise<void>;
  onAdvancedOptionsAutoSave?: (advancedOptions: AdvancedOptions) => Promise<void>;
  isAutoSaving?: boolean;
}

export function GitHubConfigForm({ 
  config, 
  setConfig, 
  mirrorOptions,
  setMirrorOptions,
  advancedOptions,
  setAdvancedOptions,
  onAutoSave, 
  onMirrorOptionsAutoSave,
  onAdvancedOptionsAutoSave,
  isAutoSaving 
}: GitHubConfigFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    const newConfig = {
      ...config,
      [name]: type === "checkbox" ? checked : value,
    };

    setConfig(newConfig);

    // Auto-save for all field changes
    if (onAutoSave) {
      onAutoSave(newConfig);
    }
  };

  const testConnection = async () => {
    if (!config.token) {
      toast.error("GitHub token is required to test the connection");
      return;
    }

    setIsLoading(true);

    try {
      const result = await githubApi.testConnection(config.token);
      if (result.success) {
        toast.success("Successfully connected to GitHub!");
      } else {
        toast.error("Failed to connect to GitHub. Please check your token.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An unknown error occurred"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-lg font-semibold">
          GitHub Configuration
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          onClick={testConnection}
          disabled={isLoading || !config.token}
        >
          {isLoading ? "Testing..." : "Test Connection"}
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-y-6 flex-1">
        <div>
          <label
            htmlFor="github-username"
            className="block text-sm font-medium mb-1.5"
          >
            GitHub Username
          </label>
          <Input
            id="github-username"
            name="username"
            type="text"
            value={config.username}
            onChange={handleChange}
            placeholder="Your GitHub username"
            required
            className="bg-background"
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <label
              htmlFor="github-token"
              className="block text-sm font-medium"
            >
              GitHub Token
            </label>
            <HoverCard>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  className="p-0.5 hover:bg-muted rounded-sm transition-colors cursor-help"
                >
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </HoverCardTrigger>
              <HoverCardContent side="right" align="start" className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">GitHub Token Requirements</h4>
                  <div className="text-sm space-y-2">
                    <p>
                      You need to create a <span className="font-medium">Classic GitHub PAT Token</span> with the following scopes:
                    </p>
                    <ul className="ml-4 space-y-1 list-disc">
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">repo</code></li>
                      <li><code className="text-xs bg-muted px-1 py-0.5 rounded">admin:org</code></li>
                    </ul>
                    <p className="text-muted-foreground">
                      The organization access is required for mirroring organization repositories.
                    </p>
                    <p>
                      Generate tokens at{" "}
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                      >
                        github.com/settings/tokens
                      </a>
                    </p>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
          <Input
            id="github-token"
            name="token"
            type="password"
            value={config.token}
            onChange={handleChange}
            className="bg-background"
            placeholder="Your GitHub token (classic) with repo and admin:org scopes"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Required for private repositories, organizations, and starred
            repositories.
          </p>
        </div>

        <Separator />

        <GitHubMirrorSettings
          githubConfig={config}
          mirrorOptions={mirrorOptions}
          advancedOptions={advancedOptions}
          onGitHubConfigChange={(newConfig) => {
            setConfig(newConfig);
            if (onAutoSave) onAutoSave(newConfig);
          }}
          onMirrorOptionsChange={(newOptions) => {
            setMirrorOptions(newOptions);
            if (onMirrorOptionsAutoSave) onMirrorOptionsAutoSave(newOptions);
          }}
          onAdvancedOptionsChange={(newOptions) => {
            setAdvancedOptions(newOptions);
            if (onAdvancedOptionsAutoSave) onAdvancedOptionsAutoSave(newOptions);
          }}
        />
    </CardContent>

    </Card>
  );
}
