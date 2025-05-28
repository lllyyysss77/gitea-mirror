import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { httpRequest, HttpError } from "@/lib/http-client";
import type { RepoStatus } from "@/types/Repository";

export const API_BASE = "/api";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date?: Date | string | null): string {
  if (!date) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function safeParse<T>(value: unknown): T | undefined {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  return value as T;
}

// Enhanced error message parsing for toast notifications
export interface ParsedErrorMessage {
  title: string;
  description?: string;
  isStructured: boolean;
}

export function parseErrorMessage(error: unknown): ParsedErrorMessage {
  // Handle Error objects
  if (error instanceof Error) {
    return parseErrorMessage(error.message);
  }

  // Handle string messages
  if (typeof error === "string") {
    // Try to parse as JSON first
    try {
      const parsed = JSON.parse(error);

      // Check for common structured error formats
      if (typeof parsed === "object" && parsed !== null) {
        // Format 1: { error: "message", errorType: "type", troubleshooting: "info" }
        if (parsed.error) {
          return {
            title: parsed.error,
            description: parsed.troubleshooting || parsed.errorType || undefined,
            isStructured: true,
          };
        }

        // Format 2: { title: "title", description: "desc" }
        if (parsed.title) {
          return {
            title: parsed.title,
            description: parsed.description || undefined,
            isStructured: true,
          };
        }

        // Format 3: { message: "msg", details: "details" }
        if (parsed.message) {
          return {
            title: parsed.message,
            description: parsed.details || undefined,
            isStructured: true,
          };
        }
      }
    } catch {
      // Not valid JSON, treat as plain string
    }

    // Plain string message
    return {
      title: error,
      description: undefined,
      isStructured: false,
    };
  }

  // Handle objects directly
  if (typeof error === "object" && error !== null) {
    const errorObj = error as any;

    if (errorObj.error) {
      return {
        title: errorObj.error,
        description: errorObj.troubleshooting || errorObj.errorType || undefined,
        isStructured: true,
      };
    }

    if (errorObj.title) {
      return {
        title: errorObj.title,
        description: errorObj.description || undefined,
        isStructured: true,
      };
    }

    if (errorObj.message) {
      return {
        title: errorObj.message,
        description: errorObj.details || undefined,
        isStructured: true,
      };
    }
  }

  // Fallback for unknown types
  return {
    title: String(error),
    description: undefined,
    isStructured: false,
  };
}

// Enhanced toast helper that parses structured error messages
export function showErrorToast(error: unknown, toast: any) {
  const parsed = parseErrorMessage(error);

  if (parsed.description) {
    // Use sonner's rich toast format with title and description
    toast.error(parsed.title, {
      description: parsed.description,
    });
  } else {
    // Simple error toast
    toast.error(parsed.title);
  }
}

// Helper function for API requests

export async function apiRequest<T>(
  endpoint: string,
  options: (RequestInit & { data?: any }) = {}
): Promise<T> {
  try {
    // Handle the custom 'data' property by converting it to 'body'
    const { data, ...requestOptions } = options;
    const finalOptions: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(requestOptions.headers || {}),
      },
      ...requestOptions,
    };

    // If data is provided, stringify it and set as body
    if (data !== undefined) {
      finalOptions.body = JSON.stringify(data);
    }

    const response = await httpRequest<T>(`${API_BASE}${endpoint}`, finalOptions);

    return response.data;
  } catch (err) {
    const error = err as HttpError;

    const message =
      error.response ||
      error.message ||
      "An unknown error occurred";

    throw new Error(message);
  }
}

export const getStatusColor = (status: RepoStatus): string => {
  switch (status) {
    case "imported":
      return "bg-blue-500"; // Info/primary-like
    case "mirroring":
      return "bg-yellow-400"; // In progress
    case "mirrored":
      return "bg-emerald-500"; // Success
    case "failed":
      return "bg-rose-500"; // Error
    case "syncing":
      return "bg-indigo-500"; // Sync in progress
    case "synced":
      return "bg-teal-500"; // Sync complete
    default:
      return "bg-gray-400"; // Unknown/neutral
  }
};

export const jsonResponse = ({
  data,
  status = 200,
}: {
  data: unknown;
  status?: number;
}): Response => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};
