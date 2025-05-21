import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GitHubConfigForm } from './GitHubConfigForm';
import { GiteaConfigForm } from './GiteaConfigForm';
import { ScheduleConfigForm } from './ScheduleConfigForm';
import type {
  ConfigApiResponse,
  GiteaConfig,
  GitHubConfig,
  SaveConfigApiRequest,
  SaveConfigApiResponse,
  ScheduleConfig,
} from '@/types/config';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/utils';
import { Copy, CopyCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

type ConfigState = {
  githubConfig: GitHubConfig;
  giteaConfig: GiteaConfig;
  scheduleConfig: ScheduleConfig;
};

export function ConfigTabs() {
  const [config, setConfig] = useState<ConfigState>({
    githubConfig: {
      username: '',
      token: '',
      skipForks: false,
      privateRepositories: false,
      mirrorIssues: false,
      mirrorStarred: false,
      preserveOrgStructure: false,
      skipStarredIssues: false,
    },
    giteaConfig: {
      url: '',
      username: '',
      token: '',
      organization: 'github-mirrors',
      visibility: 'public',
      starredReposOrg: 'github',
    },
    scheduleConfig: {
      enabled: false,
      interval: 3600,
    },
  });
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [dockerCode, setDockerCode] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isConfigSaved, setIsConfigSaved] = useState<boolean>(false);

  const isConfigFormValid = (): boolean => {
    const { githubConfig, giteaConfig } = config;
    const isGitHubValid = !!(
      githubConfig.username.trim() && githubConfig.token.trim()
    );
    const isGiteaValid = !!(
      giteaConfig.url.trim() &&
      giteaConfig.username.trim() &&
      giteaConfig.token.trim()
    );
    return isGitHubValid && isGiteaValid;
  };

  useEffect(() => {
    const updateLastAndNextRun = () => {
      const lastRun = config.scheduleConfig.lastRun
        ? new Date(config.scheduleConfig.lastRun)
        : new Date();
      const intervalInSeconds = config.scheduleConfig.interval;
      const nextRun = new Date(
        lastRun.getTime() + intervalInSeconds * 1000,
      );
      setConfig(prev => ({
        ...prev,
        scheduleConfig: {
          ...prev.scheduleConfig,
          lastRun,
          nextRun,
        },
      }));
    };
    updateLastAndNextRun();
  }, [config.scheduleConfig.interval]);

  const handleImportGitHubData = async () => {
    if (!user?.id) return;
    setIsSyncing(true);
    try {
      const result = await apiRequest<{ success: boolean; message?: string }>(
        `/sync?userId=${user.id}`,
        { method: 'POST' },
      );
      result.success
        ? toast.success(
            'GitHub data imported successfully! Head to the Dashboard to start mirroring repositories.',
          )
        : toast.error(
            `Failed to import GitHub data: ${
              result.message || 'Unknown error'
            }`,
          );
    } catch (error) {
      toast.error(
        `Error importing GitHub data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!user?.id) return;
    const reqPayload: SaveConfigApiRequest = {
      userId: user.id,
      githubConfig: config.githubConfig,
      giteaConfig: config.giteaConfig,
      scheduleConfig: config.scheduleConfig,
    };
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reqPayload),
      });
      const result: SaveConfigApiResponse = await response.json();
      if (result.success) {
        await refreshUser();
        setIsConfigSaved(true);
        toast.success(
          'Configuration saved successfully! Now import your GitHub data to begin.',
        );
      } else {
        toast.error(
          `Failed to save configuration: ${result.message || 'Unknown error'}`,
        );
      }
    } catch (error) {
      toast.error(
        `An error occurred while saving the configuration: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const response = await apiRequest<ConfigApiResponse>(
          `/config?userId=${user.id}`,
          { method: 'GET' },
        );
        if (response && !response.error) {
          setConfig({
            githubConfig:
              response.githubConfig || config.githubConfig,
            giteaConfig:
              response.giteaConfig || config.giteaConfig,
            scheduleConfig:
              response.scheduleConfig || config.scheduleConfig,
          });
          if (response.id) setIsConfigSaved(true);
        }
      } catch (error) {
        console.warn(
          'Could not fetch configuration, using defaults:',
          error,
        );
      }
      setIsLoading(false);
    };

    fetchConfig();
  }, [user]);

  useEffect(() => {
    const generateDockerCode = () => `
services:
  gitea-mirror:
    image: arunavo4/gitea-mirror:latest
    restart: unless-stopped
    container_name: gitea-mirror
    environment:
      - GITHUB_USERNAME=${config.githubConfig.username}
      - GITEA_URL=${config.giteaConfig.url}
      - GITEA_TOKEN=${config.giteaConfig.token}
      - GITHUB_TOKEN=${config.githubConfig.token}
      - SKIP_FORKS=${config.githubConfig.skipForks}
      - PRIVATE_REPOSITORIES=${config.githubConfig.privateRepositories}
      - MIRROR_ISSUES=${config.githubConfig.mirrorIssues}
      - MIRROR_STARRED=${config.githubConfig.mirrorStarred}
      - PRESERVE_ORG_STRUCTURE=${config.githubConfig.preserveOrgStructure}
      - SKIP_STARRED_ISSUES=${config.githubConfig.skipStarredIssues}
      - GITEA_ORGANIZATION=${config.giteaConfig.organization}
      - GITEA_ORG_VISIBILITY=${config.giteaConfig.visibility}
      - DELAY=${config.scheduleConfig.interval}`;
    setDockerCode(generateDockerCode());
  }, [config]);

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setIsCopied(true);
        toast.success('Docker configuration copied to clipboard!');
        setTimeout(() => setIsCopied(false), 2000);
      },
      () => toast.error('Could not copy text to clipboard.'),
    );
  };

  function ConfigCardSkeleton() {
    return (
      <Card>
        <CardHeader className="flex-row justify-between">
          <div className="flex flex-col gap-y-1.5 m-0">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-x-4">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-y-4">
            <div className="flex gap-x-4">
              <div className="w-1/2 border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-9 w-32" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
              <div className="w-1/2 border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-9 w-32" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            </div>
            <div className="border rounded-lg p-4">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  function DockerConfigSkeleton() {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="relative">
          <Skeleton className="h-8 w-8 absolute top-4 right-10 rounded-md" />
          <Skeleton className="h-48 w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  return isLoading ? (
    <div className="flex flex-col gap-y-6">
      <ConfigCardSkeleton />
      <DockerConfigSkeleton />
    </div>
  ) : (
    <div className="flex flex-col gap-y-6">
      <Card>
        <CardHeader className="flex-row justify-between">
          <div className="flex flex-col gap-y-1.5 m-0">
            <CardTitle>Configuration Settings</CardTitle>
            <CardDescription>
              Configure your GitHub and Gitea connections, and set up automatic
              mirroring.
            </CardDescription>
          </div>
          <div className="flex gap-x-4">
            <Button
              onClick={handleImportGitHubData}
              disabled={isSyncing || !isConfigSaved}
              title={
                !isConfigSaved
                  ? 'Save configuration first'
                  : isSyncing
                  ? 'Import in progress'
                  : 'Import GitHub Data'
              }
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                  Import GitHub Data
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Import GitHub Data
                </>
              )}
            </Button>
            <Button
              onClick={handleSaveConfig}
              disabled={!isConfigFormValid()}
              title={
                !isConfigFormValid()
                  ? 'Please fill all required fields'
                  : 'Save Configuration'
              }
            >
              Save Configuration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-y-4">
            <div className="flex gap-x-4">
              <GitHubConfigForm
                config={config.githubConfig}
                setConfig={update =>
                  setConfig(prev => ({
                    ...prev,
                    githubConfig:
                      typeof update === 'function'
                        ? update(prev.githubConfig)
                        : update,
                  }))
                }
              />
              <GiteaConfigForm
                config={config.giteaConfig}
                setConfig={update =>
                  setConfig(prev => ({
                    ...prev,
                    giteaConfig:
                      typeof update === 'function'
                        ? update(prev.giteaConfig)
                        : update,
                  }))
                }
              />
            </div>
            <ScheduleConfigForm
              config={config.scheduleConfig}
              setConfig={update =>
                setConfig(prev => ({
                  ...prev,
                  scheduleConfig:
                    typeof update === 'function'
                      ? update(prev.scheduleConfig)
                      : update,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Docker Configuration</CardTitle>
          <CardDescription>
            Equivalent Docker configuration for your current settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 right-10"
            onClick={() => handleCopyToClipboard(dockerCode)}
          >
            {isCopied ? (
              <CopyCheck className="text-green-500" />
            ) : (
              <Copy className="text-muted-foreground" />
            )}
          </Button>
          <pre className="bg-muted p-4 rounded-md overflow-auto text-sm">
            {dockerCode}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
