const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const { requirePermission, requireRole } = require('../middleware/auth');
const CarrierNNI = require('../models/CarrierNNI');

const upload = multer({ dest: 'uploads/' });
const nniModel = new CarrierNNI();

// GET all carrier NNIs
router.get('/', async (req, res) => {
  try {
    const nnis = await nniModel.findAll();
    res.json(nnis);
  } catch (error) {
    console.error('Error fetching carrier NNIs:', error);
    res.status(500).json({ error: 'Failed to fetch carrier NNIs' });
  }
});

// GET NNI by ID
router.get('/:id', async (req, res) => {
  try {
    const nni = await nniModel.findById(req.params.id);
    if (!nni) {
      return res.status(404).json({ error: 'Carrier NNI not found' });
    }
    res.json(nni);
  } catch (error) {
    console.error('Error fetching carrier NNI:', error);
    res.status(500).json({ error: 'Failed to fetch carrier NNI' });
  }
});

// POST create new carrier NNI
router.post('/', requirePermission('edit_all'), async (req, res) => {
  try {
    const nni = await nniModel.create(req.body);
    res.status(201).json(nni);
  } catch (error) {
    console.error('Error creating carrier NNI:', error);
    res.status(500).json({ error: 'Failed to create carrier NNI' });
  }
});

// PUT update carrier NNI
router.put('/:id', requirePermission('edit_all'), async (req, res) => {
  try {
    const nni = await nniModel.update(req.params.id, req.body);
    if (!nni) {
      return res.status(404).json({ error: 'Carrier NNI not found' });
    }
    res.json(nni);
  } catch (error) {
    console.error('Error updating carrier NNI:', error);
    res.status(500).json({ error: 'Failed to update carrier NNI' });
  }
});

// DELETE carrier NNI
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const success = await nniModel.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Carrier NNI not found' });
    }
    res.json({ message: 'Carrier NNI deleted successfully' });
  } catch (error) {
    console.error('Error deleting carrier NNI:', error);
    res.status(500).json({ error: 'Failed to delete carrier NNI' });
  }
});

// POST import carrier NNIs from CSV
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
      nni_id: row['NNI ID'] || row.nni_id,
      provider: row['Provider'] || row.provider,
      type: row['Type'] || row.type,
      bandwidth: row['Bandwidth'] || row.bandwidth,
      location: row['Location'] || row.location,
      carrier_name: row['Carrier Name'] || row.carrier_name,
      circuit_id: row['Circuit ID'] || row.circuit_id,
      interface_type: row['Interface Type'] || row.interface_type,
      vlan_range: row['VLAN Range'] || row.vlan_range,
      ip_block: row['IP Block'] || row.ip_block,
      current_device: row['Current Device'] || row.current_device,
      new_device: row['New Device'] || row.new_device,
      migration_status: row['Migration Status'] || row.migration_status || 'pending',
      tested: row['Tested'] === 'true' || row.tested === '1',
      cutover_completed: row['Cutover Completed'] === 'true' || row.cutover_completed === '1',
      engineer_assigned: row['Engineer Assigned'] || row.engineer_assigned
    }));
    const created = await nniModel.bulkCreate(mapped);
    fs.unlinkSync(filePath);
    res.status(201).json({ message: `${created.length} carrier NNIs imported successfully` });
  } catch (error) {
    console.error('Error importing carrier NNIs:', error);
    if (filePath) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to import carrier NNIs' });
  }
});

module.exports = router;