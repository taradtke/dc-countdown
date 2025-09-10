const express = require('express');
const router = express.Router();
const CriticalItem = require('../models/CriticalItem');
const { authenticate, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

// Initialize model
const criticalItemModel = new CriticalItem();

// Get all critical items
router.get('/', authenticate, async (req, res) => {
    try {
        const items = await criticalItemModel.findAll();
        res.json(items);
    } catch (error) {
        logger.error('Error fetching critical items:', error);
        res.status(500).json({ error: 'Failed to fetch critical items' });
    }
});

// Get single critical item
router.get('/:id', authenticate, async (req, res) => {
    try {
        const item = await criticalItemModel.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Critical item not found' });
        }
        res.json(item);
    } catch (error) {
        logger.error('Error fetching critical item:', error);
        res.status(500).json({ error: 'Failed to fetch critical item' });
    }
});

// Create critical item
router.post('/', authenticate, async (req, res) => {
    try {
        const item = await criticalItemModel.create(req.body);
        logger.info(`Critical item created: ${item.title} by user ${req.user.id}`);
        res.status(201).json(item);
    } catch (error) {
        logger.error('Error creating critical item:', error);
        res.status(500).json({ error: 'Failed to create critical item' });
    }
});

// Update critical item
router.put('/:id', authenticate, async (req, res) => {
    try {
        const updated = await criticalItemModel.update(req.params.id, req.body);
        if (!updated) {
            return res.status(404).json({ error: 'Critical item not found' });
        }
        logger.info(`Critical item ${req.params.id} updated by user ${req.user.id}`);
        res.json(updated);
    } catch (error) {
        logger.error('Error updating critical item:', error);
        res.status(500).json({ error: 'Failed to update critical item' });
    }
});

// Delete critical item (admin and manager only)
router.delete('/:id', authenticate, async (req, res) => {
    // Check if user has admin or manager role
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    try {
        const deleted = await criticalItemModel.delete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Critical item not found' });
        }
        logger.info(`Critical item ${req.params.id} deleted by user ${req.user.id}`);
        res.json({ message: 'Critical item deleted successfully' });
    } catch (error) {
        logger.error('Error deleting critical item:', error);
        res.status(500).json({ error: 'Failed to delete critical item' });
    }
});

module.exports = router;