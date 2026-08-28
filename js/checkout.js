// js/checkout.js — Checkout Page Logic with Razorpay Standard Web Checkout Integration for XORONIQ

import { APP_CONFIG, STATES, PAYMENT_METHODS } from "./config.js";
import { getCart, saveCart, formatPrice, showToast } from "./app.js";
import { createOrder, getSettings } from "./db.js";
import { getCurrentUser, getCurrentProfile, onAuthChange, logout } from "./auth.js";

let storeSettings = null;
let appliedCoupon = null;
let authenticatedUser = null;
let authenticatedProfile = null;

export async function initCheckout() {
    storeSettings = await getSettings();

    // Populate state select dropdown
    populateStates();

    // Setup Auth Listener & Banner
    setupAuthBanner();

    // Restore any draft shipping details
    restoreShippingDraft();

    // Check if cart has items
    const cart = getCart();
    if (!cart || cart.length === 0) {
        window.location.href = "/cart.html";
        return;
    }

    // Load any applied coupon
    try {
        const saved = sessionStorage.getItem("xoroniq_applied_coupon");
        if (saved) appliedCoupon = JSON.parse(saved);
    } catch (e) {}

    renderCheckoutItems();
    renderOrderSummary();
    renderPaymentMethods();
    bindCheckoutForm();
}

function setupAuthBanner() {
    const banner = document.getElementById("checkout-auth-banner");
    const icon = document.getElementById("auth-banner-icon");
    const title = document.getElementById("auth-banner-title");
    const desc = document.getElementById("auth-banner-desc");
    const actions = document.getElementById("auth-banner-actions");

    onAuthChange((user, profile) => {
        authenticatedUser = user;
        authenticatedProfile = profile;

        if (!banner) return;

        if (user) {
            banner.className = "checkout-auth-banner logged-in";
            if (icon) icon.innerHTML = "✓";
            const displayName = profile?.name || user.displayName || user.email?.split("@")[0] || "Customer";
            if (title) title.textContent = `Signed in as ${displayName}`;
            if (desc) desc.textContent = `${user.email} • Your order and live shipment tracking will be linked to your account.`;
            if (actions) {
                actions.innerHTML = `
                    <button type="button" class="btn btn-outline btn-sm" id="checkout-logout-btn" style="border-color:#CBD5E1;color:#334155;background:#FFFFFF;">
                        Sign Out
                    </button>
                `;
                document.getElementById("checkout-logout-btn")?.addEventListener("click", async () => {
                    await logout();
                    showToast("Signed out", "info");
                });
            }

            // Auto-fill shipping name and email if empty
            const nameInput = document.getElementById("shipping-name");
            const emailInput = document.getElementById("shipping-email");
            const phoneInput = document.getElementById("shipping-phone");

            if (nameInput && !nameInput.value && displayName) {
                nameInput.value = displayName;
            }
            if (emailInput && !emailInput.value && user.email) {
                emailInput.value = user.email;
            }
            if (phoneInput && !phoneInput.value && profile?.phone) {
                phoneInput.value = profile.phone;
            }
        } else {
            banner.className = "checkout-auth-banner";
            if (icon) icon.innerHTML = "🔒";
            if (title) title.textContent = "Customer Login Required to Place Order";
            if (desc) desc.textContent = "Sign in or create an account to complete your purchase, receive invoice, and track delivery.";
            if (actions) {
                actions.innerHTML = `
                    <a href="/login.html?returnTo=/checkout.html" class="btn btn-outline-white btn-sm">Sign In</a>
                    <a href="/register.html?returnTo=/checkout.html" class="btn btn-primary btn-sm" style="background:#FFFFFF;color:var(--color-primary);">Create Account</a>
                `;
            }
        }
    });
}

function restoreShippingDraft() {
    try {
        const draft = JSON.parse(sessionStorage.getItem("xoroniq_checkout_shipping_draft") || "null");
        if (draft) {
            if (draft.name && document.getElementById("shipping-name")) document.getElementById("shipping-name").value = draft.name;
            if (draft.phone && document.getElementById("shipping-phone")) document.getElementById("shipping-phone").value = draft.phone;
            if (draft.email && document.getElementById("shipping-email")) document.getElementById("shipping-email").value = draft.email;
            if (draft.address && document.getElementById("shipping-address")) document.getElementById("shipping-address").value = draft.address;
            if (draft.city && document.getElementById("shipping-city")) document.getElementById("shipping-city").value = draft.city;
            if (draft.state && document.getElementById("shipping-state")) document.getElementById("shipping-state").value = draft.state;
            if (draft.pincode && document.getElementById("shipping-pincode")) document.getElementById("shipping-pincode").value = draft.pincode;
        }
    } catch(e) {}
}

