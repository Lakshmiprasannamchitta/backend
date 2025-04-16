const express = require('express');
const router = express.Router();
const { runQuery, runInsert, runGet } = require('../db');

router.post('/signup', async (req, res) => {
  const { name, mobile_no, password } = req.body;
  if (!name || !mobile_no || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  try {
    const existingUser = await runGet('SELECT * FROM users WHERE mobile_no = ?', [mobile_no]);
    if (existingUser) {
      return res.status(400).json({ error: 'Mobile number already exists' });
    }
    const userId = await runInsert(
      'INSERT INTO users (name, mobile_no, password) VALUES (?, ?, ?)',
      [name, mobile_no, password]
    );
    const user = await runGet('SELECT id, name, mobile_no FROM users WHERE id = ?', [userId]);
    res.status(201).json({ message: 'Signup successful', user });
  } catch (error) {
    console.error('Signup error:', error.message);
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  const { mobile_no, password } = req.body;
  if (!mobile_no || !password) {
    return res.status(400).json({ error: 'Mobile number and password are required' });
  }
  try {
    const user = await runGet('SELECT * FROM users WHERE mobile_no = ? AND password = ?', [mobile_no, password]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ message: 'Login successful', user: { id: user.id, name: user.name, mobile_no: user.mobile_no } });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;