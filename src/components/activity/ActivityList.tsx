import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { MirrorJob } from '@/lib/db/schema';
import Fuse from 'fuse.js';
import { Button } from '../ui/button';
import { RefreshCw } from 'lucide-react';
import { Card } from '../ui/card';
import { formatDate, getStatusColor } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import type { FilterParams } from '@/types/filter';

type MirrorJobWithKey = MirrorJob & { _rowKey: string };

interface ActivityListProps {
  activities: MirrorJobWithKey[];
  isLoading: boolean;
  filter: FilterParams;
  setFilter: (filter: FilterParams) => void;
}

export default function ActivityList({
  activities,
  isLoading,
  filter,
  setFilter,
}: ActivityListProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    () => new Set(),
  );

  const parentRef = useRef<HTMLDivElement>(null);
  // We keep the ref only for possible future scroll-to-row logic.
  const rowRefs = useRef<Map<string, HTMLDivElement | null>>(new Map()); // eslint-disable-line @typescript-eslint/no-unused-vars

  const filteredActivities = useMemo(() => {
    let result = activities;

    if (filter.status) {
      result = result.filter((a) => a.status === filter.status);
    }

    if (filter.type) {
      result =
        filter.type === 'repository'
          ? result.filter((a) => !!a.repositoryId)
          : filter.type === 'organization'
          ? result.filter((a) => !!a.organizationId)
          : result;
    }

    if (filter.name) {
      result = result.filter(
        (a) =>
          a.repositoryName === filter.name ||
          a.organizationName === filter.name,
      );
    }

    if (filter.searchTerm) {
      const fuse = new Fuse(result, {
        keys: ['message', 'details', 'organizationName', 'repositoryName'],
        threshold: 0.3,
      });
      result = fuse.search(filter.searchTerm).map((r) => r.item);
    }

    return result;
  }, [activities, filter]);

  const virtualizer = useVirtualizer({
    count: filteredActivities.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (idx) =>
      expandedItems.has(filteredActivities[idx]._rowKey) ? 217 : 120,
    overscan: 5,
    measureElement: (el) => el.getBoundingClientRect().height + 8,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [expandedItems, virtualizer]);

  /* ------------------------------ render ------------------------------ */

  if (isLoading) {
    return (
      <div className='flex flex-col gap-y-4'>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className='h-28 w-full rounded-md' />
        ))}
      </div>
    );
  }

  if (filteredActivities.length === 0) {
    const hasFilter =
      filter.searchTerm || filter.status || filter.type || filter.name;

    return (
      <div className='flex flex-col items-center justify-center py-12 text-center'>
        <RefreshCw className='mb-4 h-12 w-12 text-muted-foreground' />
        <h3 className='text-lg font-medium'>No activities found</h3>
        <p className='mt-1 mb-4 max-w-md text-sm text-muted-foreground'>
          {hasFilter
            ? 'Try adjusting your search or filter criteria.'
            : 'No mirroring activities have been recorded yet.'}
        </p>
        {hasFilter ? (
          <Button
            variant='outline'
            onClick={() =>
              setFilter({ searchTerm: '', status: '', type: '', name: '' })
            }
          >
            Clear Filters
          </Button>
        ) : (
          <Button>
            <RefreshCw className='mr-2 h-4 w-4' />
            Refresh
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card
      ref={parentRef}
      className='relative max-h-[calc(100dvh-191px)] overflow-y-auto rounded-md border'
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          position: 'relative',
          width: '100%',
        }}
      >
        {virtualizer.getVirtualItems().map((vRow) => {
          const activity = filteredActivities[vRow.index];
          const isExpanded = expandedItems.has(activity._rowKey);

          return (
            <div
              key={activity._rowKey}
              ref={(node) => {
                rowRefs.current.set(activity._rowKey, node);
                if (node) virtualizer.measureElement(node);
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vRow.start}px)`,
                paddingBottom: '8px',
              }}
              className='border-b px-4 pt-4'
            >
              <div className='flex items-start gap-4'>
                <div className='relative mt-2'>
                  <div
                    className={`h-2 w-2 rounded-full ${getStatusColor(
                      activity.status,
                    )}`}
                  />
                </div>

                <div className='flex-1'>
                  <div className='mb-1 flex flex-col sm:flex-row sm:items-center sm:justify-between'>
                    <p className='font-medium'>{activity.message}</p>
                    <p className='text-sm text-muted-foreground'>
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>

                  {activity.repositoryName && (
                    <p className='mb-2 text-sm text-muted-foreground'>
                      Repository: {activity.repositoryName}
                    </p>
                  )}

                  {activity.organizationName && (
                    <p className='mb-2 text-sm text-muted-foreground'>
                      Organization: {activity.organizationName}
                    </p>
                  )}

                  {activity.details && (
                    <div className='mt-2'>
                      <Button
                        variant='ghost'
                        className='h-7 px-2 text-xs'
                        onClick={() =>
                          setExpandedItems((prev) => {
                            const next = new Set(prev);
                            next.has(activity._rowKey)
                              ? next.delete(activity._rowKey)
                              : next.add(activity._rowKey);
                            return next;
                          })
                        }
                      >
                        {isExpanded ? 'Hide Details' : 'Show Details'}
                      </Button>

                      {isExpanded && (
                        <pre className='mt-2 min-h-[100px] whitespace-pre-wrap overflow-auto rounded-md bg-muted p-3 text-xs'>
                          {activity.details}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
