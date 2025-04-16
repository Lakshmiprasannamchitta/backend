const express = require('express');
const router = express.Router();
const { runQuery, runInsert, runGet } = require('../db');

router.get('/', async (req, res) => {
  try {
    const products = await runQuery('SELECT * FROM products');
    res.json(products);
  } catch (error) {
    console.error('Products fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

router.post('/', async (req, res) => {
  const { name, price, order_no, details } = req.body;
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  try {
    const id = await runInsert(
      'INSERT INTO products (name, price, order_no, details) VALUES (?, ?, ?, ?)',
      [name, price, order_no, details]
    );
    res.status(201).json({ message: 'Product added successfully', id });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// ... (rest of PUT and DELETE routes)


router.put('/', async (req, res) => {
  const { id, name, price, order_no, details } = req.body;
  if (!id) {
    return res.status(400).json({ error: 'Product ID is required' });
  }
  try {
    const product = await runGet('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await runInsert(
      'UPDATE products SET name = ?, price = ?, order_no = ?, details = ? WHERE id = ?',
      [name || product.name, price || product.price, order_no || product.order_no, details || product.details, id]
    );
    res.json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Update error:', error.message);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const product = await runGet('SELECT * FROM products WHERE id = ?', [id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    await runInsert('DELETE FROM products WHERE id = ?', [id]);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error.message);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;