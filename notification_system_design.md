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

# Stage 3

## Is the query accurate?

```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

The query is logically correct — it does fetch unread notifications for a specific student. But it has a few issues worth fixing:

- `SELECT *` fetches all columns including ones the frontend probably doesn't need. Better to select only the required fields.
- Column naming style (`studentID`, `isRead`, `createdAt`) uses camelCase, which is non-standard in SQL. PostgreSQL lowercases identifiers by default, so these would either fail or require quoting. Better to use snake_case (`student_id`, `is_read`, `created_at`).
- `ORDER BY createdAt ASC` returns oldest first — for a notification feed, descending order (newest first) makes more sense.

---

## Why is it slow?

With 5,000,000 rows, this query is slow because without an index on `student_id` and `is_read`, the DB has to do a **full table scan** — it reads every row to find the matching ones. That's expensive at this scale.

**Estimated cost:** At 5M rows, a full table scan means the DB engine checks all 5M rows, even though only a handful belong to student 1042. This is O(n) and gets worse as data grows.

**Fix — add a composite index:**

```sql
CREATE INDEX idx_notifications_student_unread
ON notifications(student_id, is_read);
```

With this index, the DB can jump directly to rows for `student_id = 1042` where `is_read = false`, reducing the scan to a small fraction of the table. Query cost drops significantly.

**Improved query:**

```sql
SELECT id, type, message, created_at
FROM notifications
WHERE student_id = 1042 AND is_read = false
ORDER BY created_at DESC;
```

---

## Should you add indexes on every column?

No, that's not good advice.

Indexes speed up reads but they slow down writes (INSERT, UPDATE, DELETE) because the DB has to update the index every time data changes. If you index every column:

- Every new notification insert becomes slower
- Every `is_read` update (which happens frequently) becomes slower
- Storage usage increases

You should only index columns that are actually used in `WHERE` or `ORDER BY` clauses in frequent queries. In this case, a composite index on `(student_id, is_read)` is enough. Blindly indexing everything trades one problem for another.

---

## Query: Students who got a Placement notification in the last 7 days

```sql
SELECT DISTINCT student_id
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

This returns all unique student IDs who received at least one notification with `notification_type = 'Placement'` in the past 7 days.

If you want the full notification details along with student info:

```sql
SELECT n.id, n.student_id, n.message, n.created_at
FROM notifications n
WHERE n.notification_type = 'Placement'
  AND n.created_at >= NOW() - INTERVAL '7 days'
ORDER BY n.created_at DESC;
```
---

# Stage 4

## Problem

Notifications are being fetched from the DB on every page load for every student. With 50,000 students, this means thousands of DB queries happening constantly, which is why the DB is getting overwhelmed.

---

## Solutions

### 1. Caching with Redis

The most direct fix is to cache notification results in Redis. When a student's notifications are fetched, store the result in Redis with a short TTL (e.g., 60 seconds). On the next page load, serve from cache instead of hitting the DB.

```js
const cacheKey = `notifications:${studentId}`;

// Check cache first
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Otherwise query DB
const result = await db.query(
  'SELECT id, type, message, is_read, created_at FROM notifications WHERE student_id = $1 ORDER BY created_at DESC',
  [studentId]
);

// Store in cache for 60 seconds
await redis.set(cacheKey, JSON.stringify(result.rows), 'EX', 60);
return result.rows;
```

**Tradeoff:** The data might be slightly stale (up to 60 seconds). If a new notification arrives, the student won't see it immediately until the cache expires. You can reduce this by invalidating the cache whenever a new notification is created for that user.

---

### 2. Only Fetch Unread Count on Page Load

Instead of loading all notifications on every page load, just fetch the unread count. Load the full list only when the student clicks the notification bell.

This reduces both the size and frequency of DB queries significantly.

````
// On page load — lightweight
GET /api/notifications/unread-count

// Only when bell is clicked — heavier query
GET /api/notifications
Tradeoff: Slightly more complex frontend logic (lazy loading), but a big improvement in DB load since most users don't click the bell on every visit.

3. Pagination
Instead of returning all notifications at once, return them in pages (e.g., 20 at a time). This keeps each query small regardless of how many notifications a student has.
sqlSELECT id, type, message, is_read, created_at
FROM notifications
WHERE student_id = 1042
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;  -- page 1
Tradeoff: Frontend needs to implement "load more" or infinite scroll. But the DB never has to return hundreds of rows in a single query.

