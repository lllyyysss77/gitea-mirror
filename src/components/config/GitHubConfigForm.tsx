import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { githubApi } from "@/lib/api";
import type { GitHubConfig } from "@/types/config";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface GitHubConfigFormProps {
  config: GitHubConfig;
  setConfig: React.Dispatch<React.SetStateAction<GitHubConfig>>;
  onAutoSave?: (githubConfig: GitHubConfig) => Promise<void>;
  isAutoSaving?: boolean;
}

export function GitHubConfigForm({ config, setConfig, onAutoSave, isAutoSaving }: GitHubConfigFormProps) {
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
    <Card className="w-full self-start">
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

      <CardContent className="flex flex-col gap-y-6">
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
          <label
            htmlFor="github-token"
            className="block text-sm font-medium mb-1.5"
          >
            GitHub Token
          </label>
          <Input
            id="github-token"
            name="token"
            type="password"
            value={config.token}
            onChange={handleChange}
            className="bg-background"
            placeholder="Your GitHub personal access token"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Required for private repositories, organizations, and starred
            repositories.
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">Repository Access</h4>

          <div className="space-y-3">
            <div className="flex items-center">
              <Checkbox
                id="private-repositories"
                name="privateRepositories"
                checked={config.privateRepositories}
                onCheckedChange={(checked) =>
                  handleChange({
                    target: {
                      name: "privateRepositories",
                      type: "checkbox",
                      checked: Boolean(checked),
                      value: "",
                    },
                  } as React.ChangeEvent<HTMLInputElement>)
                }
              />
              <label
                htmlFor="private-repositories"
                className="ml-2 block text-sm select-none"
              >
                Include private repos
              </label>
            </div>

            <div className="flex items-center">
              <Checkbox
                id="mirror-starred"
                name="mirrorStarred"
                checked={config.mirrorStarred}
                onCheckedChange={(checked) =>
                  handleChange({
                    target: {
                      name: "mirrorStarred",
                      type: "checkbox",
                      checked: Boolean(checked),
                      value: "",
                    },
                  } as React.ChangeEvent<HTMLInputElement>)
                }
              />
              <label
                htmlFor="mirror-starred"
                className="ml-2 block text-sm select-none"
              >
                Mirror starred repos
              </label>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex-col items-start">
        <Alert variant="note" className="w-full">
          <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
          <AlertDescription className="text-sm">
            <div className="font-semibold mb-1">Note:</div>
            <div className="mb-1">
              You need to create a{" "}
              <span className="font-semibold">Classic GitHub PAT Token</span>{" "}
              with following scopes:
            </div>
            <ul className="ml-4 mb-1 list-disc">
              <li>
                <code>repo</code>
              </li>
              <li>
                <code>admin:org</code>
              </li>
            </ul>
            <div className="mb-1">
              The organization access is required for mirroring organization
              repositories.
            </div>
            <div>
              You can generate tokens at{" "}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium hover:text-blue-900 dark:hover:text-blue-200"
              >
                github.com/settings/tokens
              </a>
              .
            </div>
          </AlertDescription>
        </Alert>
      </CardFooter>
    </Card>
  );
}
