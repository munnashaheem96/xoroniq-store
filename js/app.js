// js/app.js — Shared App Bootstrap & UI Utilities for XORONIQ

import { APP_CONFIG } from "./config.js";
import { getSettings, getLocalWishlist, toggleLocalWishlist, searchProducts } from "./db.js";
import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

// ─────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────

let toastContainer = null;

function getToastContainer() {
    if (!toastContainer) {
        toastContainer = document.getElementById("toast-container");
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            toastContainer.id = "toast-container";
            toastContainer.setAttribute("aria-live", "polite");
            document.body.appendChild(toastContainer);
        }
    }
    return toastContainer;
}

export function showToast(message, type = "success", duration = APP_CONFIG.toastDuration) {
    const container = getToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icons = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || "ℹ"}</span><span class="toast-msg">${message}</span>`;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("toast-visible"));

    setTimeout(() => {
        toast.classList.remove("toast-visible");
        toast.addEventListener("transitionend", () => toast.remove(), { once: true });
    }, duration);
}

// ─────────────────────────────────────────────
// FORMAT HELPERS
// ─────────────────────────────────────────────

export function formatPrice(amount) {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

export function formatDate(timestamp) {
    if (!timestamp) return "—";
    const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return isNaN(d) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function calcDiscount(mrp, sellingPrice) {
    if (!mrp || mrp <= sellingPrice) return 0;
    return Math.round(((mrp - sellingPrice) / mrp) * 100);
}

export function getUrlParam(key) {
    return new URLSearchParams(window.location.search).get(key);
}

export function renderStars(rating = 5) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(Math.max(0, empty));
}

// ─────────────────────────────────────────────
// SKELETON LOADERS
// ─────────────────────────────────────────────

export function createProductCardSkeleton() {
    return `
    <div class="product-card skeleton-card" aria-hidden="true">
        <div class="skeleton" style="padding-top:100%;border-radius:var(--radius-xl) var(--radius-xl) 0 0;"></div>
        <div style="padding:18px;">
            <div class="skeleton" style="height:12px;width:35%;margin-bottom:10px;"></div>
            <div class="skeleton" style="height:18px;width:80%;margin-bottom:12px;"></div>
            <div class="skeleton" style="height:14px;width:50%;margin-bottom:16px;"></div>
            <div class="skeleton" style="height:24px;width:60%;margin-bottom:16px;"></div>
            <div class="skeleton" style="height:40px;width:100%;border-radius:var(--radius-md);"></div>
        </div>
    </div>`;
}

export function showSkeletons(container, count = 8) {
    if (container) {
        container.innerHTML = Array(count).fill(createProductCardSkeleton()).join("");
    }
}

// ─────────────────────────────────────────────
// PRODUCT CARD RENDERER
// ─────────────────────────────────────────────

export function renderProductCard(product) {
    const discount = product.discountPercentage || calcDiscount(product.mrp, product.sellingPrice);
    const imgSrc = product.primaryImage || APP_CONFIG.placeholderImage;
    const wishlist = getLocalWishlist();
    const isWishlisted = wishlist.includes(product.id);
    const productUrl = `/products/${product.slug || product.id}`;

    return `
    <article class="product-card" data-id="${product.id}">
        <div class="product-card-img-wrap">
            ${discount > 0 ? `<span class="product-badge">${discount}% OFF</span>` : ""}
            <a href="${productUrl}" aria-label="${product.name}">
                <img src="${imgSrc}" alt="${product.name} - Buy online at XORONIQ" class="product-card-img" loading="lazy" decoding="async" width="300" height="300"
                     onerror="this.src='${APP_CONFIG.placeholderImage}'">
            </a>
            <button class="product-wishlist-btn ${isWishlisted ? 'active' : ''}" data-id="${product.id}" title="Wishlist" aria-label="Toggle wishlist">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </button>
        </div>
        <div class="product-card-info">
            <p class="product-card-category">${product.categoryName || "ESSENTIALS"}</p>
            <a href="${productUrl}" class="product-card-link">
                <h3 class="product-card-name">${product.name}</h3>
            </a>
            <div class="product-card-rating">
                ${(product.reviewCount > 0) ? `
                    <span class="stars">${renderStars(product.rating)}</span>
                    <span class="review-count">(${product.reviewCount})</span>
                ` : `
                    <span style="font-size:12px;color:var(--color-text-muted);">No reviews yet</span>
                `}
            </div>
            <div class="product-card-price">
                <span class="price-selling">${formatPrice(product.sellingPrice)}</span>
                ${product.mrp && product.mrp > product.sellingPrice ? `<span class="price-mrp">${formatPrice(product.mrp)}</span>` : ""}
            </div>
            <div class="product-card-actions">
                <button class="btn btn-primary btn-sm btn-block quick-add-btn" data-id="${product.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 01-8 0"></path></svg>
                    Add to Cart
                </button>
            </div>
        </div>
    </article>`;
}

// ─────────────────────────────────────────────
// CART STORAGE & BADGE SYNC
// ─────────────────────────────────────────────

const LS_CART = "xoroniq_cart";

export function getCart() {
    try {
        return JSON.parse(localStorage.getItem(LS_CART) || "[]");
    } catch {
        return [];
    }
}

export function saveCart(cart) {
    localStorage.setItem(LS_CART, JSON.stringify(cart));
    updateHeaderBadges();
    window.dispatchEvent(new CustomEvent("cart-updated", { detail: cart }));
}

export function addToCart(product, qty = 1, variant = null) {
    const cart = getCart();
    const key = variant ? `${product.id}-${variant.name}` : product.id;
    const existing = cart.find(item => item.cartKey === key);

    if (existing) {
        existing.quantity = Math.min(existing.quantity + qty, APP_CONFIG.maxCartItemQty);
    } else {
        cart.push({
            cartKey: key,
            id: product.id,
            name: product.name,
            price: variant?.price || product.sellingPrice,
            mrp: product.mrp,
            image: product.primaryImage || APP_CONFIG.placeholderImage,
            variant: variant ? `${variant.type}: ${variant.name}` : null,
            quantity: qty,
        });
    }

    saveCart(cart);
    showToast(`Added ${product.name} to cart!`, "success");
}

export function updateHeaderBadges() {
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const cartBadges = document.querySelectorAll(".cart-count");
    cartBadges.forEach(badge => {
        badge.textContent = totalItems;
        badge.style.display = totalItems > 0 ? "flex" : "none";
    });

    const wishlist = getLocalWishlist();
    const wishlistBadges = document.querySelectorAll(".wishlist-count");
    wishlistBadges.forEach(badge => {
        badge.textContent = wishlist.length;
        badge.style.display = wishlist.length > 0 ? "flex" : "none";
    });
}

// ─────────────────────────────────────────────
// GLOBAL INITIALIZATION (Header, Search, Wishlist)
// ─────────────────────────────────────────────

export function initApp() {
    updateHeaderBadges();

    // Sticky header shadow
    window.addEventListener("scroll", () => {
        const header = document.querySelector(".site-header");
        if (header) {
            header.classList.toggle("header-scrolled", window.scrollY > 20);
        }
    });

    // Mobile nav drawer
    const navToggle = document.getElementById("nav-toggle");
    const navMenu = document.getElementById("nav-menu");
    const overlay = document.getElementById("nav-overlay");

    if (navToggle && navMenu) {
        navToggle.addEventListener("click", () => {
            navMenu.classList.toggle("drawer-open");
            overlay?.classList.toggle("visible");
        });

        overlay?.addEventListener("click", () => {
            navMenu.classList.remove("drawer-open");
            overlay.classList.remove("visible");
        });
    }

    // Global Wishlist & Quick-Add click delegation
    document.addEventListener("click", async (e) => {
        const wishlistBtn = e.target.closest(".product-wishlist-btn");
        if (wishlistBtn) {
            e.preventDefault();
            const id = wishlistBtn.dataset.id;
            const updated = toggleLocalWishlist(id);
            const isActive = updated.includes(id);
            wishlistBtn.classList.toggle("active", isActive);
            const svg = wishlistBtn.querySelector("svg");
            if (svg) svg.setAttribute("fill", isActive ? "currentColor" : "none");
            updateHeaderBadges();
            showToast(isActive ? "Added to wishlist!" : "Removed from wishlist", "info");
            return;
        }

        const quickAddBtn = e.target.closest(".quick-add-btn");
        if (quickAddBtn) {
            e.preventDefault();
            const id = quickAddBtn.dataset.id;
            const { getProductById } = await import("./db.js");
            const prod = await getProductById(id);
            if (prod) {
                addToCart(prod, 1);
            }
        }
    });

    // Global Live Search Auto-complete
    const searchInputs = document.querySelectorAll(".header-search-input");
    searchInputs.forEach(input => {
        const wrap = input.closest(".header-search");
        const suggestionsBox = wrap?.querySelector(".search-suggestions") || document.getElementById("search-suggestions");
        let debounceTimer = null;

        input.addEventListener("input", (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();
            if (!query) {
                if (suggestionsBox) suggestionsBox.classList.remove("visible");
                return;
            }

            debounceTimer = setTimeout(async () => {
                const results = await searchProducts(query, 6);
                if (!suggestionsBox) return;

                if (results.length === 0) {
                    suggestionsBox.innerHTML = `<div style="padding:16px;text-align:center;color:#94A3B8;font-size:13px;">No products found for "${query}"</div>`;
                } else {
                    suggestionsBox.innerHTML = results.map(p => `
                        <a href="/products/${p.slug || p.id}" class="search-suggestion-item">
                            <img src="${p.primaryImage || APP_CONFIG.placeholderImage}" class="search-suggestion-thumb" alt="${p.name}" width="40" height="40" loading="lazy">
                            <div class="search-suggestion-info">
                                <div class="search-suggestion-name">${p.name}</div>
                                <div class="search-suggestion-price">${formatPrice(p.sellingPrice)}</div>
                            </div>
                        </a>
                    `).join("");
                }
                suggestionsBox.classList.add("visible");
            }, APP_CONFIG.searchDebounce);
        });

        // Close on outside click
        document.addEventListener("click", (e) => {
            if (!wrap?.contains(e.target) && suggestionsBox) {
                suggestionsBox.classList.remove("visible");
            }
        });
    });

    // Auth user status listener
    try {
        onAuthStateChanged(auth, (user) => {
            const accountText = document.getElementById("account-text");
            if (accountText) {
                accountText.textContent = user ? "Account" : "Login";
            }
        });
    } catch {
        // Firebase auth optional in local demo
    }
}

// Auto-run when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
