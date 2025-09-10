const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const { requireRole, requirePermission } = require('../middleware/auth');
const Server = require('../models/Server');
const emailService = require('../services/EmailService');

const upload = multer({ dest: 'uploads/' });
const serverModel = new Server();

// GET all servers
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      search, 
      engineer,
      wave,
      status 
    } = req.query;

    let conditions = {};
    
    if (engineer) conditions.assigned_engineer = engineer;
    if (wave) conditions.migration_wave = wave;
    
    if (status === 'completed') {
      conditions.customer_notified_successful_cutover = 1;
    } else if (status === 'pending') {
      conditions.customer_notified_successful_cutover = 0;
    }

    let result;
    if (search) {
      result = await serverModel.searchServers(search);
    } else if (page && limit) {
      result = await serverModel.paginate(page, limit, conditions);
    } else {
      const servers = await serverModel.findAll(conditions);
      result = { items: servers };
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching servers:', error);
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

// GET server by ID
router.get('/:id', async (req, res) => {
  try {
    const server = await serverModel.findById(req.params.id);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    res.json(server);
  } catch (error) {
    console.error('Error fetching server:', error);
    res.status(500).json({ error: 'Failed to fetch server' });
  }
});

// POST create new server
router.post('/', requirePermission('edit_all'), async (req, res) => {
  try {
    const server = await serverModel.create(req.body);
    res.status(201).json(server);
  } catch (error) {
    console.error('Error creating server:', error);
    res.status(500).json({ error: 'Failed to create server' });
  }
});

// PUT update server
router.put('/:id', requirePermission('edit_all'), async (req, res) => {
  try {
    const { id } = req.params;
    const originalServer = await serverModel.findById(id);
    
    if (!originalServer) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const updatedServer = await serverModel.update(id, req.body);

    // Check if server was just completed
    if (!originalServer.customer_notified_successful_cutover && 
        updatedServer.customer_notified_successful_cutover) {
      // Send completion notification
      await emailService.sendCompletionNotification(
        updatedServer, 
        'server', 
        req.user
      );
    }

    res.json(updatedServer);
  } catch (error) {
    console.error('Error updating server:', error);
    res.status(500).json({ error: 'Failed to update server' });
  }
});

// DELETE server
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const success = await serverModel.delete(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    res.json({ message: 'Server deleted successfully' });
  } catch (error) {
    console.error('Error deleting server:', error);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

// POST import servers from CSV
router.post('/import', upload.single('file'), requireRole('manager'), async (req, res) => {
  const filePath = req.file?.path;
  
  if (!filePath) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const data = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on('data', (row) => data.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    const servers = await serverModel.importFromCSV(data);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({ 
      message: 'Import successful', 
      count: servers.length 
    });
  } catch (error) {
    console.error('Error importing servers:', error);
    if (filePath) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to import servers' });
  }
});

// GET export servers to CSV
router.get('/export/csv', async (req, res) => {
  try {
    const servers = await serverModel.exportToCSV();
    
    // Convert to CSV string
    const headers = Object.keys(servers[0] || {});
    const csvContent = [
      headers.join(','),
      ...servers.map(server => 
        headers.map(header => {
          const value = server[header];
          // Escape commas and quotes in values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="servers-export.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting servers:', error);
    res.status(500).json({ error: 'Failed to export servers' });
  }
});

// GET server statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await serverModel.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching server stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET upcoming migrations
router.get('/upcoming/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 7;
    const upcoming = await serverModel.getUpcoming(days);
    res.json(upcoming);
  } catch (error) {
    console.error('Error fetching upcoming migrations:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming migrations' });
  }
});

// POST mark server as completed
router.post('/:id/complete', requirePermission('edit_all'), async (req, res) => {
  try {
    const server = await serverModel.markAsCompleted(req.params.id);
    
    // Send completion notification
    await emailService.sendCompletionNotification(
      server, 
      'server', 
      req.user
    );
    
    res.json(server);
  } catch (error) {
    console.error('Error completing server:', error);
    res.status(500).json({ error: 'Failed to complete server' });
  }
});

// POST assign engineer
router.post('/:id/assign', requirePermission('assign_engineers'), async (req, res) => {
  try {
    const { engineer } = req.body;
    
    if (!engineer) {
      return res.status(400).json({ error: 'Engineer name required' });
    }
    
    const server = await serverModel.assignEngineer(req.params.id, engineer);
    res.json(server);
  } catch (error) {
    console.error('Error assigning engineer:', error);
    res.status(500).json({ error: 'Failed to assign engineer' });
  }
});

module.exports = router;