4. DB Read Replicas
If the app is read-heavy (which it is — most users just view notifications, not create them), you can set up read replicas of the DB. All SELECT queries go to replicas, while writes (INSERT, UPDATE, DELETE) go to the primary.
Tradeoff: Adds infrastructure complexity and cost. There's also a small replication lag, so very recent writes might not be visible on the replica immediately. For notifications this is generally acceptable.

What I'd actually do
Start with caching (Redis) + fetch unread count on load + pagination. These three together reduce DB load significantly without adding much complexity. Read replicas would be considered only if the app continues to scale beyond what caching can handle.


Stage 5
Original Pseudocode
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message) 
        save_to_db(student_id, message) 
        push_to_app(student_id, message)

Shortcomings
1. No error handling — one failure stops everything
If send_email fails for student 500 out of 50,000, the loop crashes and the remaining 49,500 students don't get notified at all. There's no retry, no logging of which students failed, nothing.
This is exactly what happened — the email API failed at student 200, and the rest were never processed.

2. It's synchronous and slow
The loop processes one student at a time: send email → save to DB → push to app → next student. For 50,000 students, this is extremely slow. If each iteration takes even 100ms, that's 5,000 seconds (~83 minutes) to complete.

3. Email and DB are tightly coupled
If the email API is down, nothing gets saved to DB either, even though those are independent operations. DB saves and email sends should not depend on each other.

Should DB save and email send happen together?
No. They are two separate concerns:

Saving to DB is a record of the notification — it should always happen, regardless of whether the email was sent.
Sending the email is a delivery mechanism that can fail, be retried, or be skipped.

If you tie them together, a failed email means no DB record either, so the student has no in-app notification and there's no way to retry just the email later.

Redesigned Approach — Job Queue with BullMQ
Instead of processing everything synchronously in a loop, push each student's notification into a job queue. Workers pick up jobs and process them independently. Failed jobs are retried automatically.
Revised Pseudocode:

async function notify_all(student_ids, message) {
  for (const student_id of student_ids) {
    await notificationQueue.add('notify', { student_id, message });
  }
}


notificationQueue.process('notify', async (job) => {
  const { student_id, message } = job.data;


  await save_to_db(student_id, message);
  
  await push_to_app(student_id, message);

  await send_email(student_id, message);
});


const notificationQueue = new Queue('notifications', {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 }
  }
});

Why this is better

DB save always happens first — the in-app notification is stored regardless of email success.
Failed jobs are retried — if send_email fails, BullMQ retries up to 3 times with backoff. Failed jobs are logged so you can see exactly which students weren't emailed.
Fast — multiple workers can process jobs in parallel, so 50,000 notifications go out much faster than a sequential loop.
Decoupled — email failure doesn't block DB writes or in-app pushes.

Stage 6
Approach
The goal is to show the top N most important unread notifications first. Priority is based on two factors:

Type weight — Placement is more important than Result, which is more important than Event
Recency — Among notifications of the same type, newer ones should appear first

I fetch notifications from the provided API, score each one, sort by score, and return the top N.
Priority weights:
TypeWeightPlacement3Result2Event1
Recency is added as a fractional score (between 0 and 1) that decays as the notification gets older. This way type weight is the main factor, but recency breaks ties within the same type.
Score formula:
score = type_weight + (1 / (1 + age_in_hours / 24))

Code
See priority_inbox.js in the repository.

Keeping Top 10 Efficient as New Notifications Arrive
Re-fetching and re-sorting all notifications every time a new one comes in would be wasteful. Instead, when a new notification arrives (via WebSocket from Stage 1), we insert it into the existing sorted top-N list and trim to N.
This keeps the insert at O(n) instead of doing a full O(n log n) sort each time.
jsfunction insertIntoTopN(topList, newNotif, n = 10) {
  const scored = { ...newNotif, _score: getScore(newNotif) };
  topList.push(scored);
  topList.sort((a, b) => b._score - a._score);
  return topList.slice(0, n);
}
When a WebSocket event fires for a new notification, call insertIntoTopN and update the UI — no full re-fetch needed.