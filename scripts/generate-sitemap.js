// scripts/generate-sitemap.js — Automated Dynamic XML Sitemap Generator for XORONIQ.store

const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://xoroniq.store';
const TODAY = new Date().toISOString().split('T')[0];

// 1. Static Core Pages
const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/shop.html', priority: '0.9', changefreq: 'daily' },
    { url: '/about.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/contact.html', priority: '0.7', changefreq: 'monthly' },
    { url: '/faq.html', priority: '0.8', changefreq: 'weekly' },
    { url: '/order-tracking.html', priority: '0.6', changefreq: 'monthly' },
    { url: '/wishlist.html', priority: '0.5', changefreq: 'weekly' },
];

// 2. Policy Pages
const policyPages = [
    { url: '/policies/shipping.html', priority: '0.5', changefreq: 'monthly' },
    { url: '/policies/returns.html', priority: '0.5', changefreq: 'monthly' },
    { url: '/policies/privacy.html', priority: '0.5', changefreq: 'monthly' },
    { url: '/policies/terms.html', priority: '0.5', changefreq: 'monthly' },
    { url: '/policies/cancellation.html', priority: '0.5', changefreq: 'monthly' },
];

// 3. Category Pages
const categoryPages = [
    { slug: 'electronics', name: 'Electronics & Smart Gear', priority: '0.85', changefreq: 'daily' },
    { slug: 'home-kitchen', name: 'Home & Smart Living', priority: '0.85', changefreq: 'daily' },
    { slug: 'fashion', name: 'Modern Apparel & Luxe', priority: '0.80', changefreq: 'weekly' },
    { slug: 'beauty', name: 'Beauty & Daily Care', priority: '0.80', changefreq: 'weekly' },
    { slug: 'accessories', name: 'Everyday Carry & Travel', priority: '0.80', changefreq: 'weekly' },
    { slug: 'lifestyle', name: 'Fitness & Wellness', priority: '0.80', changefreq: 'weekly' },
];

// 4. Products Extractor (Parses DEMO_PRODUCTS from config.js)
function getProducts() {
    try {
        const configPath = path.join(__dirname, '..', 'js', 'config.js');
        const content = fs.readFileSync(configPath, 'utf8');

        // Extract DEMO_PRODUCTS block
        const demoBlockMatch = content.match(/export\s+const\s+DEMO_PRODUCTS\s*=\s*\[([\s\S]*?)\];/);
        if (!demoBlockMatch) return [];

        const demoBlock = demoBlockMatch[1];
        const products = [];

        // Match individual product objects inside DEMO_PRODUCTS
        const itemRegex = /\{[\s\S]*?id:\s*["']([^"']+)["'][\s\S]*?name:\s*["']([^"']+)["'][\s\S]*?slug:\s*["']([^"']+)["'][\s\S]*?sellingPrice:\s*(\d+)[\s\S]*?primaryImage:\s*["']([^"']+)["'][\s\S]*?\}/g;
        let match;
        while ((match = itemRegex.exec(demoBlock)) !== null) {
            products.push({
                id: match[1],
                name: match[2],
                slug: match[3],
                price: match[4],
                image: match[5]
            });
        }
        return products;
    } catch (e) {
        console.warn("[Sitemap] Could not parse config.js for products:", e);
        return [];
    }
}

function generateSitemapXml() {
    const products = getProducts();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n\n`;

    // 1. Static Pages
    xml += `  <!-- Static Main Pages -->\n`;
    staticPages.forEach(p => {
        xml += `  <url>\n`;
        xml += `    <loc>${DOMAIN}${p.url}</loc>\n`;
        xml += `    <lastmod>${TODAY}</lastmod>\n`;
        xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
        xml += `    <priority>${p.priority}</priority>\n`;
        xml += `  </url>\n`;
    });

    // 2. Categories
    xml += `\n  <!-- Category Listing Pages -->\n`;
    categoryPages.forEach(c => {
        xml += `  <url>\n`;
        xml += `    <loc>${DOMAIN}/category/${c.slug}</loc>\n`;
        xml += `    <lastmod>${TODAY}</lastmod>\n`;
        xml += `    <changefreq>${c.changefreq}</changefreq>\n`;
        xml += `    <priority>${c.priority}</priority>\n`;
        xml += `  </url>\n`;
    });

    // 3. Products with Image Extensions for Google Image Indexing
    xml += `\n  <!-- Product Pages & Rich Images -->\n`;
    products.forEach(p => {
        xml += `  <url>\n`;
        xml += `    <loc>${DOMAIN}/products/${p.slug}</loc>\n`;
        xml += `    <lastmod>${TODAY}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.9</priority>\n`;
        if (p.image) {
            xml += `    <image:image>\n`;
            xml += `      <image:loc>${escapeXml(p.image)}</image:loc>\n`;
            xml += `      <image:title>${escapeXml(p.name)} — XORONIQ</image:title>\n`;
            xml += `      <image:caption>${escapeXml(p.name)} available at XORONIQ.store for ₹${p.price}</image:caption>\n`;
            xml += `    </image:image>\n`;
        }
        xml += `  </url>\n`;
    });

    // 4. Policy Pages
    xml += `\n  <!-- Store Policy Pages -->\n`;
    policyPages.forEach(p => {
        xml += `  <url>\n`;
        xml += `    <loc>${DOMAIN}${p.url}</loc>\n`;
        xml += `    <lastmod>${TODAY}</lastmod>\n`;
        xml += `    <changefreq>${p.changefreq}</changefreq>\n`;
        xml += `    <priority>${p.priority}</priority>\n`;
        xml += `  </url>\n`;
    });

    xml += `</urlset>\n`;
    return xml;
}

function escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, c => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function run() {
    const sitemapContent = generateSitemapXml();
    const outputPath = path.join(__dirname, '..', 'sitemap.xml');
    fs.writeFileSync(outputPath, sitemapContent, 'utf8');
    console.log(`✅ Sitemap successfully generated at: ${outputPath}`);
}

run();
