const express = require('express');
const router = express.Router();
const { runQuery, runInsert, runGet } = require('../db');

router.get('/', async (req, res) => {
  try {
    const history = await runQuery('SELECT * FROM order_history');
    res.json(history);
  } catch (error) {
    console.error('Order history fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch order history' });
  }
});

router.post('/', async (req, res) => {
  const { user_id, product_name, price, order_date } = req.body;
  if (!user_id || !product_name || !price || !order_date) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    await runInsert(
      'INSERT INTO order_history (user_id, product_name, price, order_date) VALUES (?, ?, ?, ?)',
      [user_id, product_name, price, order_date]
    );
    res.status(201).json({ message: 'Order history added successfully' });
  } catch (error) {
    console.error('Insert error:', error.message);
    res.status(500).json({ error: 'Failed to add order history' });
  }
});

module.exports = router; // Ensure the router is correctly exported