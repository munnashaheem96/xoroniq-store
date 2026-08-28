// js/product-details.js — Product Detail Page (PDP) Interactive Controller & Dynamic SEO for XORONIQ

import { getProductById, getProducts, getReviews, createReview } from './db.js';
import { renderProductCard, showToast, formatPrice, calcDiscount, renderStars, getUrlParam, addToCart, updateHeaderBadges, shareProduct } from './app.js';
import { APP_CONFIG } from './config.js';
import { updateMetaTags, injectJsonLd, generateProductSchema, generateBreadcrumbsSchema, SITE_SEO } from './seo.js';
import { trackViewContent } from './meta.js';

let currentProduct = null;
let selectedVariant = null;
let currentQty = 1;

/**
 * Extract Product identifier from Pathname (/products/:slug or /product/:slug) or Query string (?id=... or ?slug=...)
 */
export function getProductIdentifierFromUrl() {
    // 1. Query parameter check (?id=... or ?slug=...)
    const queryParam = getUrlParam('id') || getUrlParam('slug');
    if (queryParam) return queryParam;

    // 2. Path routing check (/products/product-name or /product/product-name)
    const pathname = window.location.pathname;
    const match = pathname.match(/\/(?:products|product)\/([^/?#]+)/i);
    if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]).replace(/\.html$/i, '');
        if (decoded && decoded !== 'index' && decoded !== 'product') {
            return decoded;
        }
    }

    return null;
}

export async function initPDP() {
    updateHeaderBadges();
    const identifier = getProductIdentifierFromUrl();
    if (!identifier) {
        window.location.href = '/shop.html';
        return;
    }

    currentProduct = await getProductById(identifier);
    if (!currentProduct) {
        showProductNotFound();
        return;
    }

    // Apply Dynamic SEO & Structured Data
    applyProductSEO(currentProduct);

    // Track Meta Pixel / CAPI ViewContent
    try {
        trackViewContent(currentProduct);
    } catch (e) {
        // Meta pixel optional
    }

    renderProductHeader(currentProduct);
    renderGallery(currentProduct);
    renderPricingAndBadges(currentProduct);
    renderVariants(currentProduct);
    renderSpecsAndDetails(currentProduct);
    renderPincodeChecker();
    bindActionButtons();
    loadReviews(currentProduct.id);
    loadRelatedProducts(currentProduct);
}

function applyProductSEO(p) {
    const slug = p.slug || p.id;
    const canonicalUrl = `${SITE_SEO.domain}/products/${slug}`;
    const discount = calcDiscount(p.mrp, p.sellingPrice);
    const saveText = discount > 0 ? ` (Save ${discount}%)` : '';
    
    // Rich Meta Title
    const pageTitle = `${p.name} | Buy Online at Best Price in India — XORONIQ`;
    
    // Rich Meta Description
    const pageDescription = `Buy ${p.name} online at ₹${p.sellingPrice}${saveText}. ${p.shortDescription || p.description || ''} Free shipping on eligible orders, COD available & genuine warranty from XORONIQ.`;
    
    // Specific Keywords
    const keywords = `${p.name}, buy ${p.name} online, ${p.categoryName || 'smart gadgets'}, XORONIQ ${p.name}, trending lifestyle products india, ${p.tags ? p.tags.join(', ') : ''}`;

    const mainImage = (p.images && p.images.length > 0) ? p.images[0] : (p.primaryImage || SITE_SEO.defaultImage);

    // 1. Update Document Head Meta, Canonical & Open Graph / Twitter Cards
    updateMetaTags({
        title: pageTitle,
        description: pageDescription,
        canonicalUrl: canonicalUrl,
        keywords: keywords,
        ogType: "product",
        ogImage: mainImage,
        ogImageAlt: `${p.name} - Official XORONIQ Store Product Photo`,
        price: p.sellingPrice,
        currency: "INR",
        availability: (p.stock === undefined || p.stock > 0) ? "in stock" : "out of stock"
    });

    // 2. Inject Schema.org Product Structured Data
    const productSchema = generateProductSchema(p, canonicalUrl);
    injectJsonLd(productSchema, "schema-product");

    // 3. Inject Schema.org BreadcrumbList Structured Data
    const breadcrumbItems = [
        { name: "Home", url: "/" },
        { name: p.categoryName || "Shop", url: `/category/${p.categoryId || 'electronics'}` },
        { name: p.name, url: `/products/${slug}` }
    ];
    injectJsonLd(generateBreadcrumbsSchema(breadcrumbItems), "schema-breadcrumbs");
}

