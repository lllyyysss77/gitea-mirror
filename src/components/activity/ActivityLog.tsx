import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Download, RefreshCw, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { apiRequest, formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { MirrorJob } from '@/lib/db/schema';
import type { ActivityApiResponse } from '@/types/activities';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { repoStatusEnum, type RepoStatus } from '@/types/Repository';
import ActivityList from './ActivityList';
import { ActivityNameCombobox } from './ActivityNameCombobox';
import { useSSE } from '@/hooks/useSEE';
import { useFilterParams } from '@/hooks/useFilterParams';
import { toast } from 'sonner';
import { useLiveRefresh } from '@/hooks/useLiveRefresh';
import { useConfigStatus } from '@/hooks/useConfigStatus';
import { useNavigation } from '@/components/layout/MainLayout';

type MirrorJobWithKey = MirrorJob & { _rowKey: string };

function genKey(job: MirrorJob): string {
  return `${
    job.id ?? (typeof crypto !== 'undefined'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2))
  }-${job.timestamp}`;
}

export function ActivityLog() {
  const { user } = useAuth();
  const { registerRefreshCallback } = useLiveRefresh();
  const { isFullyConfigured } = useConfigStatus();
  const { navigationKey } = useNavigation();

  const [activities, setActivities] = useState<MirrorJobWithKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { filter, setFilter } = useFilterParams({
    searchTerm: '',
    status: '',
    type: '',
    name: '',
  });

  /* ----------------------------- SSE hook ----------------------------- */

  const handleNewMessage = useCallback((data: MirrorJob) => {
    const withKey: MirrorJobWithKey = {
      ...structuredClone(data),
      _rowKey: genKey(data),
    };

    setActivities((prev) => [withKey, ...prev]);
  }, []);

  const { connected } = useSSE({
    userId: user?.id,
    onMessage: handleNewMessage,
  });

  /* ------------------------- initial fetch --------------------------- */

  const fetchActivities = useCallback(async () => {
    if (!user?.id) return false;

    try {
      setIsLoading(true);

      const res = await apiRequest<ActivityApiResponse>(
        `/activities?userId=${user.id}`,
        { method: 'GET' },
      );

      if (!res.success) {
        toast.error(res.message ?? 'Failed to fetch activities.');
        return false;
      }

      const data: MirrorJobWithKey[] = res.activities.map((a) => ({
        ...structuredClone(a),
        _rowKey: genKey(a),
      }));

      setActivities(data);
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to fetch activities.',
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]); // Only depend on user.id, not entire user object

  useEffect(() => {
    // Reset loading state when component becomes active
    setIsLoading(true);
    fetchActivities();
  }, [fetchActivities, navigationKey]); // Include navigationKey to trigger on navigation

  // Register with global live refresh system
  useEffect(() => {
    // Only register for live refresh if configuration is complete
    // Activity logs can exist from previous runs, but new activities won't be generated without config
    if (!isFullyConfigured) {
      return;
    }

    const unregister = registerRefreshCallback(() => {
      fetchActivities();
    });

    return unregister;
  }, [registerRefreshCallback, fetchActivities, isFullyConfigured]);

  /* ---------------------- filtering + exporting ---------------------- */

  const applyLightFilter = (list: MirrorJobWithKey[]) => {
    return list.filter((a) => {
      if (filter.status && a.status !== filter.status) return false;

      if (filter.type === 'repository' && !a.repositoryId) return false;
      if (filter.type === 'organization' && !a.organizationId) return false;

      if (
        filter.name &&
        a.repositoryName !== filter.name &&
        a.organizationName !== filter.name
      ) {
        return false;
      }

      return true;
    });
  };

  const exportAsCSV = () => {
    const rows = applyLightFilter(activities);
    if (!rows.length) return toast.error('No activities to export.');

    const headers = [
      'Timestamp',
      'Message',
      'Status',
      'Repository',
      'Organization',
      'Details',
    ];

    const escape = (v: string | null | undefined) =>
      v && /[,\"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v ?? '';

    const csv = [
      headers.join(','),
      ...rows.map((a) =>
        [
          formatDate(a.timestamp),
          escape(a.message),
          a.status,
          escape(a.repositoryName),
          escape(a.organizationName),
          escape(a.details),
        ].join(','),
      ),
    ].join('\n');

    downloadFile(csv, 'text/csv;charset=utf-8;', 'activity_log_export.csv');
    toast.success('CSV exported.');
  };

  const exportAsJSON = () => {
    const rows = applyLightFilter(activities);
    if (!rows.length) return toast.error('No activities to export.');

    const json = JSON.stringify(
      rows.map((a) => ({
        ...a,
        formattedTime: formatDate(a.timestamp),
      })),
      null,
      2,
    );

    downloadFile(json, 'application/json', 'activity_log_export.json');
    toast.success('JSON exported.');
  };

  const downloadFile = (
    content: string,
    mime: string,
    filename: string,
  ): void => {
    const date = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([content], { type: mime }));
    link.download = filename.replace('.', `_${date}.`);
    link.click();
  };

  /* ------------------------------ UI ------------------------------ */

  return (
    <div className='flex flex-col gap-y-8'>
      <div className='flex w-full flex-row items-center gap-4'>
        {/* search input */}
        <div className='relative flex-1'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
          <input
            type='text'
            placeholder='Search activities...'
            className='h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-8 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
            value={filter.searchTerm}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                searchTerm: e.target.value,
              }))
            }
          />
        </div>

        {/* status select */}
        <Select
          value={filter.status || 'all'}
          onValueChange={(v) =>
            setFilter((p) => ({
              ...p,
              status: v === 'all' ? '' : (v as RepoStatus),
            }))
          }
        >
          <SelectTrigger className='h-9 w-[140px] max-h-9'>
            <SelectValue placeholder='All Status' />
          </SelectTrigger>
          <SelectContent>
            {['all', ...repoStatusEnum.options].map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'All Status' : s[0].toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* repo/org name combobox */}
        <ActivityNameCombobox
          activities={activities}
          value={filter.name || ''}
          onChange={(name) => setFilter((p) => ({ ...p, name }))}
        />

        {/* type select */}
        <Select
          value={filter.type || 'all'}
          onValueChange={(v) =>
            setFilter((p) => ({ ...p, type: v === 'all' ? '' : v }))
          }
        >
          <SelectTrigger className='h-9 w-[140px] max-h-9'>
            <SelectValue placeholder='All Types' />
          </SelectTrigger>
          <SelectContent>
            {['all', 'repository', 'organization'].map((t) => (
              <SelectItem key={t} value={t}>
                {t === 'all' ? 'All Types' : t[0].toUpperCase() + t.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* export dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' className='flex items-center gap-1'>
              <Download className='mr-1 h-4 w-4' />
              Export
              <ChevronDown className='ml-1 h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={exportAsCSV}>
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAsJSON}>
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* refresh */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => fetchActivities()}
          title="Refresh activity log"
        >
          <RefreshCw className='h-4 w-4' />
        </Button>
      </div>

      {/* activity list */}
      <ActivityList
        activities={applyLightFilter(activities)}
        isLoading={isLoading || !connected}
        filter={filter}
        setFilter={setFilter}
      />
    </div>
  );
}
