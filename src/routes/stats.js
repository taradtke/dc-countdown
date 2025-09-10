const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    // Return basic stats structure that the frontend expects
    const stats = {
      servers: { total: 0, completed: 0, remaining: 0 },
      vlans: { total: 0, completed: 0, remaining: 0 },
      networks: { total: 0, completed: 0, remaining: 0 },
      voiceSystems: { total: 0, completed: 0, remaining: 0 },
      coloCustomers: { total: 0, completed: 0, remaining: 0 },
      carrierCircuits: { total: 0, completed: 0, remaining: 0 },
      carrierNnis: { total: 0, completed: 0, remaining: 0 },
      publicNetworks: { total: 0, completed: 0, remaining: 0 }
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