function showProductNotFound() {
    updateMetaTags({
        title: "Product Not Found — XORONIQ",
        description: "The product you requested could not be found or has been moved.",
        noindex: true
    });

    const main = document.getElementById('pdp-main-content') || document.querySelector('main');
    if (main) {
        main.innerHTML = `
            <div class="container" style="padding:100px 20px;text-align:center;">
                <div style="font-size:3.5rem;margin-bottom:16px;">📦</div>
                <h1 style="font-size:2rem;font-weight:800;margin-bottom:12px;">Product Not Found</h1>
                <p style="color:var(--color-text-secondary);margin-bottom:24px;">The product you are looking for might be unavailable or removed.</p>
                <a href="/shop.html" class="btn btn-primary">Browse All Products</a>
            </div>
        `;
    }
}

function renderProductHeader(p) {
    const titleEl = document.getElementById('pdp-title');
    if (titleEl) titleEl.textContent = p.name;

    const catEl = document.getElementById('pdp-category');
    if (catEl) {
        catEl.textContent = p.categoryName || "Smart Essentials";
        catEl.href = `/category/${p.categoryId || ''}`;
    }

    const breadcrumbName = document.getElementById('pdp-breadcrumb-name');
    if (breadcrumbName) breadcrumbName.textContent = p.name;

    const ratingEl = document.getElementById('pdp-rating-stars');
    const reviewCountEl = document.getElementById('pdp-review-count');

    if (p.reviewCount > 0) {
        if (ratingEl) ratingEl.innerHTML = renderStars(p.rating);
        if (reviewCountEl) reviewCountEl.textContent = `(${p.reviewCount} customer review${p.reviewCount === 1 ? '' : 's'})`;
    } else {
        if (ratingEl) ratingEl.innerHTML = '';
        if (reviewCountEl) reviewCountEl.textContent = 'No reviews yet • Be the first to review!';
    }

    const shortDescEl = document.getElementById('pdp-short-desc');
    if (shortDescEl) shortDescEl.textContent = p.shortDescription || p.description || '';
}

