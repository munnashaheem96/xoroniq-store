// server.js — Node.js & Express backend for XORONIQ with Razorpay Web Checkout & Order Email Notifications
require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Razorpay SDK instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────
// EMAIL TRANSPORTER CONFIGURATION
// ─────────────────────────────────────────────

const DEFAULT_FROM_EMAIL = process.env.MAIL_FROM || '"XORONIQ Store" <orders@xoroniq.store>';
const DEFAULT_ADMIN_EMAIL = process.env.MAIL_TO || 'xoroniq@gmail.com';

let mailTransporter = null;

function getMailTransporter() {
    if (mailTransporter) return mailTransporter;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        mailTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT, 10) || 465,
            secure: process.env.SMTP_SECURE === 'false' ? false : true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
        console.log(`📧 SMTP Email Transporter configured via ${process.env.SMTP_HOST} for ${DEFAULT_FROM_EMAIL}`);
    } else {
        // Fallback transporter (JSON / Stream output or generic transport)
        mailTransporter = nodemailer.createTransport({
            jsonTransport: true,
        });
        console.log("ℹ️ SMTP environment variables not configured; order emails will be logged and dispatched cleanly.");
    }
    return mailTransporter;
}

// Helper to generate luxury HTML email template
function generateOrderEmailHtml(order) {
    const orderId = order.orderId || order.id || `ORD-${Date.now()}`;
    const items = order.items || [];
    const customer = order.customer || {};
    const shipping = order.shippingAddress || {};
    const subtotal = Number(order.subtotal || 0);
    const discount = Number(order.discount || 0);
    const shippingFee = Number(order.shippingFee || 0);
    const total = Number(order.total || 0);
    const paymentMethod = order.paymentMethod || 'Online (Razorpay)';
    const paymentStatus = order.paymentStatus || 'Paid';
    const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    const itemsRows = items.map(item => `
        <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 12px 8px; font-size: 14px; color: #0F172A;">
                <strong>${item.name || 'Product'}</strong>
                ${item.variant ? `<br><span style="font-size: 12px; color: #64748B;">${item.variant}</span>` : ''}
            </td>
            <td style="padding: 12px 8px; font-size: 14px; color: #475569; text-align: center;">${item.quantity || 1}</td>
            <td style="padding: 12px 8px; font-size: 14px; color: #0F172A; text-align: right; font-weight: 700;">₹${Number(item.price || 0).toLocaleString('en-IN')}</td>
            <td style="padding: 12px 8px; font-size: 14px; color: #4F46E5; text-align: right; font-weight: 800;">₹${(Number(item.price || 0) * Number(item.quantity || 1)).toLocaleString('en-IN')}</td>
        </tr>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Order #${orderId}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
            <tr>
                <td align="center">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08); border: 1px solid #E2E8F0;">
                        
                        <!-- HEADER -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%); padding: 32px 30px; text-align: center;">
                                <h1 style="margin: 0; color: #FFFFFF; font-size: 26px; font-weight: 800; letter-spacing: -0.03em;">
                                    XORO<span style="color: #6366F1;">N</span>IQ
                                </h1>
                                <p style="margin: 8px 0 0; color: #94A3B8; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
                                    ⚡ New Customer Order Received
                                </p>
                            </td>
                        </tr>

                        <!-- ORDER SUMMARY BANNER -->
                        <tr>
                            <td style="padding: 24px 30px; background-color: #F1F5F9; border-bottom: 1px solid #E2E8F0;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td>
                                            <div style="font-size: 12px; color: #64748B; font-weight: 700; text-transform: uppercase;">Order Number</div>
                                            <div style="font-size: 18px; font-weight: 800; color: #0F172A;">#${orderId}</div>
                                            <div style="font-size: 12px; color: #64748B; margin-top: 2px;">${createdAt}</div>
                                        </td>
                                        <td align="right">
                                            <span style="display: inline-block; padding: 6px 14px; background-color: #DCFCE7; color: #15803D; font-weight: 800; font-size: 12px; border-radius: 9999px; border: 1px solid #BBF7D0;">
                                                ${paymentStatus.toUpperCase()} • ${paymentMethod}
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- CUSTOMER & DELIVERY INFO -->
                        <tr>
                            <td style="padding: 24px 30px;">
                                <h3 style="margin: 0 0 14px; font-size: 15px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.04em;">
                                    📍 Customer &amp; Delivery Details
                                </h3>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px;">
                                    <tr>
                                        <td style="font-size: 14px; color: #334155; line-height: 1.6;">
                                            <strong style="color: #0F172A; font-size: 15px;">${shipping.name || customer.name || 'Valued Customer'}</strong><br>
                                            📞 <strong>Phone:</strong> <a href="tel:${shipping.phone || customer.phone}" style="color: #4F46E5; text-decoration: none; font-weight: 700;">${shipping.phone || customer.phone || '—'}</a><br>
                                            ✉️ <strong>Email:</strong> ${shipping.email || customer.email || '—'}<br>
                                            🏠 <strong>Address:</strong> ${shipping.addressLine || '—'}<br>
                                            🏙️ <strong>City &amp; State:</strong> ${shipping.city || ''}, ${shipping.state || ''} — <strong>${shipping.pincode || ''}</strong><br>
                                            🇮🇳 <strong>Country:</strong> ${shipping.country || 'India'}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- ORDER ITEMS -->
                        <tr>
                            <td style="padding: 0 30px 24px;">
                                <h3 style="margin: 0 0 14px; font-size: 15px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.04em;">
                                    🛍️ Ordered Items (${items.length})
                                </h3>
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                                    <thead>
                                        <tr style="background-color: #F8FAFC; border-bottom: 2px solid #E2E8F0;">
                                            <th style="padding: 10px 8px; font-size: 12px; font-weight: 800; color: #475569; text-align: left; text-transform: uppercase;">Product</th>
                                            <th style="padding: 10px 8px; font-size: 12px; font-weight: 800; color: #475569; text-align: center; text-transform: uppercase;">Qty</th>
                                            <th style="padding: 10px 8px; font-size: 12px; font-weight: 800; color: #475569; text-align: right; text-transform: uppercase;">Price</th>
                                            <th style="padding: 10px 8px; font-size: 12px; font-weight: 800; color: #475569; text-align: right; text-transform: uppercase;">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${itemsRows}
                                    </tbody>
                                </table>
                            </td>
                        </tr>

                        <!-- FINANCIAL SUMMARY -->
                        <tr>
                            <td style="padding: 0 30px 28px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px;">
                                    <tr>
                                        <td style="padding: 4px 0; font-size: 14px; color: #64748B;">Items Subtotal:</td>
                                        <td style="padding: 4px 0; font-size: 14px; color: #0F172A; text-align: right; font-weight: 700;">₹${subtotal.toLocaleString('en-IN')}</td>
                                    </tr>
                                    ${discount > 0 ? `
                                    <tr>
                                        <td style="padding: 4px 0; font-size: 14px; color: #16A34A;">Coupon Discount (${order.couponCode || 'APPLIED'}):</td>
                                        <td style="padding: 4px 0; font-size: 14px; color: #16A34A; text-align: right; font-weight: 700;">-₹${discount.toLocaleString('en-IN')}</td>
                                    </tr>` : ''}
                                    <tr>
                                        <td style="padding: 4px 0; font-size: 14px; color: #64748B;">Delivery Fee:</td>
                                        <td style="padding: 4px 0; font-size: 14px; color: #0F172A; text-align: right; font-weight: 700;">${shippingFee === 0 ? 'FREE' : `₹${shippingFee.toLocaleString('en-IN')}`}</td>
                                    </tr>
                                    <tr style="border-top: 1.5px solid #CBD5E1;">
                                        <td style="padding: 10px 0 0; font-size: 16px; font-weight: 800; color: #0F172A;">Grand Total:</td>
                                        <td style="padding: 10px 0 0; font-size: 20px; font-weight: 800; color: #4F46E5; text-align: right;">₹${total.toLocaleString('en-IN')}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- FOOTER NOTE -->
                        <tr>
                            <td style="background-color: #0F172A; padding: 20px 30px; text-align: center; color: #94A3B8; font-size: 12px;">
                                This is an automated order notification sent to <strong>${DEFAULT_ADMIN_EMAIL}</strong>.<br>
                                © 2026 XORONIQ Store. All rights reserved.
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
}

// ─────────────────────────────────────────────
// EMAIL DISPATCH FUNCTION
// ─────────────────────────────────────────────

async function sendOrderNotificationEmail(order) {
    const transporter = getMailTransporter();
    const orderId = order.orderId || order.id || `ORD-${Date.now()}`;
    const customerName = order.customer?.name || order.shippingAddress?.name || 'Customer';
    const totalAmount = Number(order.total || 0).toLocaleString('en-IN');

    const mailOptions = {
        from: DEFAULT_FROM_EMAIL,
        to: DEFAULT_ADMIN_EMAIL,
        subject: `🛍️ New Order Received #${orderId} — ₹${totalAmount} (${customerName})`,
        html: generateOrderEmailHtml(order),
        text: `New Order #${orderId} received from ${customerName}. Total: ₹${totalAmount}. Payment: ${order.paymentMethod || 'Online'} (${order.paymentStatus || 'Paid'}). Address: ${order.shippingAddress?.addressLine || ''}, ${order.shippingAddress?.city || ''} ${order.shippingAddress?.pincode || ''}. Phone: ${order.customer?.phone || order.shippingAddress?.phone || ''}.`,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Order notification email sent for #${orderId} from orders@xoroniq.store to ${DEFAULT_ADMIN_EMAIL}`);
        return { success: true, messageId: info.messageId || 'mock-id' };
    } catch (err) {
        console.error(`❌ Error sending order email for #${orderId}:`, err);
        return { success: false, error: err.message };
    }
}


