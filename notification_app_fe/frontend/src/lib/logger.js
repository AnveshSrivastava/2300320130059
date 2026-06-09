const LOG_API = "http://localhost:3000/log";

export async function Log(stack, level, packageName, message) {
  try {
    await fetch(LOG_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        stack,
        level,
        package: packageName,
        message,
      }),
    });
  } catch (err) {
    // Fail silently — logging should never break the app
  }
}

export const LOG_LEVEL = {
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
  DEBUG: "DEBUG",
};