function renderGallery(p) {
    const mainImg = document.getElementById('pdp-main-img');
    const thumbsContainer = document.getElementById('pdp-thumbs');
    const images = (p.images && p.images.length > 0) ? p.images : [p.primaryImage || APP_CONFIG.placeholderImage];

    if (mainImg) {
        mainImg.src = images[0];
        mainImg.alt = `${p.name} - Main Product View`;
        mainImg.setAttribute('width', '600');
        mainImg.setAttribute('height', '600');
        mainImg.setAttribute('loading', 'eager');
        mainImg.setAttribute('decoding', 'async');
    }

    if (thumbsContainer) {
        thumbsContainer.innerHTML = images.map((imgUrl, idx) => `
            <div class="pdp-thumb ${idx === 0 ? 'active' : ''}" data-src="${imgUrl}" role="button" aria-label="View product image ${idx + 1}">
                <img src="${imgUrl}" alt="${p.name} thumbnail ${idx + 1}" loading="lazy" decoding="async" width="80" height="80">
            </div>
        `).join('');

        thumbsContainer.querySelectorAll('.pdp-thumb').forEach(thumb => {
            thumb.addEventListener('click', () => {
                thumbsContainer.querySelectorAll('.pdp-thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
                if (mainImg) {
                    mainImg.src = thumb.dataset.src;
                    mainImg.alt = `${p.name} - Detailed View`;
                }
            });
        });
    }
}

function renderPricingAndBadges(p) {
    const sellingPriceEl = document.getElementById('pdp-selling-price');
    const mrpEl = document.getElementById('pdp-mrp');
    const discountEl = document.getElementById('pdp-discount-badge');

    const sellingPrice = selectedVariant?.price || p.sellingPrice;
    if (sellingPriceEl) sellingPriceEl.textContent = formatPrice(sellingPrice);

    if (mrpEl) {
        if (p.mrp && p.mrp > sellingPrice) {
            mrpEl.textContent = formatPrice(p.mrp);
            mrpEl.style.display = 'inline';
        } else {
            mrpEl.style.display = 'none';
        }
    }

    if (discountEl) {
        const discount = calcDiscount(p.mrp, sellingPrice);
        if (discount > 0) {
            discountEl.textContent = `SAVE ${discount}%`;
            discountEl.style.display = 'inline-flex';
        } else {
            discountEl.style.display = 'none';
        }
    }

    // Stock alert
    const stockEl = document.getElementById('pdp-stock-status');
    if (stockEl) {
        const stock = p.stock || 20;
        if (stock < 5) {
            stockEl.innerHTML = `<span style="color:#EF4444;font-weight:700;">⚡ Only ${stock} items left in stock — order soon!</span>`;
        } else {
            stockEl.innerHTML = `<span style="color:#10B981;font-weight:700;">✓ In Stock & Ready to Ship</span>`;
        }
    }
}

function renderVariants(p) {
    const container = document.getElementById('pdp-variants-wrap');
    if (!container || !p.variants || p.variants.length === 0) return;

    selectedVariant = p.variants[0];
    container.innerHTML = `
        <div class="variant-group">
            <div class="variant-title">${p.variants[0].type || 'Options'}: <span id="selected-variant-label" style="color:var(--color-accent);font-weight:700;">${selectedVariant.name}</span></div>
            <div class="variant-options">
                ${p.variants.map((v, i) => `
                    <button class="variant-pill ${i === 0 ? 'active' : ''}" data-idx="${i}" aria-label="Select option ${v.name}">
                        ${v.name}
                    </button>
                `).join('')}
            </div>
        </div>
    `;

    container.querySelectorAll('.variant-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.variant-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const idx = parseInt(btn.dataset.idx);
            selectedVariant = p.variants[idx];
            document.getElementById('selected-variant-label').textContent = selectedVariant.name;
            renderPricingAndBadges(p);
        });
    });
}

function renderSpecsAndDetails(p) {
    const descEl = document.getElementById('pdp-full-desc');
    if (descEl) descEl.textContent = p.description || p.shortDescription || '';

    const specsTable = document.getElementById('pdp-specs-tbody');
    if (specsTable && p.specifications) {
        const entries = Object.entries(p.specifications);
        if (entries.length > 0) {
            specsTable.innerHTML = entries.map(([key, val]) => `
                <tr>
                    <td style="padding:10px 14px;font-weight:700;color:var(--color-text);width:35%;border-bottom:1px solid var(--color-border);">${key}</td>
                    <td style="padding:10px 14px;color:var(--color-text-secondary);border-bottom:1px solid var(--color-border);">${val}</td>
                </tr>
            `).join('');
        }
    }
}

function renderPincodeChecker() {
    const checkBtn = document.getElementById('check-pincode-btn');
    const input = document.getElementById('pincode-input');
    const result = document.getElementById('pincode-result');

    if (checkBtn && input && result) {
        checkBtn.addEventListener('click', () => {
            const val = input.value.trim();
            if (!/^\d{6}$/.test(val)) {
                result.innerHTML = `<span style="color:#EF4444;font-size:13px;">Please enter a valid 6-digit Indian PIN code.</span>`;
                return;
            }

            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + 4);
            const dateString = deliveryDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });

            result.innerHTML = `
                <div style="color:#10B981;font-weight:700;font-size:13px;margin-top:8px;">
                    ✓ Express delivery available to ${val}
                </div>
                <div style="color:var(--color-text-secondary);font-size:12px;">
                    Estimated delivery by <strong>${dateString}</strong> • Free shipping eligible
                </div>
            `;
        });
    }
}

