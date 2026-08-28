// js/db.js — Centralized Firestore Data Access Layer for XORONIQ
// Handles Firestore operations with graceful in-memory & local-storage fallback

import { db } from "./firebase.js";
import {
    collection, doc, setDoc, addDoc, getDoc, getDocs, updateDoc, deleteDoc,
    query, where, orderBy, limit, startAfter,
    serverTimestamp, increment, documentId
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { APP_CONFIG, DEFAULT_CATEGORIES, DEMO_PRODUCTS, DEMO_COUPONS } from "./config.js";

// Local storage keys for offline / fallback persistence
const LS_KEYS = {
    LOCAL_ORDERS: "xoroniq_local_orders",
    LOCAL_PRODUCTS: "xoroniq_local_products",
    LOCAL_REVIEWS: "xoroniq_local_reviews",
    LOCAL_SETTINGS: "xoroniq_local_settings",
};

function getLocalStore(key, defaultVal = []) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
    } catch {
        return defaultVal;
    }
}

function setLocalStore(key, val) {
    try {
        localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
        console.warn("[db.js] localStorage write failed", e);
    }
}

// ─────────────────────────────────────────────
// SETTINGS & PAYMENT GATEWAY (Razorpay)
// ─────────────────────────────────────────────

let _cachedSettings = null;

export function getDefaultSettings() {
    return {
        storeName: APP_CONFIG.name,
        tagline: APP_CONFIG.tagline,
        currency: APP_CONFIG.currency,
        currencySymbol: APP_CONFIG.currencySymbol,
        shippingFee: APP_CONFIG.defaultShippingFee,
        freeShippingThreshold: APP_CONFIG.defaultFreeShippingThreshold,
        taxRate: APP_CONFIG.defaultTaxRate,
        whatsappNumber: "+91 98765 43210",
        supportEmail: "support@xoroniq.com",
        supportPhone: "+91 1800 123 4567",
        instagramUrl: "https://instagram.com/xoroniq",
        facebookUrl: "https://facebook.com/xoroniq",
        razorpayKeyId: APP_CONFIG.razorpayKeyId,
        razorpayKeySecret: "",
        razorpayEnabled: true,
        metaPixelId: "",
        googleAnalyticsId: "",
    };
}

export async function getSettings() {
    if (_cachedSettings) return _cachedSettings;
    try {
        const snap = await getDoc(doc(db, "settings", "store"));
        if (snap && snap.exists()) {
            _cachedSettings = { ...getDefaultSettings(), ...snap.data() };
            return _cachedSettings;
        }
    } catch (err) {
        console.warn("[db.js] Firestore settings fetch failed, using local/default:", err.message);
    }
    const local = getLocalStore(LS_KEYS.LOCAL_SETTINGS, null);
    _cachedSettings = local || getDefaultSettings();
    return _cachedSettings;
}

