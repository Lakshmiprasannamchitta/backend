// chat.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const { runQuery, runInsert, runGet } = require('../db');
const axios = require('axios');

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

router.post('/', async (req, res) => {
  console.log('Received POST /api/chat:', req.body);
  const { message, user_id } = req.body;
  if (!message || !user_id) {
    console.log('Missing message or user_id');
    return res.status(400).json({ error: 'Message and user_id are required' });
  }

  try {
    const user = await runGet('SELECT name, mobile_no FROM users WHERE id = ?', [user_id]);
    if (!user) {
      console.log('User not found:', user_id);
      return res.status(404).json({ error: 'User not found' });
    }

    const lowercaseMessage = message.toLowerCase().trim();
    if (lowercaseMessage === 'find products') {
      const products = await runQuery('SELECT * FROM products');
      console.log('Sending products:', products);
      return res.json(products.length ? products : { message: `Hello ${user.name}, no products found in the store.` });
    } else if (lowercaseMessage.startsWith('check order status')) {
      const productIdMatch = message.match(/check order status (\d+)/i);
      const productId = productIdMatch ? parseInt(productIdMatch[1]) : 0;
      if (!productId) {
        return res.json({ message: `Hello ${user.name}, please provide a valid product ID (e.g., "Check Order Status 123").` });
      }
      const status = await runGet('SELECT * FROM order_status WHERE product_id = ?', [productId]);
      console.log('Order status:', status);
      return res.json(
        status
          ? { product_id: productId, status: status.status, message: `Hello ${user.name}, order status for product ID ${productId}: ${status.status}` }
          : { message: `Hello ${user.name}, no order status found for product ID ${productId}.` }
      );
    } else if (lowercaseMessage.startsWith('Hi')) {
      return res.json({
        message:"Hey! How can i help you? 😊"
      })
    } else if (lowercaseMessage.startsWith('process refund')) {
      const productIdMatch = message.match(/process refund (\d+)/i);
      const productId = productIdMatch ? parseInt(productIdMatch[1]) : 0;
      if (!productId) {
        return res.json({ message: `Hello ${user.name}, please provide a valid product ID (e.g., "Process Refund 123").` });
      }
      const product = await runGet('SELECT * FROM products WHERE id = ?', [productId]);
      if (!product) {
        return res.json({ message: `Hello ${user.name}, no product found for ID ${productId}.` });
      }
      await runInsert(
        'INSERT INTO refunds (product_id, return_money, account_no, cancelled, order_date, cancel_date) VALUES (?, ?, ?, ?, ?, ?)',
        [productId, product.price, '123456789', 1, new Date().toISOString(), new Date().toISOString()]
      );
      await runInsert('INSERT INTO order_status (product_id, status) VALUES (?, ?)', [productId, 'order cancelled']);
      console.log('Refund processed for product ID:', productId);
      return res.json({
        product_id: productId,
        product_name: product.name,
        refund_amount: product.price,
        message: `Hello ${user.name}, refund processed for ${product.name} (ID ${productId}) worth $${product.price}.`
      });
    } else if (lowercaseMessage === 'store policies') {
      const policies = await runQuery('SELECT * FROM store_policies');
      const policyList = policies.length ? policies.map((p) => p.rule) : ['No policies available.'];
      console.log('Store policies:', policyList);
      return res.json({
        policies: policyList,
        message: `Hello ${user.name}, store policies: ${policyList.join('; ')}`
      });
    } else if (lowercaseMessage === 'order history') {
      const history = await runQuery('SELECT * FROM order_history WHERE user_id = ?', [user_id]);
      console.log('Order history:', history);
      return res.json(
        history.length
          ? {
              orders: history.map((h) => ({
                product_name: h.product_name,
                price: h.price,
                order_date: h.order_date
              })),
              message: `Hello ${user.name}, your order history: ${history.map((h) => `${h.product_name} ($${h.price}) on ${h.order_date}`).join('; ')}`
            }
          : { message: `Hello ${user.name}, no order history found.` }
      );
    } else if (lowercaseMessage.startsWith('find product details')) {
      const productIdMatch = message.match(/find product details (\d+)/i);
      const productId = productIdMatch ? parseInt(productIdMatch[1]) : 0;
      if (!productId) {
        return res.json({ message: `Hello ${user.name}, please provide a valid product ID (e.g., "Find Product Details 123").` });
      }
      const product = await runGet('SELECT * FROM products WHERE id = ?', [productId]);
      console.log('Product details:', product);
      return res.json(
        product
          ? {
              product: {
                id: product.id,
                name: product.name,
                price: product.price,
                details: product.details,
                image: product.image
              },
              message: `Hello ${user.name}, details for ${product.name} (ID ${productId}): ${product.details}, Price: $${product.price}`
            }
          : { message: `Hello ${user.name}, no product found for ID ${productId}.` }
      );
    } else if (lowercaseMessage.startsWith('order product')) {
      const productMatch = message.match(/order product (\d+|\w.*)/i);
      const productIdentifier = productMatch ? productMatch[1].trim() : '';
      if (!productIdentifier) {
        return res.json({ message: `Hello ${user.name}, please provide a product ID or name (e.g., "Order Product 1" or "Order Product Floral Maxi Dress").` });
      }
      let product;
      if (/^\d+$/.test(productIdentifier)) {
        product = await runGet('SELECT * FROM products WHERE id = ?', [parseInt(productIdentifier)]);
      } else {
        product = await runGet('SELECT * FROM products WHERE name = ?', [productIdentifier]);
      }
      if (!product) {
        return res.json({ message: `Hello ${user.name}, sorry, product "${productIdentifier}" not found. Try "Find Products" to see available items.` });
      }
      await runInsert(
        'INSERT INTO order_history (user_id, product_name, price, order_date) VALUES (?, ?, ?, ?)',
        [user_id, product.name, product.price, new Date().toISOString()]
      );
      console.log('Ordered product:', product);
      return res.json({
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          details: product.details,
          image: product.image
        },
        message: `Hello ${user.name}, ordered ${product.name} (ID ${product.id}) for $${product.price}.`
      });
    } else {
      const reply = await generateDeepSeekResponse(message, user.name);
      await runInsert(
        'INSERT INTO messages (user_id, message, response, timestamp) VALUES (?, ?, ?, ?)',
        [user_id, message, reply, new Date().toISOString()]
      );
      console.log('DeepSeek response:', reply);
      return res.json({ message: reply });
    }
  } catch (error) {
    console.error('Chatbot error:', error.message, error.stack);
    return res.status(500).json({ error: 'Chatbot failed', details: error.message });
  }
});

