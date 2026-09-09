const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', '..', 'logs');
const ERROR_LOG_PATH = path.join(LOGS_DIR, 'error.log');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * Filter sensitive keys from an object
 */
function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const sensitiveKeys = ['password', 'token', 'secret', 'key'];
  const sanitized = { ...obj };
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '********';
    }
  }
  return sanitized;
}

/**
 * Logs an error or anomalous response to logs/error.log
 * @param {Error|string|object} err 
 * @param {object} req - Express request
 * @param {number} statusCode - HTTP status code
 */
function logError(err, req = null, statusCode = 500) {
  const timestamp = new Date().toISOString();
  let message = '';
  let stack = '';

  if (err instanceof Error) {
    message = err.message;
    stack = err.stack;
  } else if (typeof err === 'object') {
    message = JSON.stringify(err);
  } else {
    message = String(err);
  }

  const type = statusCode >= 500 ? 'SYSTEM_ERROR' : 'API_ERROR';
  let logEntry = `[${timestamp}] ${type} (${statusCode}): ${message}\n`;
  
  if (req) {
    logEntry += `  Request: ${req.method} ${req.originalUrl}\n`;
    if (Object.keys(req.body || {}).length > 0) {
      logEntry += `  Body: ${JSON.stringify(sanitize(req.body))}\n`;
    }
    if (req.user) {
      logEntry += `  User: ${req.user.email} (ID: ${req.user.id}, Role: ${req.user.role}, CID: ${req.user.company_id})\n`;
    }
  }
  
  if (stack && statusCode >= 500) {
    // Only log stack for 5xx errors to keep log clean
    logEntry += `  Stack: ${stack.split('\n').slice(0, 3).join('\n')}\n`;
  }

  logEntry += '--------------------------------------------------\n';

  fs.appendFile(ERROR_LOG_PATH, logEntry, (appendErr) => {
    if (appendErr) {
      console.error('Failed to write to error log:', appendErr);
    }
  });
}

module.exports = {
  logError,
  ERROR_LOG_PATH
};
