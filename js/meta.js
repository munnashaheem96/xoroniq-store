// js/meta.js — Meta Pixel & CAPI-ready event tracking for XORONIQ
// IMPORTANT: Meta Access Token must NEVER be placed here or in any frontend file.
// CAPI must run through a secure server-side endpoint. See README.md.

import { getSettings } from "./db.js";

let _pixelId = null;
let _pixelInitialized = false;

// ─────────────────────────────────────────────
// PIXEL INIT
// ─────────────────────────────────────────────

export async function initMetaPixel() {
    try {
        const settings = await getSettings();
        _pixelId = settings?.metaPixelId || null;
        if (!_pixelId) {
            console.info("[Meta] No Pixel ID configured. Set it in Admin > Settings.");
            return;
        }
        injectPixelScript(_pixelId);
        _pixelInitialized = true;
        trackPageView();
    } catch (e) {
        console.warn("[Meta] Pixel init failed:", e);
    }
}

function injectPixelScript(pixelId) {
    if (window.fbq) return; // Already loaded
    !(function (f, b, e, v, n, t, s) {
        if (f.fbq) return;
        n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = "2.0";
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq("init", pixelId);
}

// ─────────────────────────────────────────────
// EVENT ID GENERATION (for CAPI deduplication)
// ─────────────────────────────────────────────

export function generateEventId() {
    return `xor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ─────────────────────────────────────────────
// PIXEL EVENTS
// ─────────────────────────────────────────────

function fbqEvent(eventName, params = {}, eventId = null) {
    if (!window.fbq || !_pixelInitialized) return;
    const options = eventId ? { eventID: eventId } : {};
    window.fbq("track", eventName, params, options);
}

export function trackPageView() {
    fbqEvent("PageView");
}

export function trackViewContent(product) {
    const eventId = generateEventId();
    fbqEvent("ViewContent", {
        content_ids: [product.id],
        content_name: product.name,
        content_type: "product",
        value: product.sellingPrice,
        currency: "INR",
    }, eventId);
    // Send to CAPI proxy (fire and forget)
    sendToCapiProxy("ViewContent", {
        content_ids: [product.id],
        content_name: product.name,
        value: product.sellingPrice,
        currency: "INR",
    }, eventId);
}

export function trackSearch(searchString) {
    const eventId = generateEventId();
    fbqEvent("Search", { search_string: searchString }, eventId);
    sendToCapiProxy("Search", { search_string: searchString }, eventId);
}

export function trackAddToCart(product, quantity = 1) {
    const eventId = generateEventId();
    fbqEvent("AddToCart", {
        content_ids: [product.id],
        content_name: product.name,
        content_type: "product",
        value: product.sellingPrice * quantity,
        currency: "INR",
        quantity,
    }, eventId);
    sendToCapiProxy("AddToCart", {
        content_ids: [product.id],
        value: product.sellingPrice * quantity,
        currency: "INR",
    }, eventId);
}

export function trackInitiateCheckout(cartItems, total) {
    const eventId = generateEventId();
    fbqEvent("InitiateCheckout", {
        content_ids: cartItems.map(i => i.id),
        num_items: cartItems.reduce((s, i) => s + (i.qty || 1), 0),
        value: total,
        currency: "INR",
    }, eventId);
    sendToCapiProxy("InitiateCheckout", {
        content_ids: cartItems.map(i => i.id),
        value: total,
        currency: "INR",
    }, eventId);
}

export function trackAddPaymentInfo(paymentMethod) {
    const eventId = generateEventId();
    // Do NOT send payment credentials — only method type
    fbqEvent("AddPaymentInfo", { payment_method: paymentMethod }, eventId);
    sendToCapiProxy("AddPaymentInfo", { payment_method: paymentMethod }, eventId);
}

export function trackPurchase(order) {
    const eventId = generateEventId();
    fbqEvent("Purchase", {
        value: order.total,
        currency: "INR",
        content_ids: order.items.map(i => i.productId || i.id),
        contents: order.items.map(i => ({
            id: i.productId || i.id,
            quantity: i.quantity || i.qty || 1,
            item_price: i.price,
        })),
        num_items: order.items.reduce((s, i) => s + (i.quantity || i.qty || 1), 0),
        order_id: order.orderId,
    }, eventId);
    sendToCapiProxy("Purchase", {
        value: order.total,
        currency: "INR",
        order_id: order.orderId,
        content_ids: order.items.map(i => i.productId || i.id),
    }, eventId);
}

// ─────────────────────────────────────────────
// CAPI PROXY (Secure Backend Required)
// ─────────────────────────────────────────────
// This sends events to your secure backend which then forwards to Meta CAPI.
// The backend endpoint must:
//   1. Validate the request
//   2. Add the Meta Access Token server-side (NEVER in frontend)
//   3. Forward to https://graph.facebook.com/v18.0/{pixel_id}/events
//
// See README.md > Meta CAPI Architecture for full details.

async function sendToCapiProxy(eventName, params, eventId) {
    try {
        const proxyUrl = "/api/capi-event"; // Set up your secure backend at this path
        const payload = {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            event_id: eventId,
            event_source_url: window.location.href,
            user_data: {
                client_user_agent: navigator.userAgent,
                // Add hashed user data from your backend — never raw PII in frontend
            },
            custom_data: params,
        };

        // Use beacon API for reliability (especially on page unload)
        if (navigator.sendBeacon) {
            navigator.sendBeacon(proxyUrl, JSON.stringify(payload));
        } else {
            await fetch(proxyUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                keepalive: true,
            });
        }
    } catch (e) {
        // CAPI failures are non-critical — Pixel is the primary tracking
        console.debug("[Meta CAPI] Event queued for backend:", eventName);
    }
}
