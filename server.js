// server.js — Node.js & Express backend for XORONIQ with Razorpay Web Checkout Integration
require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const Razorpay = require("razorpay");

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

// Serve static frontend files from current workspace directory
app.use(express.static(path.join(__dirname)));

// Start Express server
app.listen(PORT, () => {
    console.log(`⚡ XORONIQ E-Commerce Server with Razorpay API running on http://localhost:${PORT}`);
});
