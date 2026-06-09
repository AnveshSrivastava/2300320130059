import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Button,
  Stack,
  Divider,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import NotificationCard from "../components/NotificationCard";
import { SkeletonList } from "../components/NotificationSkeleton";
import { fetchAllNotifications } from "../lib/api";
import { getTopN } from "../lib/score";

const N_OPTIONS = [10, 15, 20];

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

export default function PriorityInbox() {
  const [topNotifs, setTopNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [n, setN] = useState(10);
  const [readIds, setReadIds] = useState(getReadIds);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchAllNotifications();
      const top = getTopN(all, n);
      setTopNotifs(top);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [n]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMarkRead = (id) => {
    const updated = new Set(readIds);
    updated.add(id);
    setReadIds(updated);
    saveReadIds(updated);
  };

  const handleNChange = (e) => {
    setN(e.target.value);
  };

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <EmojiEventsIcon color="warning" />
          <Typography variant="h5" fontWeight={700}>
            Priority Inbox
          </Typography>
        </Box>

        {/* N selector */}
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="n-select-label">Show top</InputLabel>
          <Select
            labelId="n-select-label"
            value={n}
            label="Show top"
            onChange={handleNChange}
          >
            {N_OPTIONS.map((val) => (
              <MenuItem key={val} value={val}>
                Top {val}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ranked by type importance (Placement &gt; Result &gt; Event) and recency.
      </Typography>

      <Divider sx={{ mb: 2 }} />

      {/* States */}
      {loading && <SkeletonList count={n} />}

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

      {!loading && !error && topNotifs.length === 0 && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography color="text.secondary">No notifications to show.</Typography>
        </Box>
      )}

      {/* Ranked list */}
      {!loading && !error && topNotifs.length > 0 && (
        <Stack spacing={1.5}>
          {topNotifs.map((notif, index) => (
            <NotificationCard
              key={notif.ID}
              notification={notif}
              isRead={readIds.has(notif.ID)}
              onMarkRead={handleMarkRead}
              rank={index + 1}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}