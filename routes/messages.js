const express = require('express');
const router = express.Router();
const { runQuery, runInsert, runGet } = require('../db');

router.get('/', async (req, res) => {
  try {
    const messages = await runQuery('SELECT * FROM messages');
    res.json(messages);
  } catch (error) {
    console.error('Messages fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.post('/', async (req, res) => {
  const { user_id, message, response, timestamp } = req.body;
  if (!user_id || !message || !response || !timestamp) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  console.log('Request body:', req.body); // Debugging line
  
  try {
    await runInsert(
      'INSERT INTO messages (user_id, message, response, timestamp) VALUES (?, ?, ?, ?)',
      [user_id, message, response, timestamp]
    );
    res.status(201).json({ message: 'Message added successfully' });
  } catch (error) {
    console.error('Insert error:', error.message);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

module.exports = router;