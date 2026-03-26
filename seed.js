const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: String,
    price: { type: Number, required: true },
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
});

const PageSchema = new mongoose.Schema({
    slug: { type: String, unique: true },
    title: String,
    content: String,
    visible: { type: Boolean, default: true }
});

const Product = mongoose.model('Product', ProductSchema);
const Page = mongoose.model('Page', PageSchema);

async function seed() {
    await mongoose.connect('mongodb://localhost:27017/EliteSportsHub');
    
    // Clear existing data
    await Product.deleteMany({});
    await Page.deleteMany({});

    const products = [
        {
            name: "Nepal National Home Jersey 2026",
            brand: "Kelme",
            price: 3200,
            description: "Authentic Nepal National Team Home Jersey with moisture-wicking technology and ventilated mesh panels.",
            category: "Jerseys",
            audience: "Unisex",
            player: "",
            featured: true,
            images: ["https://images.unsplash.com/photo-1577224969296-c27e7cb3d676?q=80&w=800", "https://images.unsplash.com/photo-1551854838-212c50b4c184?q=80&w=800"],
            stock: { S: 10, M: 20, L: 15, XL: 5 }
        },
        {
            name: "Real Madrid 2026 Home Kit",
            brand: "Adidas",
            price: 5500,
            description: "Official Real Madrid Home Kit. White elegance with golden accents.",
            category: "Jerseys",
            audience: "Men",
            player: "Bellingham",
            featured: false,
            images: ["https://images.unsplash.com/photo-1616611090412-f2732049e7fa?q=80&w=800"],
            stock: { S: 5, M: 10, L: 10, XL: 8 }
        },
        {
            name: "Manchester City Away 2026",
            brand: "Puma",
            price: 4800,
            description: "The official away kit of the champions. Lightweight and breathable for elite sports.",
            category: "Jerseys",
            audience: "Unisex",
            player: "Haaland",
            featured: false,
            images: ["https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800"],
            stock: { S: 2, M: 5, L: 5, XL: 2 }
        }
    ];

    await Product.insertMany(products);

    await Page.findOneAndUpdate(
        { slug: 'about' },
        { 
            title: 'About Elite Sports Hub', 
            content: '<p>Elite Sports Hub is Nepal\'s premium destination for authentic jerseys and sporting gear. We specialize in high-quality performance wear for athletes and fans who demand the best.</p><p>Located in the heart of Kathmandu, we deliver nationwide with a focus on quality and authenticity.</p>',
            visible: true
        },
        { upsert: true }
    );

    console.log("MongoDB Seeded!");
    process.exit();
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
