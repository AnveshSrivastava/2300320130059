# Stage1 - Notification Platform API Design & Logging Middleware

## Overview

The objective of this stage is to design the API contract for a notification platform that allows users to receive, view, and manage notifications after authentication. Along with the API design, a reusable logging middleware is proposed to track important events occurring throughout the notification lifecycle.

The design focuses on:

* Clear API contracts between frontend and backend
* Consistent request and response formats
* Real-time notification delivery
* Centralized logging and observability
* Extensibility for future notification types

---

## Core Features

The notification platform should support the following actions:

1. Create a notification
2. Fetch notifications for a logged-in user
3. Fetch unread notification count
4. Mark a notification as read
5. Mark all notifications as read
6. Delete a notification
7. Receive notifications in real time
8. Track notification-related events through logs

---

## Authentication

All notification APIs require an authenticated user.

### Request Headers

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## Notification Schema

```json
{
  "id": "notif_12345",
  "userId": "user_1001",
  "title": "New Message",
  "message": "John sent you a message",
  "type": "MESSAGE",
  "status": "UNREAD",
  "createdAt": "2026-06-09T10:00:00Z",
  "readAt": null
}
```

### Status Values

* UNREAD
* READ

### Notification Types

* MESSAGE
* SYSTEM
* ALERT
* PROMOTION

---

# API Endpoints

## 1. Create Notification

Creates a notification for a specific user.

### Endpoint

```http
POST /api/v1/notifications
```

### Request Body

```json
{
  "userId": "user_1001",
  "title": "New Message",
  "message": "John sent you a message",
  "type": "MESSAGE"
}
```

### Response

```json
{
  "success": true,
  "notificationId": "notif_12345"
}
```

---

## 2. Get Notifications

Returns notifications belonging to the authenticated user.

### Endpoint

```http
GET /api/v1/notifications?page=0&size=20
```

### Response

```json
{
  "success": true,
  "data": [
    {
      "id": "notif_12345",
      "title": "New Message",
      "message": "John sent you a message",
      "status": "UNREAD",
      "createdAt": "2026-06-09T10:00:00Z"
    }
  ]
}
```

---

## 3. Get Unread Count

Returns the number of unread notifications.

### Endpoint

```http
GET /api/v1/notifications/unread-count
```

### Response

```json
{
  "success": true,
  "count": 5
}
```

---

## 4. Mark Notification as Read

Updates a notification's status.

### Endpoint

```http
PATCH /api/v1/notifications/{notificationId}/read
```

### Response

```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

## 5. Mark All Notifications as Read

Marks every unread notification as read.

### Endpoint

```http
PATCH /api/v1/notifications/read-all
```

### Response

```json
{
  "success": true,
  "updatedCount": 12
}
```

---

## 6. Delete Notification

Removes a notification from the user's notification list.

### Endpoint

```http
DELETE /api/v1/notifications/{notificationId}
```

### Response

```json
{
  "success": true,
  "message": "Notification deleted successfully"
}
```

---

## Standard Error Response

All endpoints should return errors in a common format.

```json
{
  "success": false,
  "message": "Notification not found"
}
```

---

# Real-Time Notification Delivery

Polling the server every few seconds is inefficient and generates unnecessary traffic. To provide instant updates, the system uses WebSockets.

### Connection

```text
ws://<host>/ws/notifications
```

### Flow

```text
User Login
    |
    v
WebSocket Connection Established
    |
    v
Notification Created
    |
    v
Server Pushes Event
    |
    v
Frontend Updates Notification Bell and Notification List
```

### Example Server Event

```json
{
  "event": "NEW_NOTIFICATION",
  "data": {
    "id": "notif_12345",
    "title": "New Message",
    "message": "John sent you a message"
  }
}
```

This removes the need for page refreshes and provides a better user experience.

---

# Logging Middleware

## Purpose

The logging middleware is responsible for capturing significant application events and maintaining a narrative of system execution.

The logs should help answer:

* What happened?
* Where did it happen?
* Was it successful?
* If it failed, why?

---

## Log Function

```javascript
Log(stack, level, packageName, message)
```

### Parameters

| Parameter   | Description                         |
| ----------- | ----------------------------------- |
| stack       | frontend / backend                  |
| level       | INFO / WARN / ERROR / DEBUG         |
| packageName | Module generating the log           |
| message     | Contextual description of the event |

---

## Sample Log Entries

### Notification Created

```javascript
Log(
  "backend",
  "INFO",
  "notification-service",
  "Notification created for user user_1001"
);
```

### Notification Delivered

```javascript
Log(
  "backend",
  "INFO",
  "notification-websocket",
  "Notification notif_12345 delivered through active websocket connection"
);
```

### Notification Read

```javascript
Log(
  "backend",
  "INFO",
  "notification-service",
  "Notification notif_12345 marked as read"
);
```

### Delivery Failure

```javascript
Log(
  "backend",
  "ERROR",
  "notification-service",
  "Failed to deliver notification notif_12345 due to disconnected websocket session"
);
```

---

## Request Logging Middleware

```javascript
export const requestLogger = (req, res, next) => {

    const startTime = Date.now();

    Log(
        "backend",
        "INFO",
        "notification-api",
        `${req.method} ${req.originalUrl} request received`
    );

    res.on("finish", () => {
        Log(
            "backend",
            "INFO",
            "notification-api",
            `${req.method} ${req.originalUrl} completed with status ${res.statusCode} in ${Date.now() - startTime}ms`
        );
    });

    next();
};
```

This middleware can be attached globally so that every incoming request is automatically tracked.

---

## Project Structure

```text
notification-platform/
|
├── controllers/
├── services/
├── repositories/
├── routes/
├── websocket/
|
├── middleware/
│   └── logging/
│       ├── logger.js
│       ├── requestLogger.js
│       └── constants.js
|
└── README.md
```

---

## Assumptions

* Users are authenticated using JWT tokens.
* Notifications are user-specific.
* Notification retrieval supports pagination.
* WebSockets are available for real-time communication.
* All notification-related events are logged for monitoring and debugging purposes.