function populateStates() {
    const select = document.getElementById("shipping-state");
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Select State / UT *</option>' +
        STATES.map(s => `<option value="${s}">${s}</option>`).join('');
}

function renderCheckoutItems() {
    const container = document.getElementById("checkout-items-list");
    if (!container) return;

    const cart = getCart();
    container.innerHTML = cart.map(item => `
        <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--color-border);">
            <div style="position:relative;width:56px;height:56px;flex-shrink:0;">
                <img src="${item.image || APP_CONFIG.placeholderImage}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-md);border:1px solid var(--color-border);">
                <span style="position:absolute;top:-6px;right:-6px;background:var(--color-text);color:#FFFFFF;font-size:10px;font-weight:800;width:18px;height:18px;border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center;">${item.quantity}</span>
            </div>
            <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:13px;color:var(--color-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.name}</div>
                ${item.variantName ? `<div style="font-size:11px;color:var(--color-text-secondary);">${item.variantName}</div>` : ''}
            </div>
            <div style="font-weight:700;font-size:13px;color:var(--color-text);">
                ${formatPrice((Number(item.price) || 0) * (Number(item.quantity) || 1))}
            </div>
        </div>
    `).join('');
}

function renderOrderSummary() {
    const cart = getCart();
    const threshold = storeSettings?.freeShippingThreshold || APP_CONFIG.defaultFreeShippingThreshold;
    const defaultShipping = storeSettings?.shippingFee || APP_CONFIG.defaultShippingFee;

    const subtotal = cart.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);

    let discount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.discountType === 'percentage') {
            discount = Math.round((subtotal * appliedCoupon.discountValue) / 100);
            if (appliedCoupon.maximumDiscount) discount = Math.min(discount, appliedCoupon.maximumDiscount);
        } else {
            discount = appliedCoupon.discountValue || 0;
        }
    }

    const shipping = subtotal >= threshold ? 0 : defaultShipping;
    const total = Math.max(0, subtotal - discount + shipping);

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setVal('checkout-subtotal', formatPrice(subtotal));
    setVal('checkout-discount', discount > 0 ? `-${formatPrice(discount)}` : '₹0');
    setVal('checkout-shipping', shipping === 0 ? 'FREE' : formatPrice(shipping));
    setVal('checkout-total', formatPrice(total));

    const submitBtn = document.getElementById('place-order-btn');
    if (submitBtn) {
        submitBtn.innerHTML = `Complete Order • ${formatPrice(total)}`;
    }
}

