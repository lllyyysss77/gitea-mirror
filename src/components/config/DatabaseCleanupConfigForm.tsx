import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "../ui/checkbox";
import type { DatabaseCleanupConfig } from "@/types/config";
import { formatDate } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { RefreshCw, Database } from "lucide-react";

interface DatabaseCleanupConfigFormProps {
  config: DatabaseCleanupConfig;
  setConfig: React.Dispatch<React.SetStateAction<DatabaseCleanupConfig>>;
  onAutoSave?: (config: DatabaseCleanupConfig) => void;
  isAutoSaving?: boolean;
}

export function DatabaseCleanupConfigForm({
  config,
  setConfig,
  onAutoSave,
  isAutoSaving = false,
}: DatabaseCleanupConfigFormProps) {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const newConfig = {
      ...config,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    };
    setConfig(newConfig);

    // Trigger auto-save for cleanup config changes
    if (onAutoSave) {
      onAutoSave(newConfig);
    }
  };

  // Predefined retention periods
  const retentionOptions: { value: number; label: string }[] = [
    { value: 1, label: "1 day" },
    { value: 3, label: "3 days" },
    { value: 7, label: "7 days" },
    { value: 14, label: "14 days" },
    { value: 30, label: "30 days" },
    { value: 60, label: "60 days" },
    { value: 90, label: "90 days" },
  ];

  return (
    <Card>
      <CardContent className="pt-6 relative">
        {isAutoSaving && (
          <div className="absolute top-4 right-4 flex items-center text-sm text-muted-foreground">
            <RefreshCw className="h-3 w-3 animate-spin mr-1" />
            <span className="text-xs">Auto-saving...</span>
          </div>
        )}
        <div className="flex flex-col gap-y-4">
          <div className="flex items-center">
            <Checkbox
              id="cleanup-enabled"
              name="enabled"
              checked={config.enabled}
              onCheckedChange={(checked) =>
                handleChange({
                  target: {
                    name: "enabled",
                    type: "checkbox",
                    checked: Boolean(checked),
                    value: "",
                  },
                } as React.ChangeEvent<HTMLInputElement>)
              }
            />
            <label
              htmlFor="cleanup-enabled"
              className="select-none ml-2 block text-sm font-medium"
            >
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Enable Automatic Database Cleanup
              </div>
            </label>
          </div>

          {config.enabled && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Retention Period
              </label>

              <Select
                name="retentionDays"
                value={String(config.retentionDays)}
                onValueChange={(value) =>
                  handleChange({
                    target: { name: "retentionDays", value },
                  } as React.ChangeEvent<HTMLInputElement>)
                }
              >
                <SelectTrigger className="w-full border border-input dark:bg-background dark:hover:bg-background">
                  <SelectValue placeholder="Select retention period" />
                </SelectTrigger>
                <SelectContent className="bg-background text-foreground border border-input shadow-sm">
                  {retentionOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value.toString()}
                      className="cursor-pointer text-sm px-3 py-2 hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground mt-1">
                Activities and events older than this period will be automatically deleted.
              </p>
            </div>
          )}

          <div className="flex gap-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Last Run</label>
              <div className="text-sm">
                {config.lastRun ? formatDate(config.lastRun) : "Never"}
              </div>
            </div>

            {config.enabled && (
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Next Run</label>
                <div className="text-sm">
                  {config.nextRun ? formatDate(config.nextRun) : "Never"}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
