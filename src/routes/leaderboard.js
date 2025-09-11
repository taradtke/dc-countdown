const express = require('express');
const router = express.Router();

// Leaderboard endpoint - public for dashboard display
router.get('/', async (req, res) => {
  try {
    // For now, return empty leaderboard data
    // In production, this would aggregate completion data by engineer
    const leaderboard = [];
    
    res.json(leaderboard);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

module.exports = router;