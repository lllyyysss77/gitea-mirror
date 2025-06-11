import React from 'react';
import { ScheduleConfigForm } from './ScheduleConfigForm';
import { DatabaseCleanupConfigForm } from './DatabaseCleanupConfigForm';
import { Separator } from '../ui/separator';
import type { ScheduleConfig, DatabaseCleanupConfig } from '@/types/config';

interface ScheduleAndCleanupFormProps {
  scheduleConfig: ScheduleConfig;
  cleanupConfig: DatabaseCleanupConfig;
  setScheduleConfig: (update: ScheduleConfig | ((prev: ScheduleConfig) => ScheduleConfig)) => void;
  setCleanupConfig: (update: DatabaseCleanupConfig | ((prev: DatabaseCleanupConfig) => DatabaseCleanupConfig)) => void;
  onAutoSaveSchedule?: (config: ScheduleConfig) => Promise<void>;
  onAutoSaveCleanup?: (config: DatabaseCleanupConfig) => Promise<void>;
  isAutoSavingSchedule?: boolean;
  isAutoSavingCleanup?: boolean;
}

export function ScheduleAndCleanupForm({
  scheduleConfig,
  cleanupConfig,
  setScheduleConfig,
  setCleanupConfig,
  onAutoSaveSchedule,
  onAutoSaveCleanup,
  isAutoSavingSchedule,
  isAutoSavingCleanup,
}: ScheduleAndCleanupFormProps) {
  return (
    <div className="space-y-6">
      <ScheduleConfigForm
        config={scheduleConfig}
        setConfig={setScheduleConfig}
        onAutoSave={onAutoSaveSchedule}
        isAutoSaving={isAutoSavingSchedule}
      />
      
      <Separator />
      
      <DatabaseCleanupConfigForm
        config={cleanupConfig}
        setConfig={setCleanupConfig}
        onAutoSave={onAutoSaveCleanup}
        isAutoSaving={isAutoSavingCleanup}
      />
    </div>
  );
}
