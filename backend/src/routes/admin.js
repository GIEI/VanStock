const express = require('express');
const fs = require('fs');
const path = require('path');
const requireAuth = require('../middleware/auth');
const { ERROR_LOG_PATH } = require('../utils/logger');

const router = express.Router();

// Admin required for these routes
router.use(requireAuth, requireAuth.requireRole('admin', 'superadmin'));

/**
 * GET /api/admin/logs
 * Returns the content of the error log file
 */
router.get('/logs', (req, res) => {
  if (!fs.existsSync(ERROR_LOG_PATH)) {
    return res.json({ logs: '', timestamp: new Date().toISOString() });
  }

  fs.readFile(ERROR_LOG_PATH, 'utf8', (err, data) => {
    if (err) {
      console.error('Failed to read logs:', err);
      return res.status(500).json({ error: 'Failed to read logs' });
    }
    // Return logs in reverse chronological order (simple block-based reverse)
    const blocks = data.split('--------------------------------------------------\n');
    // The last block is usually empty if there's a trailing delimiter
    const filteredBlocks = blocks.filter(b => b.trim().length > 0);
    const reversedLogs = filteredBlocks.reverse().join('--------------------------------------------------\n');
    
    res.json({ logs: reversedLogs, timestamp: new Date().toISOString() });
  });
});

/**
 * DELETE /api/admin/logs
 * Clears the error log file
 */
router.delete('/logs', (req, res) => {
  fs.truncate(ERROR_LOG_PATH, 0, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Failed to clear logs:', err);
      return res.status(500).json({ error: 'Failed to clear logs' });
    }
    res.status(204).send();
  });
});

module.exports = router;
