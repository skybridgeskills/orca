// Notification throttle + message retention windows.
export const REVIEW_NOTIFY_THROTTLE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
// Report fan-out throttle: at most one report-notification email per (recipient org,
// user, type) per window. 1 day keeps a busy moderator's inbox from being flooded by a
// burst of reports while still surfacing fresh activity daily.
export const REPORT_NOTIFY_THROTTLE_MS = 24 * 60 * 60 * 1000; // 1 day
export const MESSAGE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
