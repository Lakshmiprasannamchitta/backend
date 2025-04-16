const express = require('express');
const router = express.Router();
const { runQuery, runInsert, runGet } = require('../db');

router.get('/', async (req, res) => {
  try {
    const policies = await runQuery('SELECT * FROM store_policies');
    res.json(policies);
  } catch (error) {
    console.error('Store policies fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch store policies' });
  }
});

router.post('/', async (req, res) => {
  const { rule } = req.body;
  if (!rule) {
    return res.status(400).json({ error: 'Rule is required' });
  }
  try {
    await runInsert(
      'INSERT INTO store_policies (rule) VALUES (?)',
      [rule]
    );
    res.status(201).json({ message: 'Store policy added successfully' });
  } catch (error) {
    console.error('Insert error:', error.message);
    res.status(500).json({ error: 'Failed to add store policy' });
  }
});

module.exports = router;