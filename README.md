# XORONIQ — Modern Dropshipping D2C E-Commerce Platform

A production-ready, minimalist, high-converting D2C dropshipping e-commerce platform and admin management panel built with **HTML5, CSS3, Vanilla ES6+ JavaScript, Firebase Firestore, and Firebase Authentication**.

---

## 🌟 Key Architecture Highlights

* **Pure Vanilla Web Stack:** Zero frontend framework bloat (no React, Vue, or Tailwind) for near-instant page load speeds and SEO indexing.
* **Modern Aesthetic Design:** Custom design system (`css/style.css`, `css/components.css`, `css/responsive.css`) tailored specifically for independent D2C brands.
* **Firestore Data Access Layer:** Centralized `js/db.js` abstraction for all catalog querying, category grouping, order lifecycle, coupons, reviews, and analytics.
* **Role-Based Access Control:** Secure admin dashboard protected via `users/{uid}.role === 'admin'` checks in `js/auth.js` and `firestore.rules`.
* **Manual Cloudinary Image Management:** Designed specifically for dropshipping owners to paste optimized image URLs directly into product forms.
* **Meta Pixel & CAPI Ready:** Native event tracking (`PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`) with server-side proxy security architecture.
* **Google Analytics 4 (GA4):** Dynamic GA4 measurement initialized through admin store configuration.

---

## 📁 Project Structure

```
xoro-store/
├── index.html                   # Storefront Homepage (Hero, Trending, Categories, Trust, Reviews)
├── shop.html                    # Catalog & Filtering (Price, category, discount, ratings, search)
├── product.html                 # Product Detail (Gallery, variants, specs, reviews, pincode check)
├── cart.html                    # Shopping Cart (Items, quantity, coupon codes, order breakdown)
├── checkout.html                # 3-Step Checkout (Customer info, address, COD / online stubs)
├── wishlist.html                # Customer Wishlist (Saved items synced with storage/Firestore)
├── account.html                 # Customer Portal (Order history, shipment tracking, profile)
├── order-details.html           # Order Summary & Invoice preview
├── order-tracking.html          # Real-time multi-step order timeline
├── login.html                   # Customer Authentication
├── register.html                # Customer Registration
├── about.html                   # Brand Story & Mission
├── contact.html                 # Contact details & inquiry form
├── faq.html                     # Interactive FAQ accordion
│
├── policies/                    # Compliance & Legal Policies
│   ├── privacy.html
│   ├── terms.html
│   ├── shipping.html
│   ├── returns.html
│   └── cancellation.html
│
├── admin/                       # Protected Store Owner Panel
│   ├── index.html               # Admin Dashboard (KPI metrics, revenue chart, recent orders)
│   ├── login.html               # Dedicated Admin Authentication
│   ├── products.html            # Products Inventory Table & quick toggles
│   ├── product-form.html        # Add / Edit Product (Cloudinary URL manager, specs builder)
│   ├── add_product.html         # Redirect alias to product-form.html
│   ├── categories.html          # Category Management & auto-slugs
│   ├── orders.html              # Order Lifecycle & Status updates (Pending -> Delivered)
│   ├── customers.html           # Customer Directory
│   ├── reviews.html             # Customer Review Moderation (1-click approval)
│   ├── banners.html             # Homepage Banner CMS
│   ├── coupons.html             # Discount Code Builder (% or Flat ₹)
│   ├── meta-ads.html            # Meta Pixel & CAPI server architecture
│   ├── analytics.html           # Conversion Funnel & GA4 Settings
│   ├── settings.html            # Shipping rules, tax rate, and store contact info
│   └── seed.html                # 1-Click Demo Data Population
│
├── css/
│   ├── style.css                # Global design system, CSS tokens, resets & typography
│   ├── components.css           # Product cards, hero, banners, sliders, modals & tabs
│   ├── responsive.css           # Media queries (320px to 1440px+), mobile drawers & touch targets
│   └── admin.css                # Dark-themed admin navigation, KPI cards & tables
│
├── js/
│   ├── firebase.js              # Firebase Modular SDK Initialization
│   ├── config.js                # App constants, Indian states list, storage keys & defaults
│   ├── db.js                    # Firestore DAL (Products, Orders, Categories, Users, Reviews)
│   ├── auth.js                  # Authentication, role guards & session listeners
│   ├── app.js                   # UI utilities, toasts, cart management & card renderers
│   ├── products.js              # Shop page filtering, sorting & pagination logic
│   ├── product-details.js       # PDP gallery touch swipe, variant selector & tabs
│   ├── cart.js                  # Cart validation, coupon engine & order totals
│   ├── checkout.js              # Checkout form validation & transaction creation
│   ├── search.js                # Debounced auto-complete search bar
│   ├── admin.js                 # Admin panel layout & authorization guards
│   ├── meta.js                  # Meta Pixel event tracker & CAPI dispatcher
│   └── analytics.js             # GA4 & Internal event tracker
│
├── firestore.rules              # Production Security Rules
├── firestore.indexes.json       # Firestore composite query indexes
└── README.md                    # Setup & architecture documentation
```

