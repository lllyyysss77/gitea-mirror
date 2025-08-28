import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MirrorJob } from "@/lib/db/schema";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Button } from "../ui/button";

interface RecentActivityProps {
  activities: MirrorJob[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Activity</CardTitle>
        <Button variant="outline" asChild>
          <a href="/activity">View All</a>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col divide-y divide-border">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity</p>
          ) : (
            activities.map((activity, index) => (
              <div key={index} className="flex items-center gap-x-3 py-3.5">
                <div className="relative flex-shrink-0">
                  <div
                    className={`h-2 w-2 rounded-full ${getStatusColor(
                      activity.status
                    )}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {activity.message}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDate(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
