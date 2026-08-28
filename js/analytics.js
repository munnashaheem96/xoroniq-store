// js/analytics.js — Google Analytics 4 + Internal Firestore analytics for XORONIQ

import { getSettings, incrementAnalyticStat } from "./db.js";

let _gaId = null;
let _gaInitialized = false;

// ─────────────────────────────────────────────
// GA4 INIT
// ─────────────────────────────────────────────

export async function initAnalytics() {
    try {
        const settings = await getSettings();
        _gaId = settings?.googleAnalyticsId || null;
        if (!_gaId) {
            console.info("[Analytics] No GA4 ID configured. Set it in Admin > Settings.");
            return;
        }
        injectGtag(_gaId);
        _gaInitialized = true;
        trackPageView();
    } catch (e) {
        console.warn("[Analytics] GA4 init failed:", e);
    }
}

function injectGtag(gaId) {
    if (window.gtag) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", gaId, { send_page_view: false }); // We send manually
}

function gaEvent(name, params = {}) {
    if (!window.gtag || !_gaInitialized) return;
    window.gtag("event", name, params);
}

// ─────────────────────────────────────────────
// GA4 EVENTS
// ─────────────────────────────────────────────

export function trackPageView(title, url) {
    gaEvent("page_view", {
        page_title: title || document.title,
        page_location: url || window.location.href,
    });
}

export function trackViewItem(product) {
    gaEvent("view_item", {
        currency: "INR",
        value: product.sellingPrice,
        items: [{
            item_id: product.id,
            item_name: product.name,
            item_category: product.categoryName,
            price: product.sellingPrice,
            quantity: 1,
        }],
    });
    // Internal Firestore analytics
    incrementAnalyticStat("productViews", 1);
}

export function trackSearch(searchTerm) {
    gaEvent("search", { search_term: searchTerm });
}

export function trackAddToCart(product, quantity = 1) {
    gaEvent("add_to_cart", {
        currency: "INR",
        value: product.sellingPrice * quantity,
        items: [{
            item_id: product.id,
            item_name: product.name,
            item_category: product.categoryName,
            price: product.sellingPrice,
            quantity,
        }],
    });
    incrementAnalyticStat("cartAdds", 1);
}

export function trackBeginCheckout(cartItems, total) {
    gaEvent("begin_checkout", {
        currency: "INR",
        value: total,
        items: cartItems.map(item => ({
            item_id: item.id,
            item_name: item.name,
            price: item.price || item.sellingPrice,
            quantity: item.qty || 1,
        })),
    });
    incrementAnalyticStat("checkouts", 1);
}

export function trackAddPaymentInfo(paymentType, cartItems, total) {
    gaEvent("add_payment_info", {
        currency: "INR",
        value: total,
        payment_type: paymentType,
        items: cartItems.map(item => ({
            item_id: item.id,
            item_name: item.name,
            price: item.price || item.sellingPrice,
            quantity: item.qty || 1,
        })),
    });
}

export function trackPurchase(order) {
    gaEvent("purchase", {
        transaction_id: order.orderId,
        currency: "INR",
        value: order.total,
        shipping: order.shipping || 0,
        tax: order.tax || 0,
        items: order.items.map(item => ({
            item_id: item.productId || item.id,
            item_name: item.name,
            price: item.price,
            quantity: item.quantity || item.qty || 1,
        })),
    });
    // Internal already tracked in createOrder
}
