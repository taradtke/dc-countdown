const express = require('express');
const router = express.Router();

// TODO: Implement publicNetworks routes

router.get('/', (req, res) => {
  res.json({ message: 'publicNetworks routes not yet implemented' });
});

module.exports = router;
