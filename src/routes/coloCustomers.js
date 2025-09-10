const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const ColoCustomer = require('../models/ColoCustomer');

const upload = multer({ dest: 'uploads/' });
const coloCustomerModel = new ColoCustomer();

// GET all colo customers
router.get('/', async (req, res) => {
  try {
    const coloCustomers = await coloCustomerModel.findAll();
    res.json(coloCustomers);
  } catch (error) {
    console.error('Error fetching colo customers:', error);
    res.status(500).json({ error: 'Failed to fetch colo customers' });
  }
});

// GET colo customer by ID
router.get('/:id', async (req, res) => {
  try {
    const coloCustomer = await coloCustomerModel.findById(req.params.id);
    
    if (!coloCustomer) {
      return res.status(404).json({ error: 'Colo customer not found' });
    }
    
    res.json(coloCustomer);
  } catch (error) {
    console.error('Error fetching colo customer:', error);
    res.status(500).json({ error: 'Failed to fetch colo customer' });
  }
});

// POST create new colo customer
router.post('/', async (req, res) => {
  try {
    const coloCustomer = await coloCustomerModel.create(req.body);
    res.status(201).json(coloCustomer);
  } catch (error) {
    console.error('Error creating colo customer:', error);
    res.status(500).json({ error: 'Failed to create colo customer' });
  }
});

// PUT update colo customer
router.put('/:id', async (req, res) => {
  try {
    const coloCustomer = await coloCustomerModel.update(req.params.id, req.body);
    
    if (!coloCustomer) {
      return res.status(404).json({ error: 'Colo customer not found' });
    }
    
    res.json(coloCustomer);
  } catch (error) {
    console.error('Error updating colo customer:', error);
    res.status(500).json({ error: 'Failed to update colo customer' });
  }
});

// DELETE colo customer
router.delete('/:id', async (req, res) => {
  try {
    const success = await coloCustomerModel.delete(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Colo customer not found' });
    }
    
    res.json({ message: 'Colo customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting colo customer:', error);
    res.status(500).json({ error: 'Failed to delete colo customer' });
  }
});

// POST import colo customers from CSV
router.post('/import', upload.single('file'), async (req, res) => {
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

    const coloCustomers = await coloCustomerModel.importFromCSV(data);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({ 
      message: 'Import successful', 
      count: coloCustomers.length 
    });
  } catch (error) {
    console.error('Error importing colo customers:', error);
    if (filePath) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to import colo customers' });
  }
});

module.exports = router;