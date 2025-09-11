const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const PublicNetwork = require('../models/PublicNetwork');

const upload = multer({ dest: 'uploads/' });
const publicNetworkModel = new PublicNetwork();

// GET all public networks
router.get('/', async (req, res) => {
  try {
    const networks = await publicNetworkModel.findAll();
    res.json(networks);
  } catch (error) {
    console.error('Error fetching public networks:', error);
    res.status(500).json({ error: 'Failed to fetch public networks' });
  }
});

// GET public network by ID
router.get('/:id', async (req, res) => {
  try {
    const network = await publicNetworkModel.findById(req.params.id);
    if (!network) {
      return res.status(404).json({ error: 'Public network not found' });
    }
    res.json(network);
  } catch (error) {
    console.error('Error fetching public network:', error);
    res.status(500).json({ error: 'Failed to fetch public network' });
  }
});

// POST create new public network
router.post('/', async (req, res) => {
  try {
    const network = await publicNetworkModel.create(req.body);
    res.status(201).json(network);
  } catch (error) {
    console.error('Error creating public network:', error);
    res.status(500).json({ error: 'Failed to create public network' });
  }
});

// PUT update public network
router.put('/:id', async (req, res) => {
  try {
    const network = await publicNetworkModel.update(req.params.id, req.body);
    if (!network) {
      return res.status(404).json({ error: 'Public network not found' });
    }
    res.json(network);
  } catch (error) {
    console.error('Error updating public network:', error);
    res.status(500).json({ error: 'Failed to update public network' });
  }
});

// DELETE public network
router.delete('/:id', async (req, res) => {
  try {
    const success = await publicNetworkModel.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Public network not found' });
    }
    res.json({ message: 'Public network deleted successfully' });
  } catch (error) {
    console.error('Error deleting public network:', error);
    res.status(500).json({ error: 'Failed to delete public network' });
  }
});

// POST import public networks from CSV
router.post('/import', upload.single('csv'), async (req, res) => {
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
    // Map CSV columns to our model fields
    const mapped = data.map(row => ({
      network_name: row['Network Name'] || row.network_name,
      network: row['Network'] || row.network || row['Network Name'] || row.network_name,
      cidr: row['CIDR'] || row.cidr,
      provider: row['Provider'] || row.provider,
      gateway: row['Gateway'] || row.gateway,
      dns_servers: row['DNS Servers'] || row.dns_servers,
      customer: row['Customer'] || row.customer,
      action: row['Action'] || row.action,
      vlan: row['VLAN'] || row.vlan,
      current_devices: row['Current Devices'] || row.current_devices,
      current_interfaces: row['Current Interfaces'] || row.current_interfaces,
      new_devices: row['New Devices'] || row.new_devices,
      new_interfaces: row['New Interfaces'] || row.new_interfaces,
      migrated: row['Migrated'] === 'true' || row.migrated === '1' || row.migrated === true,
      tested: row['Tested'] === 'true' || row.tested === '1' || row.tested === true,
      cutover_completed: row['Cutover Completed'] === 'true' || row.cutover_completed === '1' || row.cutover_completed === true,
      assigned_engineer: row['Assigned Engineer'] || row.assigned_engineer,
      engineer_completed_work: row['Engineer Completed Work'] || row.engineer_completed_work,
      notes: row['Notes'] || row.notes
    }));
    const created = await publicNetworkModel.bulkCreate(mapped);
    fs.unlinkSync(filePath);
    res.json({ message: 'Import successful', count: created.length });
  } catch (error) {
    console.error('Error importing public networks:', error);
    try { if (filePath) fs.unlinkSync(filePath); } catch {}
    res.status(500).json({ error: 'Failed to import public networks' });
  }
});

module.exports = router;
