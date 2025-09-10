const express = require('express');
const router = express.Router();
const authService = require('../services/AuthService');
const { authenticate } = require('../middleware/auth');
const config = require('../config');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message || 'Authentication failed' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // Only allow registration if auth is enabled and user is admin
    if (!config.features.auth) {
      return res.status(403).json({ error: 'Registration is disabled' });
    }

    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const result = await authService.refreshToken(refreshToken);
    res.json(result);
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ error: error.message || 'Token refresh failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await authService.logout(req.user.id);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/verify
router.get('/verify', authenticate, async (req, res) => {
  try {
    // If we get here, the token is valid (authenticate middleware passed)
    res.json({ 
      valid: true, 
      user: req.user 
    });
  } catch (error) {
    res.status(401).json({ valid: false });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    await authService.changePassword(req.user.id, oldPassword, newPassword);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(400).json({ error: error.message || 'Password change failed' });
  }
});

// POST /api/auth/reset-password (admin only)
router.post('/reset-password', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Email and new password are required' });
    }

    await authService.resetPassword(email, newPassword);
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(400).json({ error: error.message || 'Password reset failed' });
  }
});

module.exports = router;