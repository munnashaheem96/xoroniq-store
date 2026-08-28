// js/products.js — Shop Page Filtering, Sorting, Listing & Dynamic Category SEO for XORONIQ

import { getProducts, getCategories, searchProducts } from './db.js';
import { renderProductCard, showSkeletons, showToast, getUrlParam, addToCart, updateHeaderBadges } from './app.js';
import { APP_CONFIG, SORT_OPTIONS } from './config.js';
import { updateMetaTags, injectJsonLd, generateCollectionSchema, generateBreadcrumbsSchema, SITE_SEO } from './seo.js';

// ── State ──
let activeFilters = {
    category: '',
    minPrice: 0,
    maxPrice: Infinity,
    minDiscount: 0,
    minRating: 0,
    inStock: false
};
let currentSort = 'featured';
let categoriesList = [];

// ── DOM References ──
const grid = document.getElementById('products-grid');
const resultsCount = document.getElementById('results-count');
const sortSelect = document.getElementById('sort-select');
const clearFiltersBtn = document.getElementById('clear-filters');
const activeFiltersWrap = document.getElementById('active-filters');

/**
 * Extract Category identifier from Pathname (/category/:slug) or Query string (?category=...)
 */
function getCategoryFromUrl() {
    const queryCategory = getUrlParam('category');
    if (queryCategory) return queryCategory;

    const pathname = window.location.pathname;
    const match = pathname.match(/\/category\/([^/?#]+)/i);
    if (match && match[1]) {
        return decodeURIComponent(match[1]).replace(/\.html$/i, '');
    }
    return '';
}

export async function initShop() {
    updateHeaderBadges();

    // Read URL Params & Path
    const urlCategory = getCategoryFromUrl();
    const urlSort = getUrlParam('sort') || 'featured';
    const urlQ = getUrlParam('q') || getUrlParam('search') || '';

    if (urlSort) {
        currentSort = urlSort === 'trending' ? 'popular' : urlSort === 'discount' ? 'discount' : urlSort;
        if (sortSelect) {
            sortSelect.value = currentSort;
        }
    }

    if (urlCategory) activeFilters.category = urlCategory;

    await loadCategories(urlCategory);

    if (urlQ) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.value = urlQ;
        const shopTitle = document.getElementById('shop-page-title');
        if (shopTitle) shopTitle.textContent = `Search results for "${urlQ}"`;
        const breadcrumb = document.getElementById('breadcrumb-current');
        if (breadcrumb) breadcrumb.textContent = `Search: ${urlQ}`;
        
        updateMetaTags({
            title: `Search: "${urlQ}" — XORONIQ Store`,
            description: `Browse matching products for "${urlQ}" at XORONIQ. Best prices in India, Fast Shipping & COD available.`,
            canonicalUrl: `/shop.html?q=${encodeURIComponent(urlQ)}`,
            noindex: true
        });

        await handleSearch(urlQ);
    } else {
        await loadProducts();
    }

    bindFilterEvents();
}

async function loadCategories(activeCategory = '') {
    const container = document.getElementById('category-filter-options');
    if (!container) return;

    try {
        categoriesList = await getCategories(true);
        container.innerHTML = `
            <label class="filter-option">
                <input type="radio" name="category" value="" ${!activeCategory ? 'checked' : ''}> All Collections
            </label>
            ${categoriesList.map(c => `
                <label class="filter-option">
                    <input type="radio" name="category" value="${c.id}" ${activeCategory === c.id || activeCategory === c.slug ? 'checked' : ''}>
                    ${c.name}
                </label>
            `).join('')}
        `;

        container.querySelectorAll('input[name="category"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                activeFilters.category = e.target.value;
                loadProducts();
            });
        });
    } catch (err) {
        console.warn("[products.js] loadCategories failed:", err);
    }
}

async function handleSearch(query) {
    if (!grid) return;
    showSkeletons(grid, 8);
    const results = await searchProducts(query, 50);
    renderResults(results);
}

