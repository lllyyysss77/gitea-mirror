import { useState } from "react";
import { ArrowRight, Edit3, RotateCcw, CheckCircle2, XCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MirrorDestinationEditorProps {
  organizationId: string;
  organizationName: string;
  currentDestination?: string;
  onUpdate: (newDestination: string | null) => Promise<void>;
  isUpdating?: boolean;
  className?: string;
}

export function MirrorDestinationEditor({
  organizationId,
  organizationName,
  currentDestination,
  onUpdate,
  isUpdating = false,
  className,
}: MirrorDestinationEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editValue, setEditValue] = useState(currentDestination || "");
  const [isLoading, setIsLoading] = useState(false);

  const hasOverride = currentDestination && currentDestination !== organizationName;
  const effectiveDestination = currentDestination || organizationName;

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    const newDestination = trimmedValue === "" || trimmedValue === organizationName 
      ? null 
      : trimmedValue;

    setIsLoading(true);
    try {
      await onUpdate(newDestination);
      setIsOpen(false);
      toast.success(
        newDestination 
          ? `Destination updated to: ${newDestination}`
          : "Destination reset to default"
      );
    } catch (error) {
      toast.error("Failed to update destination");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setEditValue("");
    await handleSave();
  };

  const handleCancel = () => {
    setEditValue(currentDestination || "");
    setIsOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Building2 className="h-3 w-3" />
        <span className="font-medium">{organizationName}</span>
        <ArrowRight className="h-3 w-3" />
        <span className={cn(
          "font-medium",
          hasOverride && "text-orange-600 dark:text-orange-400"
        )}>
          {effectiveDestination}
        </span>
        {hasOverride && (
          <Badge variant="outline" className="h-4 px-1 text-[10px] border-orange-600 text-orange-600 dark:border-orange-400 dark:text-orange-400">
            custom
          </Badge>
        )}
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
            title="Edit mirror destination"
            disabled={isUpdating || isLoading}
          >
            <Edit3 className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-1">Mirror Destination</h4>
              <p className="text-xs text-muted-foreground">
                Customize where this organization's repositories are mirrored to in Gitea.
              </p>
            </div>

            <div className="space-y-3">
              {/* Visual Preview */}
              <div className="rounded-md bg-muted/50 p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Preview</div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{organizationName}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-primary">
                      {editValue.trim() || organizationName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Input Field */}
              <div className="space-y-2">
                <Label htmlFor="destination" className="text-xs">
                  Destination Organization
                </Label>
                <Input
                  id="destination"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={organizationName}
                  className="h-8"
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to use the default GitHub organization name
                </p>
              </div>

              {/* Quick Actions */}
              {hasOverride && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={isLoading}
                  className="w-full h-8 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-2" />
                  Reset to Default ({organizationName})
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isLoading || (editValue.trim() === (currentDestination || ""))}
              >
                {isLoading ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}