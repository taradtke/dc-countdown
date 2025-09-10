const express = require('express');
const router = express.Router();

// TODO: Implement stats routes

router.get('/', (req, res) => {
  res.json({ message: 'stats routes not yet implemented' });
});

module.exports = router;
