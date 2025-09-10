const express = require('express');
const router = express.Router();

// TODO: Implement networks routes

router.get('/', (req, res) => {
  res.json({ message: 'networks routes not yet implemented' });
});

module.exports = router;
