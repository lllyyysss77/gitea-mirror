import React from 'react';
import { GitHubConfigForm } from './GitHubConfigForm';
import { GiteaConfigForm } from './GiteaConfigForm';
import { Separator } from '../ui/separator';
import type { GitHubConfig, GiteaConfig } from '@/types/config';

interface ConnectionsFormProps {
  githubConfig: GitHubConfig;
  giteaConfig: GiteaConfig;
  setGithubConfig: (update: GitHubConfig | ((prev: GitHubConfig) => GitHubConfig)) => void;
  setGiteaConfig: (update: GiteaConfig | ((prev: GiteaConfig) => GiteaConfig)) => void;
  onAutoSaveGitHub?: (config: GitHubConfig) => Promise<void>;
  onAutoSaveGitea?: (config: GiteaConfig) => Promise<void>;
  isAutoSavingGitHub?: boolean;
  isAutoSavingGitea?: boolean;
}

export function ConnectionsForm({
  githubConfig,
  giteaConfig,
  setGithubConfig,
  setGiteaConfig,
  onAutoSaveGitHub,
  onAutoSaveGitea,
  isAutoSavingGitHub,
  isAutoSavingGitea,
}: ConnectionsFormProps) {
  return (
    <div className="space-y-6">
      <GitHubConfigForm
        config={githubConfig}
        setConfig={setGithubConfig}
        onAutoSave={onAutoSaveGitHub}
        isAutoSaving={isAutoSavingGitHub}
      />
      
      <Separator />
      
      <GiteaConfigForm
        config={giteaConfig}
        setConfig={setGiteaConfig}
        onAutoSave={onAutoSaveGitea}
        isAutoSaving={isAutoSavingGitea}
      />
    </div>
  );
}
