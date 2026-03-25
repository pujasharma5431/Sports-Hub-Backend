const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { dbInit } = require('./db');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

let db;

// Initialize Database
dbInit().then(database => {
    db = database;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

// --- API ROUTES ---

// 1. PRODUCTS

// GET all products
app.get('/api/products', async (req, res) => {
    try {
        const products = await db.all('SELECT * FROM products');
        products.forEach(p => {
            p.images = JSON.parse(p.images || '[]');
            p.stock = JSON.parse(p.stock || '{}');
        });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET product by ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        product.images = JSON.parse(product.images || '[]');
        product.stock = JSON.parse(product.stock || '{}');
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Create Product (Admin) - handles multiple image uploads + compression
app.post('/api/products', upload.array('images', 10), async (req, res) => {
    try {
        const { name, brand, price, description, category, audience, player, stock } = req.body;
        const processedImages = [];

        // Process images with sharp: compress and convert to webp
        for (const file of (req.files || [])) {
            try {
                const fileName = `processed-${Date.now()}-${file.originalname.split('.')[0]}.webp`;
                const filePath = path.join(__dirname, 'uploads', fileName);

                await sharp(file.path)
                    .webp({ quality: 80 })
                    .toFile(filePath);

                // Delete original file after successful conversion
                fs.unlinkSync(file.path);
                processedImages.push(`/uploads/${fileName}`);
            } catch (conversionErr) {
                // Fallback for unsupported formats (e.g. some HEIC): keep original upload
                const originalFileName = path.basename(file.path);
                processedImages.push(`/uploads/${originalFileName}`);
                console.warn(`Image conversion failed for ${file.originalname}. Using original file.`, conversionErr.message);
            }
        }

        const result = await db.run(
            'INSERT INTO products (name, brand, price, description, category, audience, player, images, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, brand, price, description, category, audience, player, JSON.stringify(processedImages), stock]
        );

        res.json({ id: result.lastID, message: 'Product created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// 2. ORDERS

// POST Create Order (User)
app.post('/api/orders', async (req, res) => {
    try {
        const { customer_name, phone, email, district, location, landmark, items, total_amount, payment_method } = req.body;
        const result = await db.run(
            'INSERT INTO orders (customer_name, phone, email, district, location, landmark, items, total_amount, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [customer_name, phone, email, district, location, landmark, JSON.stringify(items), total_amount, payment_method]
        );
        res.json({ id: result.lastID, message: 'Order placed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET All Orders (Admin)
app.get('/api/admin/orders', async (req, res) => {
    try {
        const orders = await db.all('SELECT * FROM orders ORDER BY created_at DESC');
        orders.forEach(o => {
            o.items = JSON.parse(o.items || '[]');
        });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT Update Order Status (Admin)
app.put('/api/admin/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await db.run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
        res.json({ message: 'Order status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. PAGES (Dynamic Content)

app.get('/api/pages', async (req, res) => {
    try {
        const pages = await db.all('SELECT * FROM pages WHERE visible = 1');
        res.json(pages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pages', async (req, res) => {
    try {
        const { slug, title, content } = req.body;
        await db.run('INSERT OR REPLACE INTO pages (slug, title, content) VALUES (?, ?, ?)', [slug, title, content]);
        res.json({ message: 'Page updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
