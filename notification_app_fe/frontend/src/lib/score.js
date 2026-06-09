const TYPE_WEIGHT = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

/**
 * Calculate priority score for a single notification
 * Score = type_weight + recency_decay
 * Recency decay is between 0–1, higher = more recent
 */
export function getScore(notification) {
  const weight = TYPE_WEIGHT[notification.Type] || 0;

  const timestamp = new Date(notification.Timestamp).getTime();
  const ageInHours = (Date.now() - timestamp) / (1000 * 60 * 60);
  const recencyScore = 1 / (1 + ageInHours / 24);

  return weight + recencyScore;
}

/**
 * Score, sort, and return top N notifications
 * @param {Array}  notifications - raw notifications array
 * @param {number} n             - how many to return
 */
export function getTopN(notifications, n = 10) {
  return notifications
    .map((notif) => ({ ...notif, _score: getScore(notif) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, n);
}

/**
 * Insert a new notification into an existing sorted top-N list
 * without re-sorting the entire dataset — O(n) insert
 * @param {Array}  topList - current sorted top-N list (with _score)
 * @param {Object} newNotif - incoming notification
 * @param {number} n        - max list size
 */
export function insertIntoTopN(topList, newNotif, n = 10) {
  const scored = { ...newNotif, _score: getScore(newNotif) };
  const updated = [...topList, scored].sort((a, b) => b._score - a._score);
  return updated.slice(0, n);
}