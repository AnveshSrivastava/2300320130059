import { Log } from "./logger.js";

export const requestLogger = (req, res, next) => {

    Log(
        "backend",
        "INFO",
        "request-middleware",
        `${req.method} ${req.originalUrl} request received`
    );

    next();
};