router.post('/api/messages', async (req, res) => {
  console.log('Received POST /api/messages:', req.body);
  const { message, user_id } = req.body;
  if (!message || !user_id) {
    console.log('Missing message or user_id');
    return res.status(400).json({ error: 'Valid message and user_id required' });
  }

  let reply;
  let products = [];
  try {
    const user = await runGet('SELECT name, mobile_no FROM users WHERE id = ?', [user_id]);
    if (!user) {
      console.log('User not found:', user_id);
      return res.status(404).json({ error: 'User not found' });
    }
    const userGreeting = `Hello ${user.name},`;

    const lowercaseMessage = message.toLowerCase().trim();
    if (lowercaseMessage === 'find products') {
      products = await runQuery('SELECT * FROM products');
      reply = products.length
        ? `${userGreeting} here are the available products:\n${products.map(p => `${p.id} - ${p.name}`).join('\n')}`
        : `${userGreeting} no products found in the store.`;
    } else if (lowercaseMessage.startsWith('check order status')) {
      const productIdMatch = message.match(/check order status (\d+)/i);
      const productId = productIdMatch ? parseInt(productIdMatch[1]) : 0;
      if (!productId) {
        reply = `${userGreeting} please provide a valid product ID (e.g., "Check Order Status 123").`;
      } else {
        const status = await runGet('SELECT * FROM order_status WHERE product_id = ?', [productId]);
        reply = status
          ? `${userGreeting} order status for product ID ${productId}: ${status.status}`
          : `${userGreeting} no order status found for product ID ${productId}.`;
      }
    } else if (lowercaseMessage.startsWith('process refund')) {
      const productIdMatch = message.match(/process refund (\d+)/i);
      const productId = productIdMatch ? parseInt(productIdMatch[1]) : 0;
      if (!productId) {
        reply = `${userGreeting} please provide a valid product ID (e.g., "Process Refund 123").`;
      } else {
        const product = await runGet('SELECT * FROM products WHERE id = ?', [productId]);
        if (product) {
          await runInsert(
            'INSERT INTO refunds (product_id, return_money, account_no, cancelled, order_date, cancel_date) VALUES (?, ?, ?, ?, ?, ?)',
            [productId, product.price, '123456789', 1, new Date().toISOString(), new Date().toISOString()]
          );
          await runInsert('INSERT INTO order_status (product_id, status) VALUES (?, ?)', [productId, 'order cancelled']);
          reply = `${userGreeting} refund processed for product ID ${productId} worth $${product.price}.`;
        } else {
          reply = `${userGreeting} no product found for ID ${productId}.`;
        }
      }
    } else if (lowercaseMessage === 'store policies') {
      const policies = await runQuery('SELECT * FROM store_policies');
      const policyList = policies.length ? policies.map((p) => p.rule).join('; ') : 'No policies available.';
      reply = `${userGreeting} store policies: ${policyList}`;
    } else if (lowercaseMessage === 'order history') {
      const history = await runQuery('SELECT * FROM order_history WHERE user_id = ?', [user_id]);
      const historyList = history.length
        ? history.map((h) => `${h.product_name} ($${h.price}) on ${h.order_date}`).join('; ')
        : 'No order history found.';
      reply = `${userGreeting} your order history: ${historyList}`;
    } else if (lowercaseMessage.startsWith('find product details')) {
      const productIdMatch = message.match(/find product details (\d+)/i);
      const productId = productIdMatch ? parseInt(productIdMatch[1]) : 0;
      if (!productId) {
        reply = `${userGreeting} please provide a valid product ID (e.g., "Find Product Details 123").`;
      } else {
        const product = await runGet('SELECT * FROM products WHERE id = ?', [productId]);
        reply = product
          ? `${userGreeting} details for ${product.name} (ID ${productId}): ${product.details}, Price: $${product.price}`
          : `${userGreeting} no product found for ID ${productId}.`;
      }
    } else if (lowercaseMessage.startsWith('order product')) {
      const productMatch = message.match(/order product (\d+|\w.*)/i);
      const productIdentifier = productMatch ? productMatch[1].trim() : '';
      if (!productIdentifier) {
        reply = `${userGreeting} please provide a product ID or name (e.g., "Order Product 1" or "Order Product Floral Maxi Dress").`;
      } else {
        let product;
        if (/^\d+$/.test(productIdentifier)) {
          product = await runGet('SELECT * FROM products WHERE id = ?', [parseInt(productIdentifier)]);
        } else {
          product = await runGet('SELECT * FROM products WHERE name = ?', [productIdentifier]);
        }
        if (product) {
          await runInsert(
            'INSERT INTO order_history (user_id, product_name, price, order_date) VALUES (?, ?, ?, ?)',
            [user_id, product.name, product.price, new Date().toISOString()]
          );
          reply = `${userGreeting} ordered ${product.name} (ID ${product.id}) for $${product.price}.`;
        } else {
          reply = `${userGreeting} sorry, product "${productIdentifier}" not found. Try "Find Products" to see available items.`;
        }
      }
    } else {
      reply = await generateDeepSeekResponse(message, user.name);
    }

    await runInsert(
      'INSERT INTO messages (user_id, message, response, timestamp) VALUES (?, ?, ?, ?)',
      [user_id, message, reply, new Date().toISOString()]
    );
    console.log('Sending response:', { reply, products });
    res.json({ reply, products });
  } catch (error) {
    console.error('Chatbot error:', error.message, error.stack);
    res.status(500).json({ error: 'Chatbot failed', details: error.message });
  }
});

async function generateDeepSeekResponse(prompt, userName) {
  if (!DEEPSEEK_API_KEY) {
    return `Hello ${userName}, I understood "${prompt}", but I can assist better with specific queries like "Find Products" or "Check Order Status".`;
  }
  try {
    const response = await axios.post(
      DEEPSEEK_API_URL,
      {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
        temperature: 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return `Hello ${userName}, ${response.data.choices[0].message.content.trim()}`;
  } catch (error) {
    console.error('DeepSeek error:', error.response?.data || error.message);
    return `Hello ${userName}, sorry, I couldn’t process your request due to an API issue. Try specific commands like "Find Products".`;
  }
}

module.exports = router;