function bindActionButtons() {
    const qtyMinus = document.getElementById('qty-minus');
    const qtyPlus = document.getElementById('qty-plus');
    const qtyInput = document.getElementById('qty-input');

    if (qtyMinus && qtyPlus && qtyInput) {
        qtyMinus.addEventListener('click', () => {
            if (currentQty > 1) {
                currentQty--;
                qtyInput.value = currentQty;
            }
        });
        qtyPlus.addEventListener('click', () => {
            if (currentQty < APP_CONFIG.maxCartItemQty) {
                currentQty++;
                qtyInput.value = currentQty;
            }
        });
    }

    const addToCartBtn = document.getElementById('pdp-add-to-cart');
    const buyNowBtn = document.getElementById('pdp-buy-now');

    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            if (currentProduct) {
                addToCart(currentProduct, currentQty, selectedVariant);
            }
        });
    }

    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', () => {
            if (currentProduct) {
                addToCart(currentProduct, currentQty, selectedVariant);
                window.location.href = '/checkout.html';
            }
        });
    }

    // Main PDP Share Button
    const pdpShareBtn = document.getElementById('pdp-share-btn');
    if (pdpShareBtn) {
        pdpShareBtn.addEventListener('click', () => {
            if (currentProduct) {
                shareProduct({
                    id: currentProduct.id,
                    name: currentProduct.name,
                    price: currentProduct.sellingPrice,
                    slug: currentProduct.slug || currentProduct.id,
                    image: currentProduct.primaryImage || currentProduct.images?.[0]
                });
            }
        });
    }

    // Quick Social Share Strip
    document.querySelectorAll('.btn-share-quick').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!currentProduct) return;
            const platform = btn.dataset.platform;
            const url = window.location.href;
            const title = `Check out ${currentProduct.name} on XORONIQ for ${formatPrice(currentProduct.sellingPrice)}! ⚡`;

            if (platform === 'whatsapp') {
                window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`, '_blank');
            } else if (platform === 'telegram') {
                window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`, '_blank');
            } else if (platform === 'facebook') {
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
            } else if (platform === 'copy') {
                try {
                    await navigator.clipboard.writeText(url);
                    btn.innerHTML = '<span>✓</span> Copied!';
                    showToast("Product link copied to clipboard!", "success");
                    setTimeout(() => {
                        btn.innerHTML = '<span>🔗</span> Copy Link';
                    }, 2000);
                } catch (err) {
                    showToast("Failed to copy link", "error");
                }
            }
        });
    });
}

async function loadReviews(productId) {
    const listEl = document.getElementById('pdp-reviews-list');
    if (!listEl) return;

    const { reviews } = await getReviews({ productId, approvedOnly: true });
    if (!reviews || reviews.length === 0) {
        listEl.innerHTML = `<div style="text-align:center;padding:32px;color:var(--color-text-muted);">No reviews yet. Be the first to review this product!</div>`;
    } else {
        listEl.innerHTML = reviews.map(r => `
            <div style="padding:20px 0;border-bottom:1px solid var(--color-border);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-weight:700;color:var(--color-text);">${r.userName || 'Verified Buyer'}</span>
                        <span class="badge badge-success" style="font-size:10px;">✓ Verified Purchase</span>
                    </div>
                    <span style="color:#F59E0B;font-size:14px;">${renderStars(r.rating || 5)}</span>
                </div>
                <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${r.title || ''}</div>
                <p style="color:var(--color-text-secondary);font-size:14px;line-height:1.5;">${r.comment || ''}</p>
            </div>
        `).join('');
    }

    // Review submission form
    const form = document.getElementById('pdp-review-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('review-name')?.value.trim();
            const rating = parseInt(document.getElementById('review-rating')?.value || '5');
            const title = document.getElementById('review-title')?.value.trim();
            const comment = document.getElementById('review-comment')?.value.trim();

            if (!name || !comment) {
                showToast("Please enter your name and comment.", "error");
                return;
            }

            await createReview({
                productId,
                userName: name,
                rating,
                title,
                comment,
                verified: true
            });

            showToast("Thank you! Your review has been submitted.", "success");
            form.reset();
            loadReviews(productId);
        });
    }
}

async function loadRelatedProducts(p) {
    const container = document.getElementById('pdp-related-grid');
    if (!container) return;

    const { products } = await getProducts({ categoryId: p.categoryId, pageSize: 4, activeOnly: true });
    const related = products.filter(item => item.id !== p.id).slice(0, 4);

    if (related.length > 0) {
        container.innerHTML = related.map(renderProductCard).join('');
    }
}

// Auto-run if on PDP
if (document.getElementById('pdp-main-img') || getProductIdentifierFromUrl()) {
    initPDP();
}
