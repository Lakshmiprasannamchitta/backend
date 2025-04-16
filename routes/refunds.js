const express = require('express');
const router = express.Router();
const { runQuery, runInsert, runGet } = require('../db');

router.get('/', async (req, res) => {
  try {
    const refunds = await runQuery('SELECT * FROM refunds');
    res.json(refunds);
  } catch (error) {
    console.error('Refunds fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
});

router.post('/', async (req, res) => {
  const { product_id, return_money, account_no, cancelled, order_date, cancel_date } = req.body;
  if (!product_id || !return_money) {
    return res.status(400).json({ error: 'Product ID and return money are required' });
  }
  try {
    await runInsert(
      'INSERT INTO refunds (product_id, return_money, account_no, cancelled, order_date, cancel_date) VALUES (?, ?, ?, ?, ?, ?)',
      [product_id, return_money, account_no, cancelled, order_date, cancel_date]
    );
    res.status(201).json({ message: 'Refund added successfully' });
  } catch (error) {
    console.error('Insert error:', error.message);
    res.status(500).json({ error: 'Failed to add refund' });
  }
});

module.exports = router;