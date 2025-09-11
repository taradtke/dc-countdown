const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const { requirePermission, requireRole } = require('../middleware/auth');
const Network = require('../models/Network');

const upload = multer({ dest: 'uploads/' });
const networkModel = new Network();

// GET all networks
router.get('/', async (req, res) => {
  try {
    const networks = await networkModel.findAll();
    res.json(networks);
  } catch (error) {
    console.error('Error fetching networks:', error);
    res.status(500).json({ error: 'Failed to fetch networks' });
  }
});

// GET network by ID
router.get('/:id', async (req, res) => {
  try {
    const network = await networkModel.findById(req.params.id);
    if (!network) {
      return res.status(404).json({ error: 'Network not found' });
    }
    res.json(network);
  } catch (error) {
    console.error('Error fetching network:', error);
    res.status(500).json({ error: 'Failed to fetch network' });
  }
});

// POST create new network
router.post('/', requirePermission('edit_all'), async (req, res) => {
  try {
    const network = await networkModel.create(req.body);
    res.status(201).json(network);
  } catch (error) {
    console.error('Error creating network:', error);
    res.status(500).json({ error: 'Failed to create network' });
  }
});

// PUT update network
router.put('/:id', requirePermission('edit_all'), async (req, res) => {
  try {
    const network = await networkModel.update(req.params.id, req.body);
    if (!network) {
      return res.status(404).json({ error: 'Network not found' });
    }
    res.json(network);
  } catch (error) {
    console.error('Error updating network:', error);
    res.status(500).json({ error: 'Failed to update network' });
  }
});

// DELETE network
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const success = await networkModel.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Network not found' });
    }
    res.json({ message: 'Network deleted successfully' });
  } catch (error) {
    console.error('Error deleting network:', error);
    res.status(500).json({ error: 'Failed to delete network' });
  }
});

// POST import networks from CSV
router.post('/import', upload.single('csv'), requireRole('manager'), async (req, res) => {
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
    const mapped = data.map(row => ({
      network_name: row['Network Name'] || row.network_name || row['Name'] || row.name,
      provider: row['Provider'] || row.provider,
      circuit_id: row['Circuit ID'] || row.circuit_id,
      bandwidth: row['Bandwidth'] || row.bandwidth,
      location: row['Location'] || row.location,
      network_type: row['Network Type'] || row.network_type || row['Type'] || row.type,
      vlan_id: row['VLAN ID'] || row.vlan_id,
      subnet: row['Subnet'] || row.subnet,
      gateway: row['Gateway'] || row.gateway,
      primary_dns: row['Primary DNS'] || row.primary_dns,
      secondary_dns: row['Secondary DNS'] || row.secondary_dns,
      migration_wave: row['Migration Wave'] || row.migration_wave,
      migration_status: row['Migration Status'] || row.migration_status || 'pending',
      cutover_scheduled: row['Cutover Scheduled'] === 'true' || row.cutover_scheduled === '1',
      cutover_completed: row['Cutover Completed'] === 'true' || row.cutover_completed === '1',
      cutover_date: row['Cutover Date'] || row.cutover_date,
      assigned_engineer: row['Assigned Engineer'] || row.assigned_engineer,
      notes: row['Notes'] || row.notes
    }));
    const created = await networkModel.bulkCreate(mapped);
    fs.unlinkSync(filePath);
    res.status(201).json({ message: `${created.length} networks imported successfully` });
  } catch (error) {
    console.error('Error importing networks:', error);
    if (filePath) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to import networks' });
  }
});

module.exports = router;