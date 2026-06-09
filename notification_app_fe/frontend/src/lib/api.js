const BASE_URL = "http://4.224.186.213/evaluation-service/notifications";
const AUTH_TOKEN = "your-token-here";

const defaultHeaders = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${AUTH_TOKEN}`,
};

import { Log, LOG_LEVEL } from "./logger.js";

export async function fetchNotifications({ page = 1, limit = 10, notification_type = "" } = {}) {
  const params = new URLSearchParams();
  params.set("page", page);
  params.set("limit", limit);
  if (notification_type) params.set("notification_type", notification_type);

  const url = `${BASE_URL}?${params.toString()}`;

  await Log("frontend", LOG_LEVEL.INFO, "api", `Fetching notifications - page:${page} limit:${limit} type:${notification_type || "all"}`);

  const response = await fetch(url, { headers: defaultHeaders });

  if (!response.ok) {
    await Log("frontend", LOG_LEVEL.ERROR, "api", `Failed to fetch notifications - status:${response.status}`);
    throw new Error(`Failed to fetch notifications (${response.status})`);
  }

  await Log("frontend", LOG_LEVEL.INFO, "api", `Notifications fetched successfully - page:${page}`);

  const data = await response.json();
  return data;
}

export async function fetchAllNotifications() {
  await Log("frontend", LOG_LEVEL.INFO, "api", "Fetching all notifications for priority scoring");

  const response = await fetch(BASE_URL, { headers: defaultHeaders });

  if (!response.ok) {
    await Log("frontend", LOG_LEVEL.ERROR, "api", `Failed to fetch all notifications - status:${response.status}`);
    throw new Error(`Failed to fetch notifications (${response.status})`);
  }

  await Log("frontend", LOG_LEVEL.INFO, "api", "All notifications fetched successfully");

  const data = await response.json();
  return data.notifications || [];
}