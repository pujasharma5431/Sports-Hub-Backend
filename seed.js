const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function seed() {
    const dbPath = path.resolve(__dirname, 'elite_sports.db');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const products = [
        {
            name: "Nepal National Home Jersey 2026",
            brand: "Kelme",
            price: 3200,
            description: "Authentic Nepal National Team Home Jersey with moisture-wicking technology and ventilated mesh panels.",
            category: "Jerseys",
            audience: "Unisex",
            player: "",
            images: JSON.stringify(["https://images.unsplash.com/photo-1577224969296-c27e7cb3d676?q=80&w=800", "https://images.unsplash.com/photo-1551854838-212c50b4c184?q=80&w=800"]),
            stock: JSON.stringify({ S: 10, M: 20, L: 15, XL: 5 })
        },
        {
            name: "Real Madrid 2026 Home Kit",
            brand: "Adidas",
            price: 5500,
            description: "Official Real Madrid Home Kit. White elegance with golden accents.",
            category: "Jerseys",
            audience: "Men",
            player: "Bellingham",
            images: JSON.stringify(["https://images.unsplash.com/photo-1616611090412-f2732049e7fa?q=80&w=800"]),
            stock: JSON.stringify({ S: 5, M: 10, L: 10, XL: 8 })
        },
        {
            name: "Manchester City Away 2026",
            brand: "Puma",
            price: 4800,
            description: "The official away kit of the champions. Lightweight and breathable for elite sports.",
            category: "Jerseys",
            audience: "Unisex",
            player: "Haaland",
            images: JSON.stringify(["https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800"]),
            stock: JSON.stringify({ S: 2, M: 5, L: 5, XL: 2 })
        }
    ];

    for (const p of products) {
        await db.run(
            'INSERT INTO products (name, brand, price, description, category, audience, player, images, stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [p.name, p.brand, p.price, p.description, p.category, p.audience, p.player, p.images, p.stock]
        );
    }

    // Add About page
    await db.run('INSERT OR REPLACE INTO pages (slug, title, content) VALUES (?, ?, ?)', [
        'about',
        'About Elite Sports Hub',
        '<p>Elite Sports Hub is Nepal\'s premium destination for authentic jerseys and sporting gear. We specialize in high-quality performance wear for athletes and fans who demand the best.</p><p>Located in the heart of Kathmandu, we deliver nationwide with a focus on quality and authenticity.</p>'
    ]);

    console.log("Database seeded!");
    await db.close();
}

seed();
