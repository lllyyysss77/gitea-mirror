import { useState, useRef, useEffect } from "react";
import { Edit3, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Repository } from "@/lib/db/schema";

interface InlineDestinationEditorProps {
  repository: Repository;
  giteaConfig: any;
  onUpdate: (repoId: string, newDestination: string | null) => Promise<void>;
  isUpdating?: boolean;
  className?: string;
}

export function InlineDestinationEditor({
  repository,
  giteaConfig,
  onUpdate,
  isUpdating = false,
  className,
}: InlineDestinationEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine the default destination based on repository properties and config
  const getDefaultDestination = () => {
    // Starred repos always go to the configured starredReposOrg
    if (repository.isStarred && giteaConfig?.starredReposOrg) {
      return giteaConfig.starredReposOrg;
    }
    
    // Check mirror strategy
    const strategy = giteaConfig?.mirrorStrategy || 'preserve';
    
    if (strategy === 'single-org' && giteaConfig?.organization) {
      // All repos go to a single organization
      return giteaConfig.organization;
    } else if (strategy === 'flat-user') {
      // All repos go under the user account
      return giteaConfig?.username || repository.owner;
    } else {
      // 'preserve' strategy or default
      // For organization repos, use the organization name
      if (repository.organization) {
        return repository.organization;
      }
      // For personal repos, check if personalReposOrg is configured (but not in preserve mode)
      if (!repository.organization && giteaConfig?.personalReposOrg && strategy !== 'preserve') {
        return giteaConfig.personalReposOrg;
      }
      // Default to the gitea username or owner
      return giteaConfig?.username || repository.owner;
    }
  };

  const defaultDestination = getDefaultDestination();
  const currentDestination = repository.destinationOrg || defaultDestination;
  const hasOverride = repository.destinationOrg && repository.destinationOrg !== defaultDestination;
  const isStarredRepo = repository.isStarred && giteaConfig?.starredReposOrg;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (isStarredRepo) return; // Don't allow editing starred repos
    setEditValue(currentDestination);
    setIsEditing(true);
  };

  const handleSave = async () => {
    const trimmedValue = editValue.trim();
    const newDestination = trimmedValue === defaultDestination ? null : trimmedValue;

    if (trimmedValue === currentDestination) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate(repository.id!, newDestination);
      setIsEditing(false);
    } catch (error) {
      // Revert on error
      setEditValue(currentDestination);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(currentDestination);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleCancel}
          className="h-6 text-sm px-2 py-0 w-24"
          disabled={isLoading}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0"
          onClick={handleSave}
          disabled={isLoading}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-5 w-5 p-0"
          onClick={handleCancel}
          disabled={isLoading}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {/* Show GitHub org if exists */}
      {repository.organization && (
        <span className="text-xs text-muted-foreground">
          {repository.organization}
        </span>
      )}
      
      {/* Show Gitea destination */}
      <div className="flex items-center gap-1 group">
        <span className="text-sm">
          {currentDestination || "-"}
        </span>
        {hasOverride && (
          <Badge variant="outline" className="h-4 px-1 text-[10px] ml-1">
            custom
          </Badge>
        )}
        {isStarredRepo && (
          <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">
            starred
          </Badge>
        )}
        {!isStarredRepo && (
          <Button
            size="sm"
            variant="ghost"
            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-60 hover:opacity-100 ml-1"
            onClick={handleStartEdit}
            disabled={isUpdating || isLoading}
            title="Edit destination"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}