const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

const initDB = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(path.join(__dirname, 'shop.db'), (err) => {
      if (err) {
        console.error('Database connection error:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
      
      const createTables = async () => {
        try {
          await runQuery('DROP TABLE IF EXISTS products');
          await runQuery(
            `CREATE TABLE IF NOT EXISTS products (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              price REAL NOT NULL,
              order_no TEXT,
              details TEXT NOT NULL,
              image TEXT
            )`
          );
          await runQuery(
            `CREATE TABLE IF NOT EXISTS users (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              mobile_no TEXT UNIQUE NOT NULL,
              password TEXT NOT NULL
            )`
          );
          await runQuery(
            `CREATE TABLE IF NOT EXISTS order_history (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER,
              product_name TEXT NOT NULL,
              price REAL NOT NULL,
              order_date TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id)
            )`
          );
          await runQuery(
            `CREATE TABLE IF NOT EXISTS order_status (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              product_id INTEGER NOT NULL,
              status TEXT NOT NULL
            )`
          );
          await runQuery(
            `CREATE TABLE IF NOT EXISTS refunds (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              product_id INTEGER NOT NULL,
              return_money REAL NOT NULL,
              account_no TEXT NOT NULL,
              cancelled INTEGER NOT NULL,
              order_date TEXT NOT NULL,
              cancel_date TEXT NOT NULL
            )`
          );
          await runQuery(
            `CREATE TABLE IF NOT EXISTS store_policies (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              rule TEXT NOT NULL UNIQUE
            )`
          );
          await runQuery(
            `CREATE TABLE IF NOT EXISTS messages (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER,
              message TEXT NOT NULL,
              response TEXT NOT NULL,
              timestamp TEXT NOT NULL,
              FOREIGN KEY (user_id) REFERENCES users(id)
            )`
          );

          const productCount = await runGet('SELECT COUNT(*) AS count FROM products');
          if (!productCount || productCount.count === 0) {
            const initialProducts = [
              { name: "Floral Maxi Dress", price: 59.99, details: "Elegant floral pattern", image: "/img/download.jpeg" },
              { name: "Black Cocktail Dress", price: 79.99, details: "Sleek and stylish", image: "/img/download (1).jpeg" },
              { name: "Summer Sundress", price: 39.99, details: "Light and breezy", image: "/img/bla foral dress.webp" },
              { name: "Denim Jacket", price: 49.99, details: "Casual and cool", image: "/img/floral dres.jpg" },
              { name: "Red Evening Gown", price: 99.99, details: "Bold and elegant", image: "/img/floral maxi dress.jpg" },
              { name: "White Shirt Dress", price: 45.99, details: "Crisp and versatile", image: "/img/floral maxi dress.jpg" },
              { name: "Bohemian Skirt", price: 34.99, details: "Flowy and free", image: "/img/flower dres.jpg" },
              { name: "Leather Jacket", price: 89.99, details: "Edgy and warm", image: "/img/images (3).jpeg" },
              { name: "Polka Dot Blouse", price: 29.99, details: "Playful pattern", image: "/img/images.jpeg" },
              { name: "Green Midi Dress", price: 54.99, details: "Fresh and chic", image: "/img/floral maxii.jpg" },
              { name: "Striped T-Shirt", price: 19.99, details: "Casual comfort", image: "/img/floral dres.jpg" },
              { name: "Velvet Blazer", price: 69.99, details: "Luxurious feel", image: "/img/images (1).jpeg" },
              { name: "Lace Top", price: 44.99, details: "Delicate and feminine", image: "/img/images (3).jpeg" },
              { name: "Plaid Skirt", price: 39.99, details: "Classic pattern", image: "/img/images (4).jpeg" },
              { name: "Silk Scarf", price: 24.99, details: "Soft and elegant", image: "/img/images (5).jpeg" },
              { name: "Knit Sweater", price: 49.99, details: "Cozy and warm", image: "/img/images (6).jpeg" },
              { name: "Chiffon Blouse", price: 34.99, details: "Light and airy", image: "/img/images (7).jpeg" },
              { name: "Cargo Pants", price: 59.99, details: "Practical and trendy", image: "/img/images.jpeg" },
              { name: "Satin Dress", price: 74.99, details: "Shiny and smooth", image: "/img/red floral.webp" },
              { name: "Hooded Jacket", price: 64.99, details: "Warm and casual", image: "/img/flower dres.jpg" }
            ];
            for (const product of initialProducts) {
              await runInsert(
                'INSERT INTO products (name, price, details, image) VALUES (?, ?, ?, ?)',
                [product.name, product.price, product.details, product.image]
              );
            }
            console.log('Seeded sample products');
          }

          const policyCount = await runGet('SELECT COUNT(*) AS count FROM store_policies');
          if (!policyCount || policyCount.count === 0) {
            await runInsert('INSERT INTO store_policies (rule) VALUES (?)', ['No returns after 30 days']);
            await runInsert('INSERT INTO store_policies (rule) VALUES (?)', ['Free shipping on orders over $50']);
            console.log('Seeded sample policies');
          }

          resolve();
        } catch (error) {
          console.error('Table creation or seeding error:', error);
          reject(error);
        }
      };

      createTables();
    });
  });
};

const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Query error:', err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

const runInsert = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) {
        console.error('Insert error:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const runGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('Get error:', err);
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

module.exports = { initDB, runQuery, runInsert, runGet };