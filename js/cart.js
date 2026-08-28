// js/cart.js — Shopping Cart Management & Pricing Engine for XORONIQ

import { getSettings, getCouponByCode } from './db.js';
import { getCart, saveCart, formatPrice, showToast, updateHeaderBadges } from './app.js';
import { APP_CONFIG } from './config.js';

let appliedCoupon = null;

export async function initCart() {
    updateHeaderBadges();
    renderCartView();
    bindCartEvents();
}

export async function renderCartView() {
    const cart = getCart();
    const itemsContainer = document.getElementById('cart-items');
    const emptyState = document.getElementById('cart-empty');
    const cartContent = document.getElementById('cart-content');

    if (!cart || cart.length === 0) {
        if (cartContent) cartContent.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (cartContent) cartContent.style.display = 'grid';
    if (emptyState) emptyState.style.display = 'none';

    if (itemsContainer) {
        itemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item" data-key="${item.cartKey || item.id}" style="display:flex;gap:16px;padding:20px 0;border-bottom:1px solid var(--color-border);align-items:center;">
                <a href="/products/${item.slug || item.id}" style="flex-shrink:0;">
                    <img src="${item.image || APP_CONFIG.placeholderImage}" alt="${item.name}" style="width:84px;height:84px;border-radius:var(--radius-md);object-fit:cover;border:1px solid var(--color-border);" loading="lazy" width="84" height="84">
                </a>
                <div style="flex:1;min-width:0;">
                    <a href="/products/${item.slug || item.id}">
                        <h4 style="font-family:var(--font-heading);font-size:15px;font-weight:700;margin-bottom:4px;color:var(--color-text);">${item.name}</h4>
                    </a>
                    ${item.variant ? `<div style="font-size:12px;color:var(--color-accent);font-weight:600;margin-bottom:6px;">${item.variant}</div>` : ''}
                    <div style="font-weight:800;font-size:16px;color:var(--color-text);">${formatPrice(item.price)}</div>
                </div>
                <div style="display:flex;align-items:center;gap:12px;">
                    <div class="qty-stepper" style="border:1.5px solid var(--color-border);border-radius:var(--radius-md);overflow:hidden;display:inline-flex;">
                        <button class="qty-btn btn-cart-dec" data-key="${item.cartKey || item.id}" style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:var(--color-surface-subtle);font-weight:700;">−</button>
                        <span style="width:36px;text-align:center;font-weight:700;line-height:34px;font-size:14px;">${item.quantity || 1}</span>
                        <button class="qty-btn btn-cart-inc" data-key="${item.cartKey || item.id}" style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:var(--color-surface-subtle);font-weight:700;">+</button>
                    </div>
                    <button class="btn-cart-remove" data-key="${item.cartKey || item.id}" style="color:#EF4444;padding:8px;font-size:13px;font-weight:600;" title="Remove">✕</button>
                </div>
            </div>
        `).join('');
    }

    renderCartSummary();
}

async function renderCartSummary() {
    const cart = getCart();
    const settings = await getSettings();
    const threshold = settings.freeShippingThreshold || APP_CONFIG.defaultFreeShippingThreshold;
    const defaultShipping = settings.shippingFee || APP_CONFIG.defaultShippingFee;

    const subtotal = cart.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);

    // Free shipping progress calculation
    const progressEl = document.getElementById('shipping-progress-text');
    const fillEl = document.getElementById('shipping-progress-fill');
    if (progressEl && fillEl) {
        if (subtotal >= threshold) {
            progressEl.innerHTML = `<span style="color:#10B981;font-weight:700;">🎉 Congratulations! You have unlocked FREE Express Delivery!</span>`;
            fillEl.style.width = '100%';
        } else {
            const needed = threshold - subtotal;
            progressEl.innerHTML = `Add <strong>${formatPrice(needed)}</strong> more to unlock <strong>FREE Delivery</strong>!`;
            fillEl.style.width = `${Math.min(100, (subtotal / threshold) * 100)}%`;
        }
    }

    // Coupon calculation
    let discountAmount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.discountType === 'percentage') {
            discountAmount = Math.round((subtotal * appliedCoupon.discountValue) / 100);
            if (appliedCoupon.maximumDiscount) {
                discountAmount = Math.min(discountAmount, appliedCoupon.maximumDiscount);
            }
        } else {
            discountAmount = appliedCoupon.discountValue || 0;
        }
    }

    const shippingFee = (subtotal >= threshold || subtotal === 0) ? 0 : defaultShipping;
    const finalTotal = Math.max(0, subtotal - discountAmount + shippingFee);

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setVal('summary-subtotal', formatPrice(subtotal));
    setVal('summary-discount', discountAmount > 0 ? `-${formatPrice(discountAmount)}` : '₹0');
    setVal('summary-shipping', shippingFee === 0 ? 'FREE' : formatPrice(shippingFee));
    setVal('summary-total', formatPrice(finalTotal));

    const couponBadge = document.getElementById('applied-coupon-badge');
    if (couponBadge) {
        if (appliedCoupon) {
            couponBadge.innerHTML = `
                <span class="badge badge-success" style="padding:6px 12px;display:inline-flex;align-items:center;gap:6px;">
                    ✓ Coupon ${appliedCoupon.code} applied (-${formatPrice(discountAmount)})
                    <span id="remove-coupon-btn" style="cursor:pointer;font-weight:800;margin-left:4px;">✕</span>
                </span>
            `;
            document.getElementById('remove-coupon-btn')?.addEventListener('click', () => {
                appliedCoupon = null;
                showToast("Coupon removed", "info");
                renderCartSummary();
            });
        } else {
            couponBadge.innerHTML = '';
        }
    }
}

function bindCartEvents() {
    // Quantity increment/decrement delegation
    document.addEventListener('click', (e) => {
        const incBtn = e.target.closest('.btn-cart-inc');
        const decBtn = e.target.closest('.btn-cart-dec');
        const remBtn = e.target.closest('.btn-cart-remove');

        if (incBtn) {
            const key = incBtn.dataset.key;
            const cart = getCart();
            const item = cart.find(i => (i.cartKey || i.id) === key);
            if (item && item.quantity < APP_CONFIG.maxCartItemQty) {
                item.quantity++;
                saveCart(cart);
                renderCartView();
            }
            return;
        }

        if (decBtn) {
            const key = decBtn.dataset.key;
            let cart = getCart();
            const item = cart.find(i => (i.cartKey || i.id) === key);
            if (item) {
                if (item.quantity > 1) {
                    item.quantity--;
                } else {
                    cart = cart.filter(i => (i.cartKey || i.id) !== key);
                }
                saveCart(cart);
                renderCartView();
            }
            return;
        }

        if (remBtn) {
            const key = remBtn.dataset.key;
            let cart = getCart();
            cart = cart.filter(i => (i.cartKey || i.id) !== key);
            saveCart(cart);
            renderCartView();
            showToast("Item removed from cart", "info");
            return;
        }
    });

    // Coupon Apply Form
    const couponForm = document.getElementById('coupon-form');
    if (couponForm) {
        couponForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('coupon-input');
            const code = input?.value.trim().toUpperCase();
            if (!code) return;

            const coupon = await getCouponByCode(code);
            if (!coupon) {
                showToast("Invalid or expired promo code", "error");
                return;
            }

            const cart = getCart();
            const subtotal = cart.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);

            if (coupon.minimumOrder && subtotal < coupon.minimumOrder) {
                showToast(`Minimum order of ${formatPrice(coupon.minimumOrder)} required for this coupon`, "warning");
                return;
            }

            appliedCoupon = coupon;
            showToast(`Coupon "${coupon.code}" applied successfully!`, "success");
            input.value = '';
            renderCartSummary();
        });
    }

    // Checkout redirect button
    const checkoutBtn = document.getElementById('proceed-to-checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            const cart = getCart();
            if (!cart.length) {
                showToast("Your cart is empty", "warning");
                return;
            }
            if (appliedCoupon) {
                sessionStorage.setItem('xoroniq_applied_coupon', JSON.stringify(appliedCoupon));
            }
            window.location.href = '/checkout.html';
        });
    }
}

// Auto-run if on cart page
if (document.getElementById('cart-items')) {
    initCart();
}
