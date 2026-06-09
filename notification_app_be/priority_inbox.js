
const API_URL = "http://4.224.186.213/evaluation-service/notifications";

const TYPE_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

function getScore(notification) {
  const weight = TYPE_WEIGHT[notification.Type] || 0;
  const timestamp = new Date(notification.Timestamp).getTime();
  const now = Date.now();
  const ageInHours = (now - timestamp) / (1000 * 60 * 60);
  const recencyScore = 1 / (1 + ageInHours / 24);
  return weight + recencyScore;
}

async function getTopNotifications(n = 10) {
  const response = await fetch(API_URL, {
    headers: {
        Authorization: "Bearer <tocken>"
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch notifications: ${response.status}`);
  }

  const data = await response.json();
  const notifications = data.notifications;


  const scored = notifications.map((notif) => ({
    ...notif,
    _score: getScore(notif),
  }));

  scored.sort((a, b) => b._score - a._score);

  return scored.slice(0, n).map(({ _score, ...notif }) => notif);
}

// How we keep top 10 efficient as new notifications come in:
// Instead of re-fetching and re-sorting all notifications every time,
// we maintain a sorted list and insert new notifications in the right position.
// This is O(n) insert instead of O(n log n) full sort each time.

function insertIntoTopN(topList, newNotif, n = 10) {
  const scored = { ...newNotif, _score: getScore(newNotif) };
  topList.push(scored);
  topList.sort((a, b) => b._score - a._score);
  return topList.slice(0, n);
}

// Example usage
(async () => {
  try {
    const top10 = await getTopNotifications(10);
    console.log("Top 10 Priority Notifications:");
    console.log(JSON.stringify(top10, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
})();

module.exports = { getTopNotifications, insertIntoTopN };