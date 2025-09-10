const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const VLAN = require('../models/VLAN');

const upload = multer({ dest: 'uploads/' });
const vlanModel = new VLAN();

// GET all VLANs
router.get('/', async (req, res) => {
  try {
    const vlans = await vlanModel.findAll();
    res.json(vlans);
  } catch (error) {
    console.error('Error fetching VLANs:', error);
    res.status(500).json({ error: 'Failed to fetch VLANs' });
  }
});

// GET VLAN by ID
router.get('/:id', async (req, res) => {
  try {
    const vlan = await vlanModel.findById(req.params.id);
    if (!vlan) {
      return res.status(404).json({ error: 'VLAN not found' });
    }
    res.json(vlan);
  } catch (error) {
    console.error('Error fetching VLAN:', error);
    res.status(500).json({ error: 'Failed to fetch VLAN' });
  }
});

// POST create new VLAN
router.post('/', async (req, res) => {
  try {
    const vlan = await vlanModel.create(req.body);
    res.status(201).json(vlan);
  } catch (error) {
    console.error('Error creating VLAN:', error);
    res.status(500).json({ error: 'Failed to create VLAN' });
  }
});

// PUT update VLAN
router.put('/:id', async (req, res) => {
  try {
    const vlan = await vlanModel.update(req.params.id, req.body);
    if (!vlan) {
      return res.status(404).json({ error: 'VLAN not found' });
    }
    res.json(vlan);
  } catch (error) {
    console.error('Error updating VLAN:', error);
    res.status(500).json({ error: 'Failed to update VLAN' });
  }
});

// DELETE VLAN
router.delete('/:id', async (req, res) => {
  try {
    const success = await vlanModel.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'VLAN not found' });
    }
    res.json({ message: 'VLAN deleted successfully' });
  } catch (error) {
    console.error('Error deleting VLAN:', error);
    res.status(500).json({ error: 'Failed to delete VLAN' });
  }
});

// POST import VLANs from CSV
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
    const vlans = await vlanModel.importFromCSV(data);
    fs.unlinkSync(filePath);
    res.json({ message: 'Import successful', count: vlans.length });
  } catch (error) {
    console.error('Error importing VLANs:', error);
    try { if (filePath) fs.unlinkSync(filePath); } catch {}
    res.status(500).json({ error: 'Failed to import VLANs' });
  }
});

module.exports = router;
