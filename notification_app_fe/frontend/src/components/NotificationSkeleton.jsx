import { Card, CardContent, Box, Skeleton } from "@mui/material";

export default function NotificationSkeleton() {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        borderLeft: "4px solid",
        borderLeftColor: "divider",
      }}
    >
      <CardContent sx={{ py: 1.5, px: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
          {/* Message lines */}
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="80%" height={18} />
            <Skeleton variant="text" width="50%" height={18} sx={{ mt: 0.5 }} />
            <Skeleton variant="text" width="30%" height={14} sx={{ mt: 0.5 }} />
          </Box>
          {/* Chip */}
          <Skeleton variant="rounded" width={64} height={20} sx={{ borderRadius: 10 }} />
        </Box>
      </CardContent>
    </Card>
  );
}

// Renders N skeleton cards — use like <SkeletonList count={5} />
export function SkeletonList({ count = 5 }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </Box>
  );
}