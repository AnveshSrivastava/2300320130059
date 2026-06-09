import {
  Card,
  CardActionArea,
  CardContent,
  Box,
  Typography,
  Chip,
} from "@mui/material";

const TYPE_CONFIG = {
  Placement: { color: "success", label: "Placement" },
  Result:    { color: "warning", label: "Result" },
  Event:     { color: "info",    label: "Event" },
};

function getRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationCard({ notification, isRead, onMarkRead, rank }) {
  const { ID, Type, Message, Timestamp } = notification;
  const typeConfig = TYPE_CONFIG[Type] || { color: "default", label: Type };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: isRead ? "divider" : "primary.main",
        borderLeft: "4px solid",
        borderLeftColor: isRead ? "divider" : "primary.main",
        bgcolor: isRead ? "background.paper" : "primary.50",
        transition: "all 0.2s ease",
        opacity: isRead ? 0.75 : 1,
        "&:hover": { boxShadow: 2, opacity: 1 },
      }}
    >
      <CardActionArea onClick={() => !isRead && onMarkRead(ID)}>
        <CardContent sx={{ py: 1.5, px: 2 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>

            {/* Left: rank (optional) + message */}
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flex: 1, minWidth: 0 }}>
              {rank != null && (
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: "text.disabled",
                    minWidth: 24,
                    pt: "2px",
                  }}
                >
                  #{rank}
                </Typography>
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  fontWeight={isRead ? 400 : 600}
                  sx={{
                    color: isRead ? "text.secondary" : "text.primary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {Message}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: "block" }}>
                  {getRelativeTime(Timestamp)}
                </Typography>
              </Box>
            </Box>

            {/* Right: type chip + unread dot */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
              <Chip
                label={typeConfig.label}
                color={typeConfig.color}
                size="small"
                sx={{ fontSize: "0.7rem", height: 20, fontWeight: 600 }}
              />
              {!isRead && (
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "primary.main",
                    mt: 0.5,
                  }}
                />
              )}
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}