const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5001;

// Load simple .env (without extra dependencies)
// This keeps local development working when you create `server/.env`.
try {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const raw = fs.readFileSync(envPath, 'utf8');
        raw.split(/\r?\n/).forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx === -1) return;
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            val = val.replace(/^['"]/, '').replace(/['"]$/, '');
            if (process.env[key] === undefined) process.env[key] = val;
        });
    }
} catch (e) {
    // Ignore .env load errors; we can still rely on real environment variables.
}

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads folder exists
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/EliteSportsHub'
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Successfully'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// --- SCHEMAS & MODELS ---

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: String,
    price: { type: Number, required: true },
    discount_price: { type: Number, default: null },
    is_sale: { type: Boolean, default: false },
    is_limited: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    description: String,
    category: String,
    audience: { type: String, default: 'Unisex' },
    player: String,
    images: [String],
    stock: {
        S: { type: Number, default: 0 },
        M: { type: Number, default: 0 },
        L: { type: Number, default: 0 },
        XL: { type: Number, default: 0 },
        '2XL': { type: Number, default: 0 }
    },
    created_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

const OrderSchema = new mongoose.Schema({
    customer_name: String,
    phone: String,
    email: String,
    district: String,
    location: String,
    landmark: String,
    items: [{
        product_id: mongoose.Schema.Types.ObjectId,
        name: String,
        price: Number,
        quantity: Number,
        size: String
    }],
    total_amount: Number,
    payment_method: String,
    status: { type: String, default: 'Pending' },
    created_at: { type: Date, default: Date.now }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

const PageSchema = new mongoose.Schema({
    slug: { type: String, unique: true },
    title: String,
    content: String,
    visible: { type: Boolean, default: true }
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

// Virtual for ID
ProductSchema.virtual('id').get(function() { return this._id.toHexString(); });
OrderSchema.virtual('id').get(function() { return this._id.toHexString(); });
PageSchema.virtual('id').get(function() { return this._id.toHexString(); });

const Product = mongoose.model('Product', ProductSchema);
const Order = mongoose.model('Order', OrderSchema);
const Page = mongoose.model('Page', PageSchema);

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

// --- API ROUTES ---

// 1. PRODUCTS

app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ created_at: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json(product);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', upload.array('images', 10), async (req, res) => {
    try {
        const { name, brand, price, discount_price, is_sale, is_limited, featured, description, category, audience, player, stock, remote_urls, file_order } = req.body;
        
        const processedLocalImages = [];
        for (const file of (req.files || [])) {
            try {
                const fileName = `processed-${Date.now()}-${file.originalname.split('.')[0]}.webp`;
                const filePath = path.join(__dirname, 'uploads', fileName);
                await sharp(file.path).webp({ quality: 80 }).toFile(filePath);
                fs.unlinkSync(file.path);
                processedLocalImages.push(`/uploads/${fileName}`);
            } catch (err) {
                processedLocalImages.push(`/uploads/${path.basename(file.path)}`);
            }
        }

        const combined = [];
        const parsedRemoteUrls = JSON.parse(remote_urls || '[]');
        const parsedFileOrder = JSON.parse(file_order || '[]');

        parsedRemoteUrls.forEach(item => {
            combined[item.position] = item.url;
        });

        parsedFileOrder.forEach((item, idx) => {
            combined[item.position] = processedLocalImages[idx];
        });

        const imagesList = combined.filter(x => x);

        const newProduct = new Product({
            name, brand, price, discount_price, is_sale, is_limited, description, category, audience, player,
            featured: featured === true || featured === 'true' || featured === 1 || featured === '1',
            images: imagesList,
            stock: JSON.parse(stock || '{}')
        });

        await newProduct.save();
        res.json({ id: newProduct._id, message: 'Product created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', upload.array('images', 10), async (req, res) => {
    try {
        const { name, brand, price, discount_price, is_sale, is_limited, featured, description, category, audience, player, stock, remote_urls, file_order } = req.body;
        
        const processedLocalImages = [];
        for (const file of (req.files || [])) {
            try {
                const fileName = `processed-${Date.now()}-${file.originalname.split('.')[0]}.webp`;
                const filePath = path.join(__dirname, 'uploads', fileName);
                await sharp(file.path).webp({ quality: 80 }).toFile(filePath);
                fs.unlinkSync(file.path);
                processedLocalImages.push(`/uploads/${fileName}`);
            } catch (err) {
                processedLocalImages.push(`/uploads/${path.basename(file.path)}`);
            }
        }

        const combined = [];
        const parsedRemoteUrls = JSON.parse(remote_urls || '[]');
        const parsedFileOrder = JSON.parse(file_order || '[]');

        parsedRemoteUrls.forEach(item => {
            combined[item.position] = item.url;
        });

        parsedFileOrder.forEach((item, idx) => {
            combined[item.position] = processedLocalImages[idx];
        });

        const imagesList = combined.filter(x => x);

        const updateData = {
            name, brand, price, discount_price, is_sale, is_limited, description, category, audience, player,
            images: imagesList,
            stock: JSON.parse(stock || '{}')
        };

        // IMPORTANT: don't wipe `featured` unless the admin explicitly sends it.
        if (featured !== undefined) {
            updateData.featured = featured === true || featured === 'true' || featured === 1 || featured === '1';
        }

        const product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: toggle featured (for Home Featured Jerseys)
app.put('/api/admin/products/:id/featured', async (req, res) => {
    try {
        const featured = req.body?.featured === true || req.body?.featured === 'true' || req.body?.featured === 1 || req.body?.featured === '1';
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { featured },
            { new: true }
        );
        if (!product) return res.status(404).json({ error: 'Product not found' });
        res.json({ message: 'Featured updated', product });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. ORDERS

app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        const newOrder = new Order({
            ...orderData,
            items: orderData.items // Directly use parsed items from body
        });
        await newOrder.save();
        res.json({ id: newOrder._id, message: 'Order placed successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ created_at: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await Order.findByIdAndUpdate(req.params.id, { status });
        res.json({ message: 'Order status updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. PAGES

app.get('/api/pages', async (req, res) => {
    try {
        const pages = await Page.find({ visible: true }).lean();
        const normalized = pages.map(p => {
            if (p.slug === 'about' && typeof p.content === 'string') {
                // Replace old location text even if DB already has it seeded.
                p.content = p.content.replace(/Kathmandu/gi, 'Butwal');
            }
            return p;
        });
        res.json(normalized);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pages', async (req, res) => {
    try {
        const { slug, title, content } = req.body;
        await Page.findOneAndUpdate({ slug }, { title, content, visible: true }, { upsert: true });
        res.json({ message: 'Page updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === 'adminElite2026') {
        res.json({ success: true, token: 'admin-secret-token' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Admin Password' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
