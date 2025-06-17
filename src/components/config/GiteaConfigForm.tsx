import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { giteaApi } from "@/lib/api";
import type { GiteaConfig, GiteaOrgVisibility, MirrorStrategy } from "@/types/config";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { OrganizationStrategy } from "./OrganizationStrategy";
import { Separator } from "../ui/separator";

interface GiteaConfigFormProps {
  config: GiteaConfig;
  setConfig: React.Dispatch<React.SetStateAction<GiteaConfig>>;
  onAutoSave?: (giteaConfig: GiteaConfig) => Promise<void>;
  isAutoSaving?: boolean;
  githubUsername?: string;
}

export function GiteaConfigForm({ config, setConfig, onAutoSave, isAutoSaving, githubUsername }: GiteaConfigFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Derive the mirror strategy from existing config for backward compatibility
  const getMirrorStrategy = (): MirrorStrategy => {
    if (config.mirrorStrategy) return config.mirrorStrategy;
    if (config.preserveOrgStructure) return "preserve";
    if (config.organization && config.organization !== config.username) return "single-org";
    return "flat-user";
  };
  
  const [mirrorStrategy, setMirrorStrategy] = useState<MirrorStrategy>(getMirrorStrategy());
  
  // Update config when strategy changes
  useEffect(() => {
    const newConfig = { ...config };
    
    switch (mirrorStrategy) {
      case "preserve":
        newConfig.preserveOrgStructure = true;
        newConfig.mirrorStrategy = "preserve";
        break;
      case "single-org":
        newConfig.preserveOrgStructure = false;
        newConfig.mirrorStrategy = "single-org";
        if (!newConfig.organization) {
          newConfig.organization = "github-mirrors";
        }
        break;
      case "flat-user":
        newConfig.preserveOrgStructure = false;
        newConfig.mirrorStrategy = "flat-user";
        newConfig.organization = "";
        break;
    }
    
    setConfig(newConfig);
    if (onAutoSave) {
      onAutoSave(newConfig);
    }
  }, [mirrorStrategy]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    // Special handling for preserveOrgStructure changes
    if (
      name === "preserveOrgStructure" &&
      config.preserveOrgStructure !== checked
    ) {
      toast.info(
        "Changing this setting may affect how repositories are accessed in Gitea. " +
          "Existing mirrored repositories will still be accessible during sync operations.",
        {
          duration: 6000,
          position: "top-center",
        }
      );
    }

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
    if (!config.url || !config.token) {
      toast.error("Gitea URL and token are required to test the connection");
      return;
    }

    setIsLoading(true);

    try {
      const result = await giteaApi.testConnection(config.url, config.token);
      if (result.success) {
        toast.success("Successfully connected to Gitea!");
      } else {
        toast.error(
          "Failed to connect to Gitea. Please check your URL and token."
        );
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
          Gitea Configuration
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          onClick={testConnection}
          disabled={isLoading || !config.url || !config.token}
        >
          {isLoading ? "Testing..." : "Test Connection"}
        </Button>
      </CardHeader>

      <CardContent className="flex flex-col gap-y-6">
        <div>
          <label
            htmlFor="gitea-username"
            className="block text-sm font-medium mb-1.5"
          >
            Gitea Username
          </label>
          <input
            id="gitea-username"
            name="username"
            type="text"
            value={config.username}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Your Gitea username"
            required
          />
        </div>

        <div>
          <label
            htmlFor="gitea-url"
            className="block text-sm font-medium mb-1.5"
          >
            Gitea URL
          </label>
          <input
            id="gitea-url"
            name="url"
            type="url"
            value={config.url}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="https://your-gitea-instance.com"
            required
          />
        </div>

        <div>
          <label
            htmlFor="gitea-token"
            className="block text-sm font-medium mb-1.5"
          >
            Gitea Token
          </label>
          <input
            id="gitea-token"
            name="token"
            type="password"
            value={config.token}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Your Gitea access token"
            required
          />
          <p className="text-xs text-muted-foreground mt-1">
            Create a token in your Gitea instance under Settings &gt;
            Applications.
          </p>
        </div>

        <Separator />
        
        <OrganizationStrategy
          strategy={mirrorStrategy}
          destinationOrg={config.organization}
          starredReposOrg={config.starredReposOrg}
          visibility={config.visibility}
          onStrategyChange={setMirrorStrategy}
          onDestinationOrgChange={(org) => {
            const newConfig = { ...config, organization: org };
            setConfig(newConfig);
            if (onAutoSave) onAutoSave(newConfig);
          }}
          onStarredReposOrgChange={(org) => {
            const newConfig = { ...config, starredReposOrg: org };
            setConfig(newConfig);
            if (onAutoSave) onAutoSave(newConfig);
          }}
          onVisibilityChange={(visibility) => {
            const newConfig = { ...config, visibility };
            setConfig(newConfig);
            if (onAutoSave) onAutoSave(newConfig);
          }}
          githubUsername={githubUsername}
          giteaUsername={config.username}
        />
      </CardContent>
    </Card>
  );
}