---

## 🚀 Getting Started

### 1. Configure Firebase

1. Create a project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** and **Firebase Authentication** (Email/Password provider).
3. Open `js/firebase.js` and paste your web app credentials:
   ```javascript
   export const firebaseConfig = {
       apiKey: "YOUR_API_KEY",
       authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
       projectId: "YOUR_PROJECT_ID",
       storageBucket: "YOUR_PROJECT_ID.appspot.com",
       messagingSenderId: "...",
       appId: "..."
   };
   ```
4. Deploy the security rules:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

### 2. Create Admin Account

1. Register an account at `/register.html` (e.g. `admin@xoroniq.com`).
2. Go to the Firestore Console and create/update the document:
   * **Path:** `users/{YOUR_AUTH_UID}`
   * **Fields:** `{ role: "admin", name: "Admin", email: "admin@xoroniq.com" }`
3. Sign in to the admin panel at `/admin/login.html`.

### 3. Seed Initial Demo Catalog

1. Visit `/admin/seed.html` in your browser.
2. Click **⚡ Seed Initial Store Data**.
3. Categories, starter products with Cloudinary demo URLs, hero banners, and coupons (`WELCOME10`) will be populated automatically into Firestore.

---

## 🔒 Security & Payment Gateway Architecture

### Server-Side Payment Verification (Razorpay / Stripe)
In compliance with production security standards, client browsers must **never** calculate authoritative order totals or verify payments directly:
1. When a user clicks *Place Order* with an online payment method, frontend calls your secure backend endpoint: `POST /api/create-order`.
2. The server queries Firestore for the authentic product prices and verifies the total.
3. The server generates a Razorpay `order_id` using secret keys stored in backend environment variables.
4. After checkout completion, your server webhook (`POST /api/payment-webhook`) verifies the HMAC signature and updates `orders/{id}.paymentStatus = "Paid"`.

### Meta Conversions API (CAPI) Proxy
Meta Access Tokens must remain on your backend server:
* `js/meta.js` is pre-configured to forward conversion payloads with deduplication `event_id` to your backend endpoint (e.g. `/api/capi-event`).
* The backend securely adds the server token and calls the Meta Graph API.

---

## 🖼️ Cloudinary Manual Image Workflow
For dropshipping stores:
1. Upload product images directly to your [Cloudinary Media Library](https://cloudinary.com/).
2. Copy the optimized image URL (e.g. `https://res.cloudinary.com/your-cloud/image/upload/v1/products/item.webp`).
3. Paste the URL into **Primary Display Image** or **Additional Gallery Images** in `/admin/product-form.html`.
4. The storefront handles responsive scaling and image fallbacks automatically.

---

## 📄 License
© 2026 XORONIQ. All rights reserved.
#   x o r o n i q - s t o r e  
 