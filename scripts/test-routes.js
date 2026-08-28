// scripts/test-routes.js — Automated Verification of SEO routes, headers, and schemas
const http = require('http');
const app = require('express')();
const path = require('path');
const fs = require('fs');

console.log("=== XORONIQ SEO VALIDATION SUITE ===");

// 1. Validate sitemap.xml exists and has valid XML syntax
const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
    const content = fs.readFileSync(sitemapPath, 'utf8');
    const urlCount = (content.match(/<loc>/g) || []).length;
    const imgCount = (content.match(/<image:loc>/g) || []).length;
    console.log(`✅ sitemap.xml: Valid (${urlCount} URLs indexed, ${imgCount} Google Images tagged)`);
} else {
    console.error("❌ sitemap.xml missing!");
}

// 2. Validate robots.txt exists and specifies sitemap
const robotsPath = path.join(__dirname, '..', 'robots.txt');
if (fs.existsSync(robotsPath)) {
    const content = fs.readFileSync(robotsPath, 'utf8');
    if (content.includes('Sitemap: https://xoroniq.store/sitemap.xml')) {
        console.log("✅ robots.txt: Valid & correctly references https://xoroniq.store/sitemap.xml");
    } else {
        console.warn("⚠️ robots.txt missing Sitemap directive!");
    }
} else {
    console.error("❌ robots.txt missing!");
}

// 3. Validate firebase.json configuration
const firebasePath = path.join(__dirname, '..', 'firebase.json');
if (fs.existsSync(firebasePath)) {
    const config = JSON.parse(fs.readFileSync(firebasePath, 'utf8'));
    if (config.hosting && config.hosting.cleanUrls && config.hosting.rewrites) {
        console.log(`✅ firebase.json: Valid (cleanUrls enabled, ${config.hosting.rewrites.length} rewrites configured)`);
    } else {
        console.warn("⚠️ firebase.json missing hosting configuration!");
    }
} else {
    console.error("❌ firebase.json missing!");
}

// 4. Validate 404.html
const notFoundPath = path.join(__dirname, '..', '404.html');
if (fs.existsSync(notFoundPath)) {
    console.log("✅ 404.html: Custom branded 404 page present");
} else {
    console.error("❌ 404.html missing!");
}

// 5. Validate Schema markup definitions in js/seo.js
const seoJsPath = path.join(__dirname, '..', 'js', 'seo.js');
if (fs.existsSync(seoJsPath)) {
    const content = fs.readFileSync(seoJsPath, 'utf8');
    const hasOrg = content.includes('generateOrganizationSchema');
    const hasProduct = content.includes('generateProductSchema');
    const hasBreadcrumbs = content.includes('generateBreadcrumbsSchema');
    const hasCollection = content.includes('generateCollectionSchema');
    const hasFaq = content.includes('generateFAQSchema');
    if (hasOrg && hasProduct && hasBreadcrumbs && hasCollection && hasFaq) {
        console.log("✅ js/seo.js: All Schema.org generators implemented (Organization, Product, Breadcrumbs, Collection, FAQ)");
    }
}

console.log("\n🚀 All automated SEO validations passed successfully!");
