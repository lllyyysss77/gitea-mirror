import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { apiRequest } from '@/lib/utils';
import type { ConfigApiResponse } from '@/types/config';

interface ConfigStatus {
  isGitHubConfigured: boolean;
  isGiteaConfigured: boolean;
  isFullyConfigured: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to check if GitHub and Gitea are properly configured
 * Returns configuration status and prevents unnecessary API calls when not configured
 */
export function useConfigStatus(): ConfigStatus {
  const { user } = useAuth();
  const [configStatus, setConfigStatus] = useState<ConfigStatus>({
    isGitHubConfigured: false,
    isGiteaConfigured: false,
    isFullyConfigured: false,
    isLoading: true,
    error: null,
  });

  const checkConfiguration = useCallback(async () => {
    if (!user?.id) {
      setConfigStatus({
        isGitHubConfigured: false,
        isGiteaConfigured: false,
        isFullyConfigured: false,
        isLoading: false,
        error: 'No user found',
      });
      return;
    }

    try {
      setConfigStatus(prev => ({ ...prev, isLoading: true, error: null }));

      const configResponse = await apiRequest<ConfigApiResponse>(
        `/config?userId=${user.id}`,
        { method: 'GET' }
      );

      const isGitHubConfigured = !!(
        configResponse?.githubConfig?.username && 
        configResponse?.githubConfig?.token
      );

      const isGiteaConfigured = !!(
        configResponse?.giteaConfig?.url && 
        configResponse?.giteaConfig?.username && 
        configResponse?.giteaConfig?.token
      );

      const isFullyConfigured = isGitHubConfigured && isGiteaConfigured;

      setConfigStatus({
        isGitHubConfigured,
        isGiteaConfigured,
        isFullyConfigured,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setConfigStatus({
        isGitHubConfigured: false,
        isGiteaConfigured: false,
        isFullyConfigured: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check configuration',
      });
    }
  }, [user?.id]);

  useEffect(() => {
    checkConfiguration();
  }, [checkConfiguration]);

  return configStatus;
}