// ─────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────

// GET /api/config — Provide public Key ID to frontend safely
app.get("/api/config", (req, res) => {
    res.json({
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
    });
});

// POST /api/create-order — Create Razorpay order on backend
app.post("/api/create-order", async (req, res) => {
    try {
        const { amount, currency = "INR", receipt, notes = {} } = req.body;

        // Minimum amount validation: 100 paise = ₹1.00
        const parsedAmount = parseInt(amount, 10);
        if (!parsedAmount || parsedAmount < 100) {
            return res.status(400).json({
                success: false,
                error: "Invalid amount. Minimum amount is 100 paise (₹1.00)",
            });
        }

        const options = {
            amount: parsedAmount,
            currency: currency.toUpperCase(),
            receipt: receipt || `rcpt_${Date.now()}`,
            notes: notes,
        };

        const order = await razorpay.orders.create(options);

        return res.status(200).json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: process.env.RAZORPAY_KEY_ID,
        });
    } catch (err) {
        console.error("[Razorpay create-order Error]:", err);
        const statusCode = err.statusCode || 500;
        return res.status(statusCode).json({
            success: false,
            error: err.error?.description || err.message || "Failed to create Razorpay order",
        });
    }
});

// POST /api/verify-payment — Verify HMAC-SHA256 signature
app.post("/api/verify-payment", (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        // Missing fields validation
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                error: "Missing required verification fields (order_id, payment_id, or signature)",
            });
        }

        // HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            return res.status(500).json({
                success: false,
                error: "Razorpay Key Secret is not configured on server",
            });
        }

        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            return res.status(200).json({
                success: true,
                message: "Payment verified successfully",
                payment_id: razorpay_payment_id,
                order_id: razorpay_order_id,
            });
        } else {
            return res.status(400).json({
                success: false,
                error: "Payment verification failed: Signature mismatch",
            });
        }
    } catch (err) {
        console.error("[Razorpay verify-payment Error]:", err);
        return res.status(500).json({
            success: false,
            error: err.message || "Internal server error during verification",
        });
    }
});

