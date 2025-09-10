const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');
const crypto = require('crypto');
const emailService = require('../services/EmailService');
const config = require('../config');

// Initialize model
const userModel = new User();

// Get all users (admin only)
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const users = await userModel.findAll({}, { orderBy: 'created_at DESC' });
    // Remove passwords from response
    users.forEach(user => delete user.password);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Users can view their own profile, admins can view any
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const user = await userModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    delete user.password;
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user (admin only)
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  try {
    // Generate temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    
    const userData = {
      ...req.body,
      password: tempPassword,
      created_by: req.user.id
    };

    const user = await userModel.create(userData);
    delete user.password;

    // Send invitation email if email is enabled
    if (config.email.enabled && req.body.send_invite) {
      await emailService.sendUserInvitation(user.email, {
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        tempPassword: tempPassword,
        loginUrl: `${config.app.baseUrl}/login.html`
      });
    }

    res.status(201).json({ 
      user,
      tempPassword: req.body.send_invite ? null : tempPassword // Only return password if not emailed
    });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Users can update their own profile (limited fields), admins can update any
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const allowedFields = req.user.role === 'admin' 
      ? ['email', 'first_name', 'last_name', 'role', 'is_engineer', 'is_active']
      : ['first_name', 'last_name', 'email'];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const user = await userModel.update(req.params.id, updateData);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    delete user.password;
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Reset user password (admin only)
router.post('/:id/reset-password', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const user = await userModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    await userModel.resetPassword(user.id, tempPassword);

    // Send password reset email if enabled
    if (config.email.enabled && req.body.send_email !== false) {
      await emailService.sendPasswordReset(user.email, {
        firstName: user.first_name,
        tempPassword: tempPassword,
        loginUrl: `${config.app.baseUrl}/login.html`
      });
    }

    res.json({ 
      message: 'Password reset successfully',
      tempPassword: req.body.send_email === false ? tempPassword : null
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Change own password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords required' });
    }

    const user = await userModel.authenticate(req.user.email, currentPassword);
    if (!user) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    await userModel.changePassword(req.user.id, newPassword);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Delete user (admin only)
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const deleted = await userModel.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get engineers list
router.get('/engineers/list', authenticate, async (req, res) => {
  try {
    const engineers = await userModel.getEngineers();
    res.json(engineers);
  } catch (error) {
    console.error('Error fetching engineers:', error);
    res.status(500).json({ error: 'Failed to fetch engineers' });
  }
});

module.exports = router;