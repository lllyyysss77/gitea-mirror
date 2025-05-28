import { useEffect, useState, useCallback, useRef } from 'react';
import { GitHubConfigForm } from './GitHubConfigForm';
import { GiteaConfigForm } from './GiteaConfigForm';
import { ScheduleConfigForm } from './ScheduleConfigForm';
import { DatabaseCleanupConfigForm } from './DatabaseCleanupConfigForm';
import type {
  ConfigApiResponse,
  GiteaConfig,
  GitHubConfig,
  SaveConfigApiRequest,
  SaveConfigApiResponse,
  ScheduleConfig,
  DatabaseCleanupConfig,
} from '@/types/config';
import { Button } from '../ui/button';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, showErrorToast } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { invalidateConfigCache } from '@/hooks/useConfigStatus';

type ConfigState = {
  githubConfig: GitHubConfig;
  giteaConfig: GiteaConfig;
  scheduleConfig: ScheduleConfig;
  cleanupConfig: DatabaseCleanupConfig;
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
    cleanupConfig: {
      enabled: false,
      retentionDays: 604800, // 7 days in seconds
    },
  });
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [isAutoSavingSchedule, setIsAutoSavingSchedule] = useState<boolean>(false);
  const [isAutoSavingCleanup, setIsAutoSavingCleanup] = useState<boolean>(false);
  const [isAutoSavingGitHub, setIsAutoSavingGitHub] = useState<boolean>(false);
  const [isAutoSavingGitea, setIsAutoSavingGitea] = useState<boolean>(false);
  const autoSaveScheduleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveCleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveGitHubTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveGiteaTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Removed the problematic useEffect that was causing circular dependencies
  // The lastRun and nextRun should be managed by the backend and fetched via API

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
            'GitHub data imported successfully! Head to the Repositories page to start mirroring.',
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

  // Auto-save function specifically for schedule config changes
  const autoSaveScheduleConfig = useCallback(async (scheduleConfig: ScheduleConfig) => {
    if (!user?.id) return;

    // Clear any existing timeout
    if (autoSaveScheduleTimeoutRef.current) {
      clearTimeout(autoSaveScheduleTimeoutRef.current);
    }

    // Debounce the auto-save to prevent excessive API calls
    autoSaveScheduleTimeoutRef.current = setTimeout(async () => {
      setIsAutoSavingSchedule(true);

      const reqPayload: SaveConfigApiRequest = {
        userId: user.id!,
        githubConfig: config.githubConfig,
        giteaConfig: config.giteaConfig,
        scheduleConfig: scheduleConfig,
        cleanupConfig: config.cleanupConfig,
      };

      try {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqPayload),
        });
        const result: SaveConfigApiResponse = await response.json();

        if (result.success) {
          // Silent success - no toast for auto-save
          // Removed refreshUser() call to prevent page reload
          // Invalidate config cache so other components get fresh data
          invalidateConfigCache();

          // Fetch updated config to get the recalculated nextRun time
          try {
            const updatedResponse = await apiRequest<ConfigApiResponse>(
              `/config?userId=${user.id}`,
              { method: 'GET' },
            );
            if (updatedResponse && !updatedResponse.error) {
              setConfig(prev => ({
                ...prev,
                scheduleConfig: updatedResponse.scheduleConfig || prev.scheduleConfig,
              }));
            }
          } catch (fetchError) {
            console.warn('Failed to fetch updated config after auto-save:', fetchError);
          }
        } else {
          showErrorToast(
            `Auto-save failed: ${result.message || 'Unknown error'}`,
            toast
          );
        }
      } catch (error) {
        showErrorToast(error, toast);
      } finally {
        setIsAutoSavingSchedule(false);
      }
    }, 500); // 500ms debounce
  }, [user?.id, config.githubConfig, config.giteaConfig, config.cleanupConfig]);

  // Auto-save function specifically for cleanup config changes
  const autoSaveCleanupConfig = useCallback(async (cleanupConfig: DatabaseCleanupConfig) => {
    if (!user?.id) return;

    // Clear any existing timeout
    if (autoSaveCleanupTimeoutRef.current) {
      clearTimeout(autoSaveCleanupTimeoutRef.current);
    }

    // Debounce the auto-save to prevent excessive API calls
    autoSaveCleanupTimeoutRef.current = setTimeout(async () => {
      setIsAutoSavingCleanup(true);

      const reqPayload: SaveConfigApiRequest = {
        userId: user.id!,
        githubConfig: config.githubConfig,
        giteaConfig: config.giteaConfig,
        scheduleConfig: config.scheduleConfig,
        cleanupConfig: cleanupConfig,
      };

      try {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqPayload),
        });
        const result: SaveConfigApiResponse = await response.json();

        if (result.success) {
          // Silent success - no toast for auto-save
          // Invalidate config cache so other components get fresh data
          invalidateConfigCache();

          // Fetch updated config to get the recalculated nextRun time
          try {
            const updatedResponse = await apiRequest<ConfigApiResponse>(
              `/config?userId=${user.id}`,
              { method: 'GET' },
            );
            if (updatedResponse && !updatedResponse.error) {
              setConfig(prev => ({
                ...prev,
                cleanupConfig: updatedResponse.cleanupConfig || prev.cleanupConfig,
              }));
            }
          } catch (fetchError) {
            console.warn('Failed to fetch updated config after auto-save:', fetchError);
          }
        } else {
          showErrorToast(
            `Auto-save failed: ${result.message || 'Unknown error'}`,
            toast
          );
        }
      } catch (error) {
        showErrorToast(error, toast);
      } finally {
        setIsAutoSavingCleanup(false);
      }
    }, 500); // 500ms debounce
  }, [user?.id, config.githubConfig, config.giteaConfig, config.scheduleConfig]);

  // Auto-save function specifically for GitHub config changes
  const autoSaveGitHubConfig = useCallback(async (githubConfig: GitHubConfig) => {
    if (!user?.id) return;

    // Clear any existing timeout
    if (autoSaveGitHubTimeoutRef.current) {
      clearTimeout(autoSaveGitHubTimeoutRef.current);
    }

    // Debounce the auto-save to prevent excessive API calls
    autoSaveGitHubTimeoutRef.current = setTimeout(async () => {
      setIsAutoSavingGitHub(true);

      const reqPayload: SaveConfigApiRequest = {
        userId: user.id!,
        githubConfig: githubConfig,
        giteaConfig: config.giteaConfig,
        scheduleConfig: config.scheduleConfig,
        cleanupConfig: config.cleanupConfig,
      };

      try {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqPayload),
        });
        const result: SaveConfigApiResponse = await response.json();

        if (result.success) {
          // Silent success - no toast for auto-save
          // Invalidate config cache so other components get fresh data
          invalidateConfigCache();
        } else {
          showErrorToast(
            `Auto-save failed: ${result.message || 'Unknown error'}`,
            toast
          );
        }
      } catch (error) {
        showErrorToast(error, toast);
      } finally {
        setIsAutoSavingGitHub(false);
      }
    }, 500); // 500ms debounce
  }, [user?.id, config.giteaConfig, config.scheduleConfig, config.cleanupConfig]);

  // Auto-save function specifically for Gitea config changes
  const autoSaveGiteaConfig = useCallback(async (giteaConfig: GiteaConfig) => {
    if (!user?.id) return;

    // Clear any existing timeout
    if (autoSaveGiteaTimeoutRef.current) {
      clearTimeout(autoSaveGiteaTimeoutRef.current);
    }

    // Debounce the auto-save to prevent excessive API calls
    autoSaveGiteaTimeoutRef.current = setTimeout(async () => {
      setIsAutoSavingGitea(true);

      const reqPayload: SaveConfigApiRequest = {
        userId: user.id!,
        githubConfig: config.githubConfig,
        giteaConfig: giteaConfig,
        scheduleConfig: config.scheduleConfig,
        cleanupConfig: config.cleanupConfig,
      };

      try {
        const response = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqPayload),
        });
        const result: SaveConfigApiResponse = await response.json();

        if (result.success) {
          // Silent success - no toast for auto-save
          // Invalidate config cache so other components get fresh data
          invalidateConfigCache();
        } else {
          showErrorToast(
            `Auto-save failed: ${result.message || 'Unknown error'}`,
            toast
          );
        }
      } catch (error) {
        showErrorToast(error, toast);
      } finally {
        setIsAutoSavingGitea(false);
      }
    }, 500); // 500ms debounce
  }, [user?.id, config.githubConfig, config.scheduleConfig, config.cleanupConfig]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveScheduleTimeoutRef.current) {
        clearTimeout(autoSaveScheduleTimeoutRef.current);
      }
      if (autoSaveCleanupTimeoutRef.current) {
        clearTimeout(autoSaveCleanupTimeoutRef.current);
      }
      if (autoSaveGitHubTimeoutRef.current) {
        clearTimeout(autoSaveGitHubTimeoutRef.current);
      }
      if (autoSaveGiteaTimeoutRef.current) {
        clearTimeout(autoSaveGiteaTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

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
            cleanupConfig:
              response.cleanupConfig || config.cleanupConfig,
          });

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
  }, [user?.id]); // Only depend on user.id, not the entire user object

  function ConfigCardSkeleton() {
    return (
      <div className="space-y-6">
        {/* Header section */}
        <div className="flex flex-row justify-between items-start">
          <div className="flex flex-col gap-y-1.5">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-x-4">
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>

        {/* Content section */}
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
          <div className="flex gap-x-4">
            <div className="w-1/2 border rounded-lg p-4">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
            <div className="w-1/2 border rounded-lg p-4">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-8 w-32" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return isLoading ? (
    <div className="space-y-6">
      <ConfigCardSkeleton />
    </div>
  ) : (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-row justify-between items-start">
        <div className="flex flex-col gap-y-1.5">
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            Configuration Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure your GitHub and Gitea connections, and set up automatic
            mirroring.
          </p>
        </div>
        <div className="flex gap-x-4">
          <Button
            onClick={handleImportGitHubData}
            disabled={isSyncing || !isConfigFormValid()}
            title={
              !isConfigFormValid()
                ? 'Please fill all required GitHub and Gitea fields'
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
        </div>
      </div>

      {/* Content section */}
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
            onAutoSave={autoSaveGitHubConfig}
            isAutoSaving={isAutoSavingGitHub}
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
            onAutoSave={autoSaveGiteaConfig}
            isAutoSaving={isAutoSavingGitea}
          />
        </div>
        <div className="flex gap-x-4">
          <div className="w-1/2">
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
              onAutoSave={autoSaveScheduleConfig}
              isAutoSaving={isAutoSavingSchedule}
            />
          </div>
          <div className="w-1/2">
            <DatabaseCleanupConfigForm
              config={config.cleanupConfig}
              setConfig={update =>
                setConfig(prev => ({
                  ...prev,
                  cleanupConfig:
                    typeof update === 'function'
                      ? update(prev.cleanupConfig)
                      : update,
                }))
              }
              onAutoSave={autoSaveCleanupConfig}
              isAutoSaving={isAutoSavingCleanup}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
