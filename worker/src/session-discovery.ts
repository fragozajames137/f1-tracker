import { log, logError } from "./utils.js";

const SESSION_INFO_URL =
  "https://livetiming.formula1.com/static/SessionInfo.json";

interface SessionInfoResponse {
  Key?: number;
  Type?: string;
  Name?: string;
  StartDate?: string;
  EndDate?: string;
  Path?: string;
  Meeting?: {
    Key?: number;
    Name?: string;
  };
  ArchiveStatus?: {
    Status?: string; // "Complete" when session is over
  };
}

export interface DiscoveredSession {
  sessionKey: number;
  type: string;
  name: string;
  startDate: string;
  endDate: string;
  isComplete: boolean;
}

/**
 * Check if there's a live (or recent) session by hitting F1's static endpoint.
 * Returns session info if found, null otherwise.
 */
export async function discoverLiveSession(): Promise<DiscoveredSession | null> {
  try {
    const res = await fetch(SESSION_INFO_URL, {
      headers: { "User-Agent": "BestHTTP" },
    });

    if (!res.ok) {
      log(`SessionInfo fetch returned ${res.status}`);
      return null;
    }

    const info: SessionInfoResponse = await res.json();

    if (!info.Key) {
      log("No session key in SessionInfo");
      return null;
    }

    const isComplete = info.ArchiveStatus?.Status === "Complete";

    return {
      sessionKey: info.Key,
      type: info.Type ?? "",
      name: info.Name ?? "",
      startDate: info.StartDate ?? "",
      endDate: info.EndDate ?? "",
      isComplete,
    };
  } catch (err) {
    logError("Failed to discover live session:", err);
    return null;
  }
}
