import React, { useState } from "react";
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
import type { GiteaConfig, GiteaOrgVisibility } from "@/types/config";
import { toast } from "sonner";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface GiteaConfigFormProps {
  config: GiteaConfig;
  setConfig: React.Dispatch<React.SetStateAction<GiteaConfig>>;
  onAutoSave?: (giteaConfig: GiteaConfig) => Promise<void>;
  isAutoSaving?: boolean;
}

export function GiteaConfigForm({ config, setConfig, onAutoSave, isAutoSaving }: GiteaConfigFormProps) {
  const [isLoading, setIsLoading] = useState(false);

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
    <Card className="w-full">
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

        <div>
          <label
            htmlFor="organization"
            className="block text-sm font-medium mb-1.5"
          >
            Destination organisation (optional)
          </label>
          <input
            id="organization"
            name="organization"
            type="text"
            value={config.organization}
            onChange={handleChange}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Organization name"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Repos are created here if no per-repo org is set.
          </p>
        </div>

        <div className="flex items-center">
          <Checkbox
            id="preserve-org-structure"
            name="preserveOrgStructure"
            checked={config.preserveOrgStructure}
            onCheckedChange={(checked) =>
              handleChange({
                target: {
                  name: "preserveOrgStructure",
                  type: "checkbox",
                  checked: Boolean(checked),
                  value: "",
                },
              } as React.ChangeEvent<HTMLInputElement>)
            }
          />
          <label
            htmlFor="preserve-org-structure"
            className="ml-2 text-sm select-none flex items-center"
          >
            Mirror GitHub org / team hierarchy
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="ml-1 cursor-pointer align-middle text-muted-foreground"
                  role="button"
                  tabIndex={0}
                >
                  <Info size={16} />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-xs">
                Creates nested orgs or prefixes in Gitea so the layout matches GitHub.
                When enabled, organization repositories will be mirrored to
                the same organization structure in Gitea. When disabled, all
                repositories will be mirrored under your Gitea username.
              </TooltipContent>
            </Tooltip>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="visibility"
              className="block text-sm font-medium mb-1.5"
            >
              Organization Visibility
            </label>
            <Select
              name="visibility"
              value={config.visibility}
              onValueChange={(value) =>
                handleChange({
                  target: { name: "visibility", value },
                } as React.ChangeEvent<HTMLInputElement>)
              }
            >
              <SelectTrigger className="w-full border border-input dark:bg-background dark:hover:bg-background">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent className="bg-background text-foreground border border-input shadow-sm">
                {(["public", "private", "limited"] as GiteaOrgVisibility[]).map(
                  (option) => (
                    <SelectItem
                      key={option}
                      value={option}
                      className="cursor-pointer text-sm px-3 py-2 hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label
              htmlFor="starred-repos-org"
              className="block text-sm font-medium mb-1.5"
            >
              Starred Repositories Organization
            </label>
            <input
              id="starred-repos-org"
              name="starredReposOrg"
              type="text"
              value={config.starredReposOrg}
              onChange={handleChange}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="github"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave blank to use 'github'.
            </p>
          </div>
        </div>
      </CardContent>

      <CardFooter className="">
        {/* Footer content can be added here if needed */}
      </CardFooter>
    </Card>
  );
}
