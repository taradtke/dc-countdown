const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const Database = require('./database');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const upload = multer({ dest: 'uploads/' });

const db = new Database();

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/servers', async (req, res) => {
  try {
    const servers = await db.getServers();
    res.json(servers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/servers/import', upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await db.importServers(results);
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Servers imported successfully', count: results.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
});

app.put('/api/servers/:id', async (req, res) => {
  try {
    await db.updateServer(req.params.id, req.body);
    res.json({ message: 'Server updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/servers/:id', async (req, res) => {
  try {
    await db.deleteServer(req.params.id);
    res.json({ message: 'Server deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/vlans', async (req, res) => {
  try {
    const vlans = await db.getVlans();
    res.json(vlans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vlans/import', upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await db.importVlans(results);
        fs.unlinkSync(req.file.path);
        res.json({ message: 'VLANs imported successfully', count: results.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
});

app.put('/api/vlans/:id', async (req, res) => {
  try {
    await db.updateVlan(req.params.id, req.body);
    res.json({ message: 'VLAN updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/vlans/:id', async (req, res) => {
  try {
    await db.deleteVlan(req.params.id);
    res.json({ message: 'VLAN deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/networks', async (req, res) => {
  try {
    const networks = await db.getNetworks();
    res.json(networks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/networks/import', upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await db.importNetworks(results);
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Networks imported successfully', count: results.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
});

app.put('/api/networks/:id', async (req, res) => {
  try {
    await db.updateNetwork(req.params.id, req.body);
    res.json({ message: 'Network updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/networks/:id', async (req, res) => {
  try {
    await db.deleteNetwork(req.params.id);
    res.json({ message: 'Network deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/voice-systems', async (req, res) => {
  try {
    const voiceSystems = await db.getVoiceSystems();
    res.json(voiceSystems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/voice-systems/import', upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await db.importVoiceSystems(results);
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Voice systems imported successfully', count: results.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
});

app.put('/api/voice-systems/:id', async (req, res) => {
  try {
    await db.updateVoiceSystem(req.params.id, req.body);
    res.json({ message: 'Voice system updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/voice-systems/:id', async (req, res) => {
  try {
    await db.deleteVoiceSystem(req.params.id);
    res.json({ message: 'Voice system deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/colo-customers', async (req, res) => {
  try {
    const coloCustomers = await db.getColoCustomers();
    res.json(coloCustomers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/colo-customers/import', upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await db.importColoCustomers(results);
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Colo customers imported successfully', count: results.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
});

app.put('/api/colo-customers/:id', async (req, res) => {
  try {
    await db.updateColoCustomer(req.params.id, req.body);
    res.json({ message: 'Colo customer updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/colo-customers/:id', async (req, res) => {
  try {
    await db.deleteColoCustomer(req.params.id);
    res.json({ message: 'Colo customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/carrier-circuits', async (req, res) => {
  try {
    const circuits = await db.getCarrierCircuits();
    res.json(circuits);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/carrier-circuits/import', upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await db.importCarrierCircuits(results);
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Carrier circuits imported successfully', count: results.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
});

app.put('/api/carrier-circuits/:id', async (req, res) => {
  try {
    await db.updateCarrierCircuit(req.params.id, req.body);
    res.json({ message: 'Carrier circuit updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/carrier-circuits/:id', async (req, res) => {
  try {
    await db.deleteCarrierCircuit(req.params.id);
    res.json({ message: 'Carrier circuit deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/public-networks', async (req, res) => {
  try {
    const networks = await db.getPublicNetworks();
    res.json(networks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/public-networks/import', upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await db.importPublicNetworks(results);
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Public networks imported successfully', count: results.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
});

app.put('/api/public-networks/:id', async (req, res) => {
  try {
    await db.updatePublicNetwork(req.params.id, req.body);
    res.json({ message: 'Public network updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/public-networks/:id', async (req, res) => {
  try {
    await db.deletePublicNetwork(req.params.id);
    res.json({ message: 'Public network deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/dependencies', async (req, res) => {
  try {
    const { sourceType, sourceId, targetType, targetId, dependencyType, description } = req.body;
    await db.addDependency(sourceType, sourceId, targetType, targetId, dependencyType, description);
    res.json({ message: 'Dependency added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/dependencies/:id', async (req, res) => {
  try {
    await db.removeDependency(req.params.id);
    res.json({ message: 'Dependency removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dependencies/:type/:id', async (req, res) => {
  try {
    const dependencies = await db.getDependencies(req.params.type, req.params.id);
    res.json(dependencies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dependencies', async (req, res) => {
  try {
    const dependencies = await db.getAllDependencies();
    res.json(dependencies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dependency-counts', async (req, res) => {
  try {
    const counts = await db.getDependencyCounts();
    res.json(counts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/all-items', async (req, res) => {
  try {
    const allItems = await db.getAllItemsForDependencies();
    res.json(allItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    const leaderboard = await db.getLeaderboard();
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/critical-items', async (req, res) => {
  try {
    const items = await db.getCriticalItems();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/critical-items', async (req, res) => {
  try {
    await db.importCriticalItems([req.body]);
    res.json({ message: 'Critical item added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/critical-items/import', upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await db.importCriticalItems(results);
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Critical items imported successfully', count: results.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
});

app.put('/api/critical-items/:id', async (req, res) => {
  try {
    await db.updateCriticalItem(req.params.id, req.body);
    res.json({ message: 'Critical item updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/critical-items/:id', async (req, res) => {
  try {
    await db.deleteCriticalItem(req.params.id);
    res.json({ message: 'Critical item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/carrier-nnis', async (req, res) => {
  try {
    const nnis = await db.getCarrierNnis();
    res.json(nnis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/carrier-nnis/import', upload.single('csv'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const results = [];
  
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        await db.importCarrierNnis(results);
        fs.unlinkSync(req.file.path);
        res.json({ message: 'Carrier NNIs imported successfully', count: results.length });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
});

app.put('/api/carrier-nnis/:id', async (req, res) => {
  try {
    await db.updateCarrierNni(req.params.id, req.body);
    res.json({ message: 'Carrier NNI updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/carrier-nnis/:id', async (req, res) => {
  try {
    await db.deleteCarrierNni(req.params.id);
    res.json({ message: 'Carrier NNI deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Customer endpoints
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await db.getCustomers();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/customers/:id', async (req, res) => {
  try {
    const customer = await db.getCustomer(req.params.id);
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/customers/:id/assets', async (req, res) => {
  try {
    const assets = await db.getCustomerAssets(req.params.id);
    res.json(assets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/customers/:id/status', async (req, res) => {
  try {
    const status = await db.getCustomerMigrationStatus(req.params.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', async (req, res) => {
  try {
    const id = await db.createCustomer(req.body);
    res.json({ message: 'Customer created successfully', id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/customers/:id', async (req, res) => {
  try {
    await db.updateCustomer(req.params.id, req.body);
    res.json({ message: 'Customer updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await db.deleteCustomer(req.params.id);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers/:id/assets', async (req, res) => {
  try {
    const { assetType, assetId } = req.body;
    await db.linkAssetToCustomer(req.params.id, assetType, assetId);
    res.json({ message: 'Asset linked to customer successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/customers/:customerId/assets/:assetType/:assetId', async (req, res) => {
  try {
    await db.unlinkAssetFromCustomer(
      req.params.customerId,
      req.params.assetType,
      req.params.assetId
    );
    res.json({ message: 'Asset unlinked from customer successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});