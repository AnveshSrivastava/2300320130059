import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Pagination,
  Alert,
  Button,
  Stack,
  Chip,
} from "@mui/material";
import NotificationCard from "../components/NotificationCard";
import { SkeletonList } from "../components/NotificationSkeleton";
import { fetchNotifications } from "../lib/api";

const FILTER_TABS = ["All", "Placement", "Result", "Event"];
const ITEMS_PER_PAGE = 10;

function getReadIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem("readNotifIds") || "[]"));
  } catch {
    return new Set();
  }
}

function saveReadIds(set) {
  localStorage.setItem("readNotifIds", JSON.stringify([...set]));
}

export default function AllNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [readIds, setReadIds] = useState(getReadIds);

  const selectedType = FILTER_TABS[activeTab] === "All" ? "" : FILTER_TABS[activeTab];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchNotifications({
        page,
        limit: ITEMS_PER_PAGE,
        notification_type: selectedType,
      });
      const notifs = data.notifications || [];
      setNotifications(notifs);
      // If API returns total count use it, otherwise estimate
      const total = data.total || data.totalCount || notifs.length;
      setTotalPages(Math.max(1, Math.ceil(total / ITEMS_PER_PAGE)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, selectedType]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 when tab changes
  const handleTabChange = (_, newVal) => {
    setActiveTab(newVal);
    setPage(1);
  };

  const handleMarkRead = (id) => {
    const updated = new Set(readIds);
    updated.add(id);
    setReadIds(updated);
    saveReadIds(updated);
  };

  const unreadCount = notifications.filter((n) => !readIds.has(n.ID)).length;

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h5" fontWeight={700}>
          Notifications
        </Typography>
        {unreadCount > 0 && (
          <Chip label={`${unreadCount} unread`} color="primary" size="small" />
        )}
      </Box>

      {/* Filter Tabs */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        {FILTER_TABS.map((label) => (
          <Tab
            key={label}
            label={label}
            sx={{ textTransform: "none", fontWeight: 500 }}
          />
        ))}
      </Tabs>

      {/* States */}
      {loading && <SkeletonList count={ITEMS_PER_PAGE} />}

      {error && !loading && (
        <Alert
          severity="error"
          action={
            <Button size="small" onClick={load} color="inherit">
              Retry
            </Button>
          }
          sx={{ mb: 2 }}
        >
          {error}
        </Alert>
      )}

      {!loading && !error && notifications.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography color="text.secondary">No notifications found.</Typography>
        </Box>
      )}

      {/* Notification list */}
      {!loading && !error && notifications.length > 0 && (
        <Stack spacing={1.5}>
          {notifications.map((notif) => (
            <NotificationCard
              key={notif.ID}
              notification={notif}
              isRead={readIds.has(notif.ID)}
              onMarkRead={handleMarkRead}
            />
          ))}
        </Stack>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, val) => setPage(val)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Box>
  );
}