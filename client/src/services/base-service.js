import axios from "axios";
import { getSession } from "next-auth/react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  "http://localhost:5000";

const AUTH_SESSION_TTL_MS = 30 * 1000;
let cachedSession = null;
let cachedSessionAt = 0;
let pendingSession = null;

export async function getAuthSession({ force = false } = {}) {
  const now = Date.now();

  if (
    !force &&
    cachedSession?.idToken &&
    !cachedSession.error &&
    now - cachedSessionAt < AUTH_SESSION_TTL_MS
  ) {
    return cachedSession;
  }

  if (!force && pendingSession) return pendingSession;

  pendingSession = getSession()
    .then((session) => {
      if (session?.idToken && !session.error) {
        cachedSession = session;
        cachedSessionAt = Date.now();
      } else {
        cachedSession = null;
        cachedSessionAt = 0;
      }

      return session;
    })
    .finally(() => {
      pendingSession = null;
    });

  return pendingSession;
}

export async function fetchWithAuth(endpoint, options = {}) {
  const session = await getAuthSession();

  if (!session || session.error || !session.idToken) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await axios({
      url: `${API_URL}${endpoint}`,
      method: options.method || "GET",
      headers: {
        Authorization: `Bearer ${session.idToken}`,
        ...options.headers,
      },
      data: options.body,
      params: options.params,
    });

    return response.data;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      "Api request failed";

    throw new Error(message);
  }
}