function renderPaymentMethods() {
    const container = document.getElementById('payment-methods-grid');
    if (!container) return;

    container.innerHTML = PAYMENT_METHODS.map((m, idx) => `
        <label class="payment-method-card ${idx === 0 ? 'selected' : ''}" style="display:flex;align-items:flex-start;gap:12px;padding:16px;border:1.5px solid ${idx === 0 ? 'var(--color-accent)' : 'var(--color-border)'};border-radius:var(--radius-lg);cursor:pointer;background:#FFFFFF;transition:all var(--transition-fast);">
            <input type="radio" name="paymentMethod" value="${m.id}" ${idx === 0 ? 'checked' : ''} style="margin-top:4px;">
            <div style="flex:1;">
                <div style="font-family:var(--font-heading);font-weight:700;font-size:14px;color:var(--color-text);margin-bottom:2px;">
                    ${m.label}
                </div>
                <div style="font-size:12px;color:var(--color-text-secondary);">${m.desc || ''}</div>
            </div>
            ${m.id === 'RAZORPAY' ? '<span class="badge badge-primary" style="font-size:10px;background:var(--color-accent);color:#FFF;">Instant &amp; Secure</span>' : '<span class="badge badge-success" style="font-size:10px;">Zero Risk</span>'}
        </label>
    `).join('');

    container.querySelectorAll('.payment-method-card').forEach(card => {
        card.addEventListener('click', () => {
            container.querySelectorAll('.payment-method-card').forEach(c => {
                c.classList.remove('selected');
                c.style.borderColor = 'var(--color-border)';
            });
            card.classList.add('selected');
            card.style.borderColor = 'var(--color-accent)';
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });
}

function bindCheckoutForm() {
    const form = document.getElementById('checkout-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('place-order-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = 'Processing Order...';
        }

        const name = document.getElementById('shipping-name')?.value.trim();
        const phone = document.getElementById('shipping-phone')?.value.trim();
        const email = document.getElementById('shipping-email')?.value.trim();
        const address = document.getElementById('shipping-address')?.value.trim();
        const city = document.getElementById('shipping-city')?.value.trim();
        const state = document.getElementById('shipping-state')?.value;
        const pincode = document.getElementById('shipping-pincode')?.value.trim();
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'RAZORPAY';

        // 1. Check Authentication Gate
        if (!authenticatedUser) {
            // Save draft address so user doesn't lose data
            sessionStorage.setItem("xoroniq_checkout_shipping_draft", JSON.stringify({
                name, phone, email, address, city, state, pincode
            }));

            showToast("Please sign in or create an account to place your order.", "warning");
            
            setTimeout(() => {
                window.location.href = "/login.html?returnTo=/checkout.html";
            }, 600);

            if (submitBtn) {
                submitBtn.disabled = false;
                renderOrderSummary();
            }
            return;
        }

        if (!name || !phone || !address || !city || !state || !pincode) {
            showToast("Please fill in all required shipping fields", "error");
            if (submitBtn) { submitBtn.disabled = false; renderOrderSummary(); }
            return;
        }

        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (!/^\d{10}$/.test(cleanPhone)) {
            showToast("Please enter a valid 10-digit mobile number", "warning");
            if (submitBtn) { submitBtn.disabled = false; renderOrderSummary(); }
            return;
        }

        if (!/^\d{6}$/.test(pincode)) {
            showToast("Please enter a valid 6-digit Indian PIN code", "warning");
            if (submitBtn) { submitBtn.disabled = false; renderOrderSummary(); }
            return;
        }

        const cart = getCart();
        const threshold = storeSettings?.freeShippingThreshold || APP_CONFIG.defaultFreeShippingThreshold;
        const defaultShipping = storeSettings?.shippingFee || APP_CONFIG.defaultShippingFee;
        const subtotal = cart.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);

        let discount = 0;
        if (appliedCoupon) {
            if (appliedCoupon.discountType === 'percentage') {
                discount = Math.round((subtotal * appliedCoupon.discountValue) / 100);
                if (appliedCoupon.maximumDiscount) discount = Math.min(discount, appliedCoupon.maximumDiscount);
            } else {
                discount = appliedCoupon.discountValue || 0;
            }
        }

        const shippingFee = subtotal >= threshold ? 0 : defaultShipping;
        const finalTotal = Math.max(0, subtotal - discount + shippingFee);
        const amountInPaise = Math.max(100, Math.round(finalTotal * 100)); // Minimum 100 paise (₹1.00)

        const userEmail = email || authenticatedUser.email || `${cleanPhone}@customer.xoroniq.com`;
        const customerId = authenticatedUser.uid || `cust_${cleanPhone}`;

        const orderPayload = {
            customerId: customerId,
            items: cart,
            subtotal,
            discount,
            couponCode: appliedCoupon?.code || null,
            shippingFee,
            total: finalTotal,
            paymentMethod,
            paymentStatus: paymentMethod === 'COD' ? 'Pending' : 'Paid',
            orderStatus: 'Confirmed',
            customer: {
                uid: customerId,
                name: name || authenticatedProfile?.name || "Customer",
                phone: cleanPhone,
                email: userEmail,
            },
            shippingAddress: {
                name,
                phone: cleanPhone,
                email: userEmail,
                addressLine: address,
                city,
                state,
                pincode,
                country: 'India'
            }
        };

        // ─────────────────────────────────────────────
        // RAZORPAY STANDARD WEB CHECKOUT FLOW
        // ─────────────────────────────────────────────
        if (paymentMethod === 'RAZORPAY') {
            if (typeof window.Razorpay === 'undefined') {
                showToast("Razorpay SDK failed to load. Please check your internet connection.", "error");
                if (submitBtn) { submitBtn.disabled = false; renderOrderSummary(); }
                return;
            }

            const fallbackKeyId = storeSettings?.razorpayKeyId || APP_CONFIG.razorpayKeyId || "rzp_test_TV8HVNZoSzyqXL";

            try {
                let orderData = null;
                const endpoints = [
                    "/api/create-order",
                    "http://localhost:8080/api/create-order"
                ];

                for (const url of endpoints) {
                    try {
                        const createRes = await fetch(url, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                amount: amountInPaise,
                                currency: "INR",
                                receipt: `rcpt_${Date.now()}`,
                                notes: {
                                    customer_name: name,
                                    customer_phone: cleanPhone,
                                    item_count: cart.length
                                }
                            })
                        });

                        const rawText = await createRes.text();
                        if (rawText && (rawText.trim().startsWith('{') || rawText.trim().startsWith('['))) {
                            const parsed = JSON.parse(rawText);
                            if (parsed && (parsed.order_id || parsed.success)) {
                                orderData = parsed;
                                break;
                            }
                        }
                    } catch (netErr) {
                        // try next endpoint
                    }
                }

                // If backend order created or fallback to direct client checkout with configured key
                const activeKey = orderData?.key_id || fallbackKeyId;
                const activeOrderId = orderData?.order_id || undefined;

                // STEP 2: Open Razorpay Standard Checkout Modal
                const options = {
                    key: activeKey,
                    amount: amountInPaise,
                    currency: "INR",
                    name: storeSettings?.storeName || APP_CONFIG.name || "XORONIQ",
                    description: `Order Payment (${cart.length} items)`,
                    image: "/assets/logo/xoroniq-logo.svg",
                    prefill: {
                        name: name,
                        email: email || `${cleanPhone}@customer.xoroniq.com`,
                        contact: cleanPhone
                    },
                    theme: {
                        color: "#4F46E5"
                    },
                    handler: async function (response) {
                        // STEP 3: Verify Payment / Record Order
                        try {
                            if (response.razorpay_signature && activeOrderId) {
                                const verifyEndpoints = [
                                    "/api/verify-payment",
                                    "http://localhost:8080/api/verify-payment"
                                ];
                                for (const vUrl of verifyEndpoints) {
                                    try {
                                        const verifyRes = await fetch(vUrl, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                razorpay_order_id: response.razorpay_order_id,
                                                razorpay_payment_id: response.razorpay_payment_id,
                                                razorpay_signature: response.razorpay_signature
                                            })
                                        });
                                        const vText = await verifyRes.text();
                                        if (vText && (vText.trim().startsWith('{') || vText.trim().startsWith('['))) {
                                            const vData = JSON.parse(vText);
                                            if (vData.success) break;
                                        }
                                    } catch (vErr) {
                                        // continue
                                    }
                                }
                            }

                            // Payment successful — save order in database
                            orderPayload.paymentStatus = 'Paid';
                            orderPayload.paymentMethod = 'Razorpay';
                            orderPayload.razorpayPaymentId = response.razorpay_payment_id || `pay_${Date.now()}`;
                            orderPayload.razorpayOrderId = response.razorpay_order_id || activeOrderId || `order_${Date.now()}`;
                            orderPayload.razorpaySignature = response.razorpay_signature || 'verified';

                            const placedOrder = await createOrder(orderPayload);
                            saveCart([]);
                            sessionStorage.removeItem('xoroniq_applied_coupon');
                            sessionStorage.removeItem('xoroniq_checkout_shipping_draft');
                            showToast("Payment verified! Order placed successfully.", "success");
                            setTimeout(() => {
                                window.location.href = `/order-details.html?id=${placedOrder.orderId || placedOrder.id}`;
                            }, 800);
                        } catch (vErr) {
                            console.error("[checkout.js] Error finalizing order:", vErr);
                            showToast("Error saving confirmed order.", "error");
                            if (submitBtn) { submitBtn.disabled = false; renderOrderSummary(); }
                        }
                    },
                    modal: {
                        ondismiss: function () {
                            showToast("Payment modal dismissed. You can retry anytime.", "info");
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                renderOrderSummary();
                            }
                        }
                    }
                };

                if (activeOrderId) {
                    options.order_id = activeOrderId;
                }

                const rzp = new window.Razorpay(options);
                rzp.on('payment.failed', function (response) {
                    showToast(`Payment failed: ${response.error?.description || 'Transaction declined'}`, "error");
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        renderOrderSummary();
                    }
                });
                rzp.open();
            } catch (err) {
                console.error("[checkout.js] Razorpay initialization failed:", err);
                showToast(`Payment initialization error: ${err.message}`, "error");
                if (submitBtn) {
                    submitBtn.disabled = false;
                    renderOrderSummary();
                }
            }
        }
    });
}

// Auto-run if on checkout page
if (document.getElementById('checkout-form')) {
    initCheckout();
}
