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

