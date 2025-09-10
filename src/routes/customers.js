const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const Customer = require('../models/Customer');

const upload = multer({ dest: 'uploads/' });
const customerModel = new Customer();

// GET all customers
router.get('/', async (req, res) => {
  try {
    const customers = await customerModel.findAll();
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// GET customer overview with asset counts
router.get('/overview', async (req, res) => {
  try {
    const overview = await customerModel.getCustomerOverview();
    res.json(overview);
  } catch (error) {
    console.error('Error fetching customer overview:', error);
    res.status(500).json({ error: 'Failed to fetch customer overview' });
  }
});

// GET customer by ID
router.get('/:id', async (req, res) => {
  try {
    const customer = await customerModel.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// GET customer assets
router.get('/:id/assets', async (req, res) => {
  try {
    const assets = await customerModel.getCustomerAssets(req.params.id);
    res.json(assets);
  } catch (error) {
    console.error('Error fetching customer assets:', error);
    res.status(500).json({ error: 'Failed to fetch customer assets' });
  }
});

// POST create new customer
router.post('/', async (req, res) => {
  try {
    const customer = await customerModel.create(req.body);
    res.status(201).json(customer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  try {
    const customer = await customerModel.update(req.params.id, req.body);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// DELETE customer
router.delete('/:id', async (req, res) => {
  try {
    const success = await customerModel.delete(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// POST link asset to customer
router.post('/:id/assets', async (req, res) => {
  try {
    const { asset_type, asset_id } = req.body;
    
    if (!asset_type || !asset_id) {
      return res.status(400).json({ error: 'asset_type and asset_id are required' });
    }
    
    await customerModel.linkAsset(req.params.id, asset_type, asset_id);
    res.json({ message: 'Asset linked successfully' });
  } catch (error) {
    console.error('Error linking asset:', error);
    res.status(500).json({ error: 'Failed to link asset' });
  }
});

// DELETE unlink asset from customer
router.delete('/:id/assets', async (req, res) => {
  try {
    const { asset_type, asset_id } = req.body;
    
    if (!asset_type || !asset_id) {
      return res.status(400).json({ error: 'asset_type and asset_id are required' });
    }
    
    await customerModel.unlinkAsset(req.params.id, asset_type, asset_id);
    res.json({ message: 'Asset unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking asset:', error);
    res.status(500).json({ error: 'Failed to unlink asset' });
  }
});

// POST import customers from CSV
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

    const customers = await customerModel.importFromCSV(data);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({ 
      message: 'Import successful', 
      count: customers.length 
    });
  } catch (error) {
    console.error('Error importing customers:', error);
    if (filePath) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to import customers' });
  }
});

module.exports = router;