Stage 1
Core Actions the Notification Platform Should Support

Fetch all notifications for a logged-in user
Mark a notification as read (single or all)
Delete a notification
Create a new notification (triggered by backend events)
Get count of unread notifications


REST API Endpoints
1. Get All Notifications
GET /api/notifications
Headers:
Authorization: Bearer <token>
Content-Type: application/json
Response:
json{
  "success": true,
  "data": [
    {
      "id": "notif_101",
      "type": "alert",
      "message": "Your file has been processed.",
      "is_read": false,
      "created_at": "2024-06-09T10:30:00Z"
    },
    {
      "id": "notif_102",
      "type": "info",
      "message": "New login from a new device.",
      "is_read": true,
      "created_at": "2024-06-08T08:00:00Z"
    }
  ]
}

2. Get Unread Notification Count
GET /api/notifications/unread-count
Headers:
Authorization: Bearer <token>
Response:
json{
  "success": true,
  "unread_count": 3
}

3. Create a Notification (Internal/Backend use)
POST /api/notifications
Headers:
Authorization: Bearer <service-token>
Content-Type: application/json
Request Body:
json{
  "user_id": "user_55",
  "type": "alert",
  "message": "Your password was changed successfully."
}
Response:
json{
  "success": true,
  "data": {
    "id": "notif_103",
    "user_id": "user_55",
    "type": "alert",
    "message": "Your password was changed successfully.",
    "is_read": false,
    "created_at": "2024-06-09T11:00:00Z"
  }
}

4. Mark a Notification as Read
PATCH /api/notifications/:id/read
Headers:
Authorization: Bearer <token>
Response:
json{
  "success": true,
  "message": "Notification marked as read."
}

5. Mark All Notifications as Read
PATCH /api/notifications/read-all
Headers:
Authorization: Bearer <token>
Response:
json{
  "success": true,
  "message": "All notifications marked as read."
}

6. Delete a Notification
DELETE /api/notifications/:id
Headers:
Authorization: Bearer <token>
Response:
json{
  "success": true,
  "message": "Notification deleted."
}

Real-Time Notifications using WebSockets
For showing live notifications without the user having to refresh the page, I'm using WebSockets. When a user logs in, the frontend opens a WebSocket connection to the server. Whenever a new notification is created for that user, the server pushes it directly to the connected client.
Flow:

User logs in → frontend connects to ws://yourapp.com/ws?token=<jwt>
Server authenticates the token and maps the socket to that user
When a new notification is triggered (e.g., from a POST /api/notifications), the server emits the event to the matching socket
Frontend receives the event and updates the notification bell in real time

Stage 2
DB Choice
I'd go with PostgreSQL (relational/SQL) for storing notifications.
Why PostgreSQL:

Notifications have a fixed, predictable structure (user_id, message, type, is_read, timestamp), so a relational schema fits naturally.
We need queries like "fetch all unread notifications for a user" or "mark all as read for user X" — these are straightforward with SQL.
PostgreSQL handles concurrent reads/writes well and supports indexing, which matters as data grows.

A NoSQL option like MongoDB could also work, but there's no real benefit here since the data isn't document-heavy or schema-flexible. SQL is simpler and more reliable for this use case.

DB Schema
sqlCREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,        -- e.g. 'alert', 'info', 'warning'
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index to speed up per-user queries
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);

Problems at Scale and How to Solve Them
1. Table gets too large over time
If the app has millions of users and each generates dozens of notifications, the notifications table will grow very fast. Old read notifications don't need to be kept forever.
Fix: Add a background job (cron) that deletes notifications older than 30-60 days that are already marked as read.
sqlDELETE FROM notifications
WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '30 days';
2. Slow queries as rows increase
Without indexes, fetching all notifications for a user means scanning the whole table.
Fix: The indexes defined in the schema above (user_id, user_id + is_read) handle this. For very large scale, table partitioning by user_id or date range is an option.
3. High write load
If many events trigger notifications at the same time (e.g., a bulk email campaign), the DB can get overwhelmed with inserts.
Fix: Use a message queue (like Redis or BullMQ) to buffer the inserts and process them asynchronously instead of writing directly on every event.

Sample Queries
Get all notifications for a user:
sqlSELECT id, type, message, is_read, created_at
FROM notifications
WHERE user_id = 55
ORDER BY created_at DESC;
Get only unread notifications:
sqlSELECT id, type, message, created_at
FROM notifications
WHERE user_id = 55 AND is_read = FALSE
ORDER BY created_at DESC;
Get unread count:
sqlSELECT COUNT(*) AS unread_count
FROM notifications
WHERE user_id = 55 AND is_read = FALSE;
Mark a single notification as read:
sqlUPDATE notifications
SET is_read = TRUE
WHERE id = 101 AND user_id = 55;
Mark all notifications as read for a user:
sqlUPDATE notifications
SET is_read = TRUE
WHERE user_id = 55 AND is_read = FALSE;
Delete a notification:
sqlDELETE FROM notifications
WHERE id = 101 AND user_id = 55;