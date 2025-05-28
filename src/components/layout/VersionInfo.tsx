import { useEffect, useState } from "react";
import { healthApi } from "@/lib/api";

export function VersionInfo() {
  const [versionInfo, setVersionInfo] = useState<{
    current: string;
    latest: string;
    updateAvailable: boolean;
  }>({
    current: "loading...",
    latest: "",
    updateAvailable: false
  });

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const healthData = await healthApi.check();
        setVersionInfo({
          current: healthData.version || "unknown",
          latest: healthData.latestVersion || "unknown",
          updateAvailable: healthData.updateAvailable || false
        });
      } catch (error) {
        console.error("Failed to fetch version:", error);
        setVersionInfo({
          current: "unknown",
          latest: "",
          updateAvailable: false
        });
      }
    };

    fetchVersion();
  }, []);

  return (
    <div className="text-xs text-muted-foreground text-center pt-2 pb-3 border-t border-border mt-2">
      {versionInfo.updateAvailable ? (
        <div className="flex flex-col gap-1">
          <span>v{versionInfo.current}</span>
          <span className="text-primary">v{versionInfo.latest} available</span>
        </div>
      ) : (
        <span>v{versionInfo.current}</span>
      )}
    </div>
  );
}
