const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

async function dbInit() {
    const dbPath = path.resolve(__dirname, 'elite_sports.db');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            brand TEXT,
            price REAL NOT NULL,
            description TEXT,
            category TEXT,
            audience TEXT, -- Men, Women, Kids, Unisex
            player TEXT,   -- e.g. Messi, Ronaldo (optional)
            images TEXT, -- JSON string of image paths
            stock TEXT    -- JSON string of stock by size and color
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_name TEXT NOT NULL,
            phone TEXT NOT NULL,
            location TEXT NOT NULL,
            landmark TEXT,
            items TEXT, -- JSON string of cart items
            total_amount REAL NOT NULL,
            payment_method TEXT, -- COD, QR, Esewa
            status TEXT DEFAULT 'pending', -- pending, dispatched, done, completed
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS pages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            visible BOOLEAN DEFAULT 1
        );
    `);

    // Lightweight schema migration for existing DBs
    const productCols = await db.all(`PRAGMA table_info(products)`);
    const colNames = new Set(productCols.map(c => c.name));
    if (!colNames.has('audience')) {
        await db.exec(`ALTER TABLE products ADD COLUMN audience TEXT`);
    }
    if (!colNames.has('player')) {
        await db.exec(`ALTER TABLE products ADD COLUMN player TEXT`);
    }

    const orderCols = await db.all(`PRAGMA table_info(orders)`);
    const orderColNames = new Set(orderCols.map(c => c.name));
    if (!orderColNames.has('email')) {
        await db.exec(`ALTER TABLE orders ADD COLUMN email TEXT`);
    }
    if (!orderColNames.has('district')) {
        await db.exec(`ALTER TABLE orders ADD COLUMN district TEXT`);
    }

    // Add default home page if not exists
    const home = await db.get('SELECT * FROM pages WHERE slug = "home"');
    if (!home) {
        await db.run('INSERT INTO pages (slug, title, content) VALUES ("home", "Home", "Welcome to Elite Sports Hub")');
    }

    console.log('Database initialized');
    return db;
}

module.exports = { dbInit };
