const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const CarrierCircuit = require('../models/CarrierCircuit');

const upload = multer({ dest: 'uploads/' });
const circuitModel = new CarrierCircuit();

// GET all carrier circuits
router.get('/', async (req, res) => {
  try {
    const circuits = await circuitModel.findAll();
    res.json(circuits);
  } catch (error) {
    console.error('Error fetching carrier circuits:', error);
    res.status(500).json({ error: 'Failed to fetch carrier circuits' });
  }
});

// GET circuit by ID
router.get('/:id', async (req, res) => {
  try {
    const circuit = await circuitModel.findById(req.params.id);
    if (!circuit) {
      return res.status(404).json({ error: 'Carrier circuit not found' });
    }
    res.json(circuit);
  } catch (error) {
    console.error('Error fetching carrier circuit:', error);
    res.status(500).json({ error: 'Failed to fetch carrier circuit' });
  }
});

// POST create new carrier circuit
router.post('/', async (req, res) => {
  try {
    const circuit = await circuitModel.create(req.body);
    res.status(201).json(circuit);
  } catch (error) {
    console.error('Error creating carrier circuit:', error);
    res.status(500).json({ error: 'Failed to create carrier circuit' });
  }
});

// PUT update carrier circuit
router.put('/:id', async (req, res) => {
  try {
    const circuit = await circuitModel.update(req.params.id, req.body);
    if (!circuit) {
      return res.status(404).json({ error: 'Carrier circuit not found' });
    }
    res.json(circuit);
  } catch (error) {
    console.error('Error updating carrier circuit:', error);
    res.status(500).json({ error: 'Failed to update carrier circuit' });
  }
});

// DELETE carrier circuit
router.delete('/:id', async (req, res) => {
  try {
    const success = await circuitModel.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Carrier circuit not found' });
    }
    res.json({ message: 'Carrier circuit deleted successfully' });
  } catch (error) {
    console.error('Error deleting carrier circuit:', error);
    res.status(500).json({ error: 'Failed to delete carrier circuit' });
  }
});

// POST import carrier circuits from CSV
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
    const mapped = data.map(row => ({
      circuit_id: row['Circuit ID'] || row.circuit_id || row['Circuit'] || row.circuit,
      provider: row['Provider'] || row.provider || row['Vendor'] || row.vendor,
      type: row['Type'] || row.type || row['Service'] || row.service,
      bandwidth: row['Bandwidth'] || row.bandwidth,
      location_a: row['Location A'] || row.location_a || row['Location'] || row.location,
      location_z: row['Location Z'] || row.location_z,
      customer: row['Customer'] || row.customer,
      service: row['Service'] || row.service,
      backhaul_vendor: row['Backhaul Vendor'] || row.backhaul_vendor,
      circuit_location: row['Circuit Location'] || row.circuit_location,
      carrier_circuit_id: row['Carrier Circuit ID'] || row.carrier_circuit_id,
      vlan: row['VLAN'] || row.vlan,
      starmax_mgmt_ip: row['Starmax Mgmt IP'] || row.starmax_mgmt_ip,
      migrated: row['Migrated'] === 'true' || row.migrated === '1' || row.migrated === true,
      tested: row['Tested'] === 'true' || row.tested === '1' || row.tested === true,
      cutover_completed: row['Cutover Completed'] === 'true' || row.cutover_completed === '1' || row.cutover_completed === true,
      assigned_engineer: row['Assigned Engineer'] || row.assigned_engineer,
      engineer_completed_work: row['Engineer Completed Work'] || row.engineer_completed_work,
      notes: row['Notes'] || row.notes
    }));
    const created = await circuitModel.bulkCreate(mapped);
    fs.unlinkSync(filePath);
    res.json({ message: 'Import successful', count: created.length });
  } catch (error) {
    console.error('Error importing carrier circuits:', error);
    try { if (filePath) fs.unlinkSync(filePath); } catch {}
    res.status(500).json({ error: 'Failed to import carrier circuits' });
  }
});

module.exports = router;