export async function loadProducts() {
    if (!grid) return;
    showSkeletons(grid, 8);

    let sortField = "createdAt";
    let sortDir = "desc";

    if (currentSort === "price_asc") {
        sortField = "sellingPrice";
        sortDir = "asc";
    } else if (currentSort === "price_desc") {
        sortField = "sellingPrice";
        sortDir = "desc";
    } else if (currentSort === "discount") {
        sortField = "discount";
        sortDir = "desc";
    } else if (currentSort === "rating") {
        sortField = "rating";
        sortDir = "desc";
    } else if (currentSort === "popular") {
        sortField = "reviewCount";
        sortDir = "desc";
    }

    const { products } = await getProducts({
        categoryId: activeFilters.category,
        sortField,
        sortDir,
        pageSize: 100,
        activeOnly: true
    });

    // Apply secondary in-memory filters
    let filtered = products.filter(p => {
        const price = p.sellingPrice || 0;
        if (price < activeFilters.minPrice || price > activeFilters.maxPrice) return false;

        const disc = p.mrp && p.sellingPrice ? Math.round(((p.mrp - p.sellingPrice) / p.mrp) * 100) : 0;
        if (disc < activeFilters.minDiscount) return false;

        if ((p.rating || 0) < activeFilters.minRating) return false;
        if (activeFilters.inStock && (p.stock || 0) <= 0) return false;

        return true;
    });

    renderResults(filtered);
    renderActiveFilterBadges();
    applyCategorySEO(activeFilters.category, filtered);
}

function applyCategorySEO(categoryId, productList) {
    const categoryObj = categoriesList.find(c => c.id === categoryId || c.slug === categoryId);
    const titleEl = document.getElementById('shop-page-title');
    const breadcrumbEl = document.getElementById('breadcrumb-current');

    let pageTitle = "Shop All Products — XORONIQ Catalog";
    let pageDesc = "Explore our complete catalog of trending smart electronics, aesthetic home organizers, and lifestyle accessories. Free shipping across India on orders above ₹999.";
    let canonical = "/shop.html";

    if (categoryObj) {
        pageTitle = `${categoryObj.name} — Buy Online at Best Price | XORONIQ`;
        pageDesc = categoryObj.description || `Discover trending ${categoryObj.name} products at XORONIQ. Premium quality, best online prices in India, fast delivery & Cash on Delivery.`;
        canonical = `/category/${categoryObj.slug || categoryObj.id}`;

        if (titleEl) titleEl.textContent = categoryObj.name;
        if (breadcrumbEl) breadcrumbEl.textContent = categoryObj.name;
    } else if (titleEl) {
        titleEl.textContent = "All Products";
        if (breadcrumbEl) breadcrumbEl.textContent = "All Products";
    }

    // Update Meta & OpenGraph
    updateMetaTags({
        title: pageTitle,
        description: pageDesc,
        canonicalUrl: canonical,
        keywords: `${categoryObj ? categoryObj.name + ', ' : ''}trending products online, smart gadgets, kitchen organizers, lifestyle products india`,
        ogType: "website"
    });

    // CollectionPage Schema
    const collectionSchema = generateCollectionSchema(pageTitle, pageDesc, productList, canonical);
    injectJsonLd(collectionSchema, "schema-collection");

    // Breadcrumb Schema
    const breadcrumbItems = [
        { name: "Home", url: "/" },
        { name: "Shop", url: "/shop.html" }
    ];
    if (categoryObj) {
        breadcrumbItems.push({ name: categoryObj.name, url: `/category/${categoryObj.slug || categoryObj.id}` });
    }
    injectJsonLd(generateBreadcrumbsSchema(breadcrumbItems), "schema-breadcrumbs");
}