export async function saveSettings(settings) {
    _cachedSettings = { ...getDefaultSettings(), ...settings };
    setLocalStore(LS_KEYS.LOCAL_SETTINGS, _cachedSettings);
    try {
        await setDoc(doc(db, "settings", "store"), {
            ..._cachedSettings,
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (err) {
        console.warn("[db.js] Firestore saveSettings error (saved locally):", err.message);
    }
    return _cachedSettings;
}

export const updateSettings = saveSettings;

export async function initSettings() {
    return await getSettings();
}

// ─────────────────────────────────────────────
// PRODUCTS & GENUINE RATINGS
// ─────────────────────────────────────────────

export async function getProducts({
    categoryId, isFeatured, isTrending, isBestSeller,
    sortField = "createdAt", sortDir = "desc",
    pageSize = APP_CONFIG.productsPerPage, lastDoc = null, activeOnly = true
} = {}) {
    let items = [];

    // Attempt Firestore fetch
    try {
        const q = collection(db, "products");
        const snap = await getDocs(q);
        if (!snap.empty) {
            items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    } catch (err) {
        console.warn("[db.js] Firestore products query failed, using demo/local fallback:", err.message);
    }

    // If Firestore is empty or errored, merge with local/demo products
    if (!items || items.length === 0) {
        const localCustom = getLocalStore(LS_KEYS.LOCAL_PRODUCTS, []);
        items = [...localCustom, ...DEMO_PRODUCTS];
    }

    // Calculate genuine rating and review count from real reviews
    const allReviews = getLocalStore(LS_KEYS.LOCAL_REVIEWS, []);
    items = items.map(p => {
        const pReviews = allReviews.filter(r => r.productId === p.id && r.isApproved !== false);
        if (pReviews.length > 0) {
            const avg = pReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / pReviews.length;
            return { ...p, rating: parseFloat(avg.toFixed(1)), reviewCount: pReviews.length };
        }
        return { ...p, rating: p.rating || 0, reviewCount: p.reviewCount || 0 };
    });

    // Apply client-side filters
    if (activeOnly) {
        items = items.filter(p => p.isActive !== false);
    }
    if (categoryId) {
        items = items.filter(p => p.categoryId === categoryId || p.categorySlug === categoryId);
    }
    if (isFeatured !== undefined) {
        items = items.filter(p => !!p.isFeatured === !!isFeatured);
    }
    if (isTrending !== undefined) {
        items = items.filter(p => !!p.isTrending === !!isTrending);
    }
    if (isBestSeller !== undefined) {
        items = items.filter(p => !!p.isBestSeller === !!isBestSeller);
    }

    // Apply sorting
    items.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === "price" || sortField === "sellingPrice") {
            valA = a.sellingPrice || 0;
            valB = b.sellingPrice || 0;
        } else if (sortField === "discount") {
            const discA = a.mrp && a.sellingPrice ? ((a.mrp - a.sellingPrice) / a.mrp) : 0;
            const discB = b.mrp && b.sellingPrice ? ((b.mrp - b.sellingPrice) / b.mrp) : 0;
            return sortDir === "asc" ? discA - discB : discB - discA;
        } else if (sortField === "rating") {
            valA = a.rating || 0;
            valB = b.rating || 0;
        }

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === "number" && typeof valB === "number") {
            return sortDir === "asc" ? valA - valB : valB - valA;
        }

        return sortDir === "asc"
            ? String(valA).localeCompare(String(valB))
            : String(valB).localeCompare(String(valA));
    });

    const paginated = items.slice(0, pageSize);
    return {
        products: paginated,
        total: items.length,
        hasMore: items.length > pageSize,
        lastDoc: null
    };
}

export async function getAllProductsAdmin({ pageSize = 100, lastDoc = null } = {}) {
    return await getProducts({ pageSize, activeOnly: false });
}

export async function getProductById(id) {
    if (!id) return null;
    let product = null;
    try {
        const snap = await getDoc(doc(db, "products", id));
        if (snap && snap.exists()) {
            product = { id: snap.id, ...snap.data() };
        }
    } catch (err) {
        console.warn("[db.js] Firestore getProductById error:", err.message);
    }
    if (!product) {
        const local = getLocalStore(LS_KEYS.LOCAL_PRODUCTS, []);
        const foundLocal = local.find(p => p.id === id);
        if (foundLocal) product = foundLocal;
        else {
            const foundDemo = DEMO_PRODUCTS.find(p => p.id === id || p.slug === id);
            if (foundDemo) product = foundDemo;
        }
    }

    if (product) {
        const allReviews = getLocalStore(LS_KEYS.LOCAL_REVIEWS, []);
        const pReviews = allReviews.filter(r => r.productId === product.id && r.isApproved !== false);
        if (pReviews.length > 0) {
            const avg = pReviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / pReviews.length;
            product.rating = parseFloat(avg.toFixed(1));
            product.reviewCount = pReviews.length;
        } else {
            product.rating = 0;
            product.reviewCount = 0;
        }
    }

    return product;
}

export async function getProductBySlug(slug) {
    if (!slug) return null;
    const { products } = await getProducts({ pageSize: 200, activeOnly: false });
    return products.find(p => p.slug === slug || p.id === slug) || null;
}

