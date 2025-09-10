const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const VoiceSystem = require('../models/VoiceSystem');

const upload = multer({ dest: 'uploads/' });
const voiceSystemModel = new VoiceSystem();

// GET all voice systems
router.get('/', async (req, res) => {
  try {
    const voiceSystems = await voiceSystemModel.findAll();
    res.json(voiceSystems);
  } catch (error) {
    console.error('Error fetching voice systems:', error);
    res.status(500).json({ error: 'Failed to fetch voice systems' });
  }
});

// GET voice system by ID
router.get('/:id', async (req, res) => {
  try {
    const voiceSystem = await voiceSystemModel.findById(req.params.id);
    
    if (!voiceSystem) {
      return res.status(404).json({ error: 'Voice system not found' });
    }
    
    res.json(voiceSystem);
  } catch (error) {
    console.error('Error fetching voice system:', error);
    res.status(500).json({ error: 'Failed to fetch voice system' });
  }
});

// POST create new voice system
router.post('/', async (req, res) => {
  try {
    const voiceSystem = await voiceSystemModel.create(req.body);
    res.status(201).json(voiceSystem);
  } catch (error) {
    console.error('Error creating voice system:', error);
    res.status(500).json({ error: 'Failed to create voice system' });
  }
});

// PUT update voice system
router.put('/:id', async (req, res) => {
  try {
    const voiceSystem = await voiceSystemModel.update(req.params.id, req.body);
    
    if (!voiceSystem) {
      return res.status(404).json({ error: 'Voice system not found' });
    }
    
    res.json(voiceSystem);
  } catch (error) {
    console.error('Error updating voice system:', error);
    res.status(500).json({ error: 'Failed to update voice system' });
  }
});

// DELETE voice system
router.delete('/:id', async (req, res) => {
  try {
    const success = await voiceSystemModel.delete(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Voice system not found' });
    }
    
    res.json({ message: 'Voice system deleted successfully' });
  } catch (error) {
    console.error('Error deleting voice system:', error);
    res.status(500).json({ error: 'Failed to delete voice system' });
  }
});

// POST import voice systems from CSV
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

    const voiceSystems = await voiceSystemModel.importFromCSV(data);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({ 
      message: 'Import successful', 
      count: voiceSystems.length 
    });
  } catch (error) {
    console.error('Error importing voice systems:', error);
    if (filePath) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Failed to import voice systems' });
  }
});

module.exports = router;