function renderResults(products) {
    if (!grid) return;

    if (resultsCount) {
        resultsCount.textContent = `Showing ${products.length} product${products.length === 1 ? '' : 's'}`;
    }

    if (!products.length) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;background:#FFFFFF;border-radius:var(--radius-xl);border:1px dashed var(--color-border);">
                <div style="font-size:3rem;margin-bottom:12px;">🔍</div>
                <h3 style="font-size:1.25rem;font-weight:700;margin-bottom:8px;">No matching products found</h3>
                <p style="color:var(--color-text-secondary);font-size:0.9375rem;margin-bottom:20px;">Try adjusting your filter options or search terms.</p>
                <button class="btn btn-outline btn-sm" id="reset-all-filters-btn">Reset All Filters</button>
            </div>
        `;
        document.getElementById('reset-all-filters-btn')?.addEventListener('click', resetFilters);
        return;
    }

    grid.innerHTML = products.map(renderProductCard).join('');
}

function renderActiveFilterBadges() {
    if (!activeFiltersWrap) return;
    const badges = [];

    if (activeFilters.category) {
        const cat = categoriesList.find(c => c.id === activeFilters.category || c.slug === activeFilters.category);
        badges.push({ key: 'category', label: `Category: ${cat?.name || activeFilters.category}` });
    }
    if (activeFilters.minPrice > 0 || activeFilters.maxPrice < Infinity) {
        badges.push({ key: 'price', label: `Price: ₹${activeFilters.minPrice} - ₹${activeFilters.maxPrice === Infinity ? '+' : activeFilters.maxPrice}` });
    }
    if (activeFilters.minDiscount > 0) {
        badges.push({ key: 'discount', label: `Min ${activeFilters.minDiscount}% OFF` });
    }
    if (activeFilters.minRating > 0) {
        badges.push({ key: 'rating', label: `${activeFilters.minRating}★ & Above` });
    }

    if (badges.length === 0) {
        activeFiltersWrap.innerHTML = '';
        if (clearFiltersBtn) clearFiltersBtn.style.display = 'none';
        return;
    }

    if (clearFiltersBtn) clearFiltersBtn.style.display = 'inline-flex';
    activeFiltersWrap.innerHTML = badges.map(b => `
        <span class="badge badge-primary" style="padding:6px 12px;cursor:pointer;" data-key="${b.key}">
            ${b.label} <span style="margin-left:4px;font-weight:800;">✕</span>
        </span>
    `).join('');

    activeFiltersWrap.querySelectorAll('.badge').forEach(el => {
        el.addEventListener('click', () => {
            const key = el.dataset.key;
            if (key === 'category') {
                activeFilters.category = '';
                const allCatRadio = document.querySelector('input[name="category"][value=""]');
                if (allCatRadio) allCatRadio.checked = true;
            }
            if (key === 'price') { activeFilters.minPrice = 0; activeFilters.maxPrice = Infinity; }
            if (key === 'discount') activeFilters.minDiscount = 0;
            if (key === 'rating') activeFilters.minRating = 0;
            loadProducts();
        });
    });
}

function resetFilters() {
    activeFilters = { category: '', minPrice: 0, maxPrice: Infinity, minDiscount: 0, minRating: 0, inStock: false };
    const minInput = document.getElementById('price-min');
    const maxInput = document.getElementById('price-max');
    if (minInput) minInput.value = '';
    if (maxInput) maxInput.value = '';
    document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(i => i.checked = false);
    const allCatRadio = document.querySelector('input[name="category"][value=""]');
    if (allCatRadio) allCatRadio.checked = true;
    loadProducts();
}

function bindFilterEvents() {
    sortSelect?.addEventListener('change', () => {
        currentSort = sortSelect.value;
        loadProducts();
    });

    document.getElementById('apply-price')?.addEventListener('click', () => {
        const min = parseFloat(document.getElementById('price-min')?.value) || 0;
        const max = parseFloat(document.getElementById('price-max')?.value) || Infinity;
        activeFilters.minPrice = min;
        activeFilters.maxPrice = max;
        loadProducts();
    });

    clearFiltersBtn?.addEventListener('click', resetFilters);

    // Mobile filter drawer toggle
    const mobileFilterBtn = document.getElementById('mobile-filter-btn');
    const filtersSidebar = document.getElementById('filters-sidebar');
    if (mobileFilterBtn && filtersSidebar) {
        mobileFilterBtn.addEventListener('click', () => {
            filtersSidebar.classList.toggle('mobile-open');
        });
    }
}

// Auto-run if on shop page
if (document.getElementById('products-grid')) {
    initShop();
}