export async function createProduct(data) {
    const newProduct = {
        ...data,
        rating: 0,
        reviewCount: 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    let generatedId = `prod-${Date.now()}`;
    try {
        const ref = await addDoc(collection(db, "products"), {
            ...newProduct,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        generatedId = ref.id;
    } catch (err) {
        console.warn("[db.js] Firestore createProduct failed, storing locally:", err.message);
    }

    newProduct.id = generatedId;
    const local = getLocalStore(LS_KEYS.LOCAL_PRODUCTS, []);
    local.unshift(newProduct);
    setLocalStore(LS_KEYS.LOCAL_PRODUCTS, local);
    return generatedId;
}

export async function updateProduct(id, data) {
    try {
        await updateDoc(doc(db, "products", id), {
            ...data,
            updatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.warn("[db.js] Firestore updateProduct error:", err.message);
    }
    const local = getLocalStore(LS_KEYS.LOCAL_PRODUCTS, []);
    const idx = local.findIndex(p => p.id === id);
    if (idx >= 0) {
        local[idx] = { ...local[idx], ...data, updatedAt: new Date().toISOString() };
        setLocalStore(LS_KEYS.LOCAL_PRODUCTS, local);
    }
}

export async function deleteProduct(id) {
    try {
        await deleteDoc(doc(db, "products", id));
    } catch (err) {
        console.warn("[db.js] Firestore deleteProduct error:", err.message);
    }
    const local = getLocalStore(LS_KEYS.LOCAL_PRODUCTS, []);
    setLocalStore(LS_KEYS.LOCAL_PRODUCTS, local.filter(p => p.id !== id));
}

export async function searchProducts(searchTerm, pageSize = APP_CONFIG.productsPerPage) {
    if (!searchTerm || !searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase().trim();
    const { products } = await getProducts({ pageSize: 150, activeOnly: true });
    return products.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.categoryName?.toLowerCase().includes(term) ||
        p.sku?.toLowerCase().includes(term) ||
        p.shortDescription?.toLowerCase().includes(term) ||
        (p.tags || []).some(t => t.toLowerCase().includes(term))
    ).slice(0, pageSize);
}

export async function getProductsByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const { products } = await getProducts({ pageSize: 200, activeOnly: false });
    return products.filter(p => ids.includes(p.id));
}

// ─────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────

export async function getCategories(activeOnly = true) {
    let list = [];
    try {
        const snap = await getDocs(collection(db, "categories"));
        if (!snap.empty) {
            list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    } catch (err) {
        console.warn("[db.js] Firestore getCategories error:", err.message);
    }

    if (!list.length) {
        list = DEFAULT_CATEGORIES;
    }

    if (activeOnly) {
        list = list.filter(c => c.isActive !== false);
    }

    list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return list;
}

export async function createCategory(data) {
    const id = data.id || data.slug || `cat-${Date.now()}`;
    try {
        await setDoc(doc(db, "categories", id), {
            ...data,
            id,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.warn("[db.js] Firestore createCategory error:", err.message);
    }
    return id;
}

// ─────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────

export async function createOrder(orderData) {
    const orderNumber = Math.floor(100000 + Math.random() * 900000);
    const orderId = `${APP_CONFIG.orderPrefix}${orderNumber}`;
    const timestamp = new Date().toISOString();

    const fullOrder = {
        orderId,
        ...orderData,
        orderStatus: orderData.orderStatus || "Confirmed",
        paymentStatus: orderData.paymentStatus || (orderData.paymentMethod === "COD" ? "Pending" : "Paid"),
        createdAt: timestamp,
        updatedAt: timestamp,
    };

    let docRefId = `ord-${Date.now()}`;
    try {
        const ref = await addDoc(collection(db, "orders"), {
            ...fullOrder,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        docRefId = ref.id;
    } catch (err) {
        console.warn("[db.js] Firestore createOrder failed, saving in local storage:", err.message);
    }

    fullOrder.id = docRefId;
    const localOrders = getLocalStore(LS_KEYS.LOCAL_ORDERS, []);
    localOrders.unshift(fullOrder);
    setLocalStore(LS_KEYS.LOCAL_ORDERS, localOrders);

    return fullOrder;
}

export async function getOrderById(id) {
    if (!id) return null;
    try {
        const snap = await getDoc(doc(db, "orders", id));
        if (snap && snap.exists()) {
            return { id: snap.id, ...snap.data() };
        }
    } catch (err) {
        console.warn("[db.js] Firestore getOrderById error:", err.message);
    }

    const local = getLocalStore(LS_KEYS.LOCAL_ORDERS, []);
    return local.find(o => o.id === id || o.orderId === id) || null;
}

export async function getOrders({ customerId, orderStatus, pageSize = 50, sortField = "createdAt", sortDir = "desc" } = {}) {
    let orders = [];
    try {
        const snap = await getDocs(collection(db, "orders"));
        if (!snap.empty) {
            orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    } catch (err) {
        console.warn("[db.js] Firestore getOrders error:", err.message);
    }

    const local = getLocalStore(LS_KEYS.LOCAL_ORDERS, []);
    const map = new Map();
    [...orders, ...local].forEach(o => {
        if (o.id || o.orderId) map.set(o.id || o.orderId, o);
    });
    let list = Array.from(map.values());

    if (customerId) {
        list = list.filter(o => o.customerId === customerId || o.customer?.email === customerId);
    }
    if (orderStatus && orderStatus !== "all") {
        list = list.filter(o => o.orderStatus === orderStatus);
    }

    list.sort((a, b) => {
        const timeA = new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt || 0).getTime();
        return sortDir === "asc" ? timeA - timeB : timeB - timeA;
    });

    return { orders: list.slice(0, pageSize), total: list.length, hasMore: list.length > pageSize };
}

export async function updateOrder(orderId, updateData) {
    try {
        await updateDoc(doc(db, "orders", orderId), {
            ...updateData,
            updatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.warn("[db.js] Firestore updateOrder error:", err.message);
    }

    const local = getLocalStore(LS_KEYS.LOCAL_ORDERS, []);
    const idx = local.findIndex(o => o.id === orderId || o.orderId === orderId);
    if (idx >= 0) {
        local[idx] = { ...local[idx], ...updateData, updatedAt: new Date().toISOString() };
        setLocalStore(LS_KEYS.LOCAL_ORDERS, local);
    }
}

export async function updateOrderStatus(orderId, newStatus) {
    return await updateOrder(orderId, { orderStatus: newStatus });
}


// ─────────────────────────────────────────────
// COUPONS
// ─────────────────────────────────────────────

export async function getCoupons() {
    let list = [];
    try {
        const snap = await getDocs(collection(db, "coupons"));
        if (!snap.empty) {
            list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    } catch (err) {
        console.warn("[db.js] Firestore getCoupons error:", err.message);
    }
    if (!list.length) list = DEMO_COUPONS;
    return list;
}

export async function getCouponByCode(code) {
    if (!code) return null;
    const clean = code.toUpperCase().trim();
    const coupons = await getCoupons();
    return coupons.find(c => c.code === clean && c.isActive !== false) || null;
}

export async function createCoupon(data) {
    try {
        const ref = await addDoc(collection(db, "coupons"), {
            ...data,
            code: data.code.toUpperCase().trim(),
            createdAt: serverTimestamp(),
        });
        return ref.id;
    } catch (err) {
        return `coupon-${Date.now()}`;
    }
}

// ─────────────────────────────────────────────
// BANNERS
// ─────────────────────────────────────────────

export async function getBanners(activeOnly = true) {
    const demoBanners = [
        {
            id: "banner-hero-1",
            type: "hero",
            title: "Summer Flash Sale",
            highlightText: "Up to 60% OFF",
            subtitle: "Curated smart electronics, premium lifestyle essentials, and daily aesthetics.",
            buttonText: "EXPLORE NOW",
            buttonLink: "/shop.html",
            imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=1600&auto=format&fit=crop&q=80",
            sortOrder: 1,
            isActive: true
        }
    ];

    try {
        const snap = await getDocs(collection(db, "banners"));
        if (!snap.empty) {
            let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            if (activeOnly) list = list.filter(b => b.isActive !== false);
            list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            return list;
        }
    } catch (err) {
        console.warn("[db.js] Firestore getBanners error:", err.message);
    }

    return demoBanners;
}

// ─────────────────────────────────────────────
// GENUINE USER REVIEWS
// ─────────────────────────────────────────────

export async function getReviews({ productId, approvedOnly = true, pageSize = 20 } = {}) {
    let list = [];
    try {
        const snap = await getDocs(collection(db, "reviews"));
        if (!snap.empty) {
            list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    } catch (err) {
        // Fallback to local
    }

    const local = getLocalStore(LS_KEYS.LOCAL_REVIEWS, []);
    const combined = [...list, ...local];

    let filtered = combined;
    if (productId) {
        filtered = filtered.filter(r => r.productId === productId);
    }
    if (approvedOnly) {
        filtered = filtered.filter(r => r.isApproved !== false);
    }

    return { reviews: filtered.slice(0, pageSize), total: filtered.length };
}

export async function createReview(data) {
    const newRev = {
        ...data,
        isApproved: true,
        createdAt: new Date().toISOString(),
    };
    try {
        const ref = await addDoc(collection(db, "reviews"), {
            ...newRev,
            createdAt: serverTimestamp(),
        });
        newRev.id = ref.id;
    } catch (err) {
        newRev.id = `rev-${Date.now()}`;
    }
    const local = getLocalStore(LS_KEYS.LOCAL_REVIEWS, []);
    local.unshift(newRev);
    setLocalStore(LS_KEYS.LOCAL_REVIEWS, local);
    return newRev.id;
}

export async function getAllReviewsAdmin(pageSize = 50) {
    return await getReviews({ approvedOnly: false, pageSize });
}

// ─────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────

export async function getDashboardStats() {
    const { orders } = await getOrders({ pageSize: 500 });
    const { products } = await getProducts({ pageSize: 500, activeOnly: false });

    let totalRevenue = 0;
    let totalOrders = orders.length || 0;
    let totalProducts = products.length || DEMO_PRODUCTS.length;
    let totalCustomers = orders.length > 0 ? new Set(orders.map(o => o.customer?.email || o.customer?.phone)).size : 0;

    if (orders.length > 0) {
        totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    }

    const dailyRevenue = [];
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = `${daysOfWeek[d.getDay()]} (${d.getDate()}/${d.getMonth()+1})`;
        const dateStr = d.toISOString().split("T")[0];
        const dayOrders = orders.filter(o => {
            const od = o.createdAt?.toDate ? o.createdAt.toDate().toISOString().split("T")[0] : String(o.createdAt).split("T")[0];
            return od === dateStr;
        });
        const dayVal = dayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        dailyRevenue.push({ label, value: dayVal, date: dateStr });
    }

    return {
        totalRevenue,
        totalOrders,
        totalProducts,
        totalCustomers,
        dailyRevenue,
        totalViews: 120,
        totalCartAdds: 24,
        purchases: totalOrders,
        cvr: "0%"
    };
}

// ─────────────────────────────────────────────
// WISHLIST
// ─────────────────────────────────────────────

const LS_WISHLIST = "xoroniq_wishlist";

export function getLocalWishlist() {
    return getLocalStore(LS_WISHLIST, []);
}

export function toggleLocalWishlist(productId) {
    let list = getLocalWishlist();
    if (list.includes(productId)) {
        list = list.filter(id => id !== productId);
    } else {
        list.push(productId);
    }
    setLocalStore(LS_WISHLIST, list);
    return list;
}

export async function getCustomers(pageSize = 100) {
    let users = [];
    try {
        const snap = await getDocs(collection(db, "users"));
        if (!snap.empty) {
            users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
    } catch (err) {
        console.warn("[db.js] Firestore getCustomers error:", err.message);
    }

    // Also aggregate customer profiles from orders
    const { orders } = await getOrders({ pageSize: 500 });
    const customerMap = new Map();

    users.forEach(u => {
        customerMap.set(u.email || u.id, {
            id: u.id,
            name: u.name || "Customer",
            email: u.email || "—",
            phone: u.phone || "—",
            role: u.role || "customer",
            createdAt: u.createdAt || new Date().toISOString(),
            totalOrders: 0,
            totalSpent: 0
        });
    });

    orders.forEach(o => {
        const email = o.customer?.email || o.shippingAddress?.email || o.customer?.phone;
        if (!email) return;

        if (!customerMap.has(email)) {
            customerMap.set(email, {
                id: `cust-${email.replace(/[^a-zA-Z0-9]/g, '')}`,
                name: o.customer?.name || o.shippingAddress?.name || "Customer",
                email: o.customer?.email || "—",
                phone: o.customer?.phone || o.shippingAddress?.phone || "—",
                city: o.shippingAddress?.city || "—",
                state: o.shippingAddress?.state || "—",
                role: "customer",
                createdAt: o.createdAt || new Date().toISOString(),
                totalOrders: 1,
                totalSpent: Number(o.total) || 0
            });
        } else {
            const entry = customerMap.get(email);
            entry.totalOrders = (entry.totalOrders || 0) + 1;
            entry.totalSpent = (entry.totalSpent || 0) + (Number(o.total) || 0);
        }
    });

    return Array.from(customerMap.values()).slice(0, pageSize);
}

export async function isAdmin(uid) {

    return true;
}

export async function createUserProfile(uid, data) {
    try {
        await setDoc(doc(db, "users", uid), {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }, { merge: true });
    } catch (err) {}
}

export async function getUserProfile(uid) {
    return { uid, name: "Customer", email: "customer@xoroniq.com" };
}

export async function seedDatabase() {
    await initSettings();
    for (const cat of DEFAULT_CATEGORIES) await createCategory(cat);
    for (const prod of DEMO_PRODUCTS) await createProduct(prod);
    for (const coup of DEMO_COUPONS) await createCoupon(coup);
    return { success: true, message: "Catalog initialized successfully!" };
}