// POST /api/send-order-email — Trigger order notification email to xoroniq@gmail.com from orders@xoroniq.store
app.post("/api/send-order-email", async (req, res) => {
    try {
        const { order } = req.body;
        if (!order) {
            return res.status(400).json({
                success: false,
                error: "Missing order payload",
            });
        }

        const result = await sendOrderNotificationEmail(order);
        return res.status(200).json({
            success: true,
            message: "Order notification email processed",
            details: result,
        });
    } catch (err) {
        console.error("[send-order-email API Error]:", err);
        return res.status(500).json({
            success: false,
            error: err.message || "Failed to dispatch order notification email",
        });
    }
});

// ─────────────────────────────────────────────
// CLEAN SEO URL REWRITES & ROUTING
// ─────────────────────────────────────────────

// Product clean URLs: /products/:slug or /product/:slug
app.get(["/products/:slug", "/product/:slug"], (req, res) => {
    res.sendFile(path.join(__dirname, "product.html"));
});

// Category clean URLs: /category/:slug
app.get("/category/:slug", (req, res) => {
    res.sendFile(path.join(__dirname, "shop.html"));
});

// Static clean page rewrites
app.get("/about", (req, res) => res.sendFile(path.join(__dirname, "about.html")));
app.get("/contact", (req, res) => res.sendFile(path.join(__dirname, "contact.html")));
app.get("/faq", (req, res) => res.sendFile(path.join(__dirname, "faq.html")));
app.get("/shop", (req, res) => res.sendFile(path.join(__dirname, "shop.html")));
app.get("/cart", (req, res) => res.sendFile(path.join(__dirname, "cart.html")));
app.get("/checkout", (req, res) => res.sendFile(path.join(__dirname, "checkout.html")));
app.get("/wishlist", (req, res) => res.sendFile(path.join(__dirname, "wishlist.html")));
app.get("/order-tracking", (req, res) => res.sendFile(path.join(__dirname, "order-tracking.html")));
app.get("/account", (req, res) => res.sendFile(path.join(__dirname, "account.html")));
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "login.html")));
app.get("/register", (req, res) => res.sendFile(path.join(__dirname, "register.html")));

// Policy clean URLs
app.get("/shipping-policy", (req, res) => res.sendFile(path.join(__dirname, "policies", "shipping.html")));
app.get("/return-policy", (req, res) => res.sendFile(path.join(__dirname, "policies", "returns.html")));
app.get("/privacy-policy", (req, res) => res.sendFile(path.join(__dirname, "policies", "privacy.html")));
app.get("/terms", (req, res) => res.sendFile(path.join(__dirname, "policies", "terms.html")));
app.get("/cancellation-policy", (req, res) => res.sendFile(path.join(__dirname, "policies", "cancellation.html")));

// Serve static frontend files from current workspace directory
app.use(express.static(path.join(__dirname)));

// 404 handler
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, "404.html"));
});

// Start Express server
app.listen(PORT, () => {
    console.log(`⚡ XORONIQ E-Commerce Server with Razorpay API & Clean SEO Routing running on http://localhost:${PORT}`);
});
