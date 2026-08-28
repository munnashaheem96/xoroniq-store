// js/config.js — App-wide constants and configuration for XORONIQ

export const APP_CONFIG = {
    name: "XORONIQ",
    tagline: "Smart finds. Everyday essentials.",
    currency: "INR",
    currencySymbol: "₹",
    version: "2.1.0",

    // Razorpay Configuration (can be overridden from Store Settings in Admin)
    razorpayKeyId: "rzp_test_TV8HVNZoSzyqXL", // Demo test key / Live key

    // Pagination
    productsPerPage: 16,
    ordersPerPage: 20,
    customersPerPage: 20,
    reviewsPerPage: 20,

    // Cart
    maxCartItemQty: 10,

    // Shipping defaults
    defaultShippingFee: 20,
    defaultFreeShippingThreshold: 999,

    // Tax
    defaultTaxRate: 0,

    // Image placeholders
    placeholderImage: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80",
    logoUrl: "assets/logo/xoroniq-logo.svg",

    // Order ID prefix
    orderPrefix: "ORD-XOR-",
    orderStartNumber: 10001,

    // Search debounce ms
    searchDebounce: 300,

    // Toast duration ms
    toastDuration: 3500,

    // Animation duration ms
    animDuration: 200,

    // Pincode check demo
    demoPincodeDelivery: "Standard delivery within 3-5 business days. Express option available at checkout.",
};

export const ORDER_STATUSES = [
    "Pending",
    "Confirmed",
    "Processing",
    "Shipped",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
    "Returned",
    "Refunded",
];

export const PAYMENT_METHODS = [
    { id: "RAZORPAY", label: "Prepaid Online Payment (Razorpay)", desc: "UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards, NetBanking, Wallets" },
];

export const PAYMENT_STATUSES = [
    "Pending",
    "Paid",
    "Failed",
    "Refunded",
];

export const SORT_OPTIONS = [
    { value: "featured", label: "Featured & Curated" },
    { value: "newest", label: "Newest Arrivals" },
    { value: "popular", label: "Most Popular / Trending" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "price_desc", label: "Price: High to Low" },
    { value: "discount", label: "Biggest Discount (%)" },
    { value: "rating", label: "Customer Rated" },
];

export const STATES = [
    "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
    "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
    "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
    "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
    "Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
    "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
    "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry"
];

export const DEFAULT_CATEGORIES = [
    {
        id: "electronics",
        name: "Electronics & Smart Gear",
        slug: "electronics",
        sortOrder: 1,
        isActive: true,
        imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&auto=format&fit=crop&q=80",
        description: "Cutting-edge smart wearables, audio gear, and productivity accessories.",
        icon: "⚡"
    },
    {
        id: "home-kitchen",
        name: "Home & Smart Living",
        slug: "home-kitchen",
        sortOrder: 2,
        isActive: true,
        imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80",
        description: "Aesthetic organizers, ambient illumination, and kitchen essentials.",
        icon: "🏠"
    },
    {
        id: "fashion",
        name: "Modern Apparel & Luxe",
        slug: "fashion",
        sortOrder: 3,
        isActive: true,
        imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&auto=format&fit=crop&q=80",
        description: "Minimalist fashion staples, premium silk accessories, and apparel.",
        icon: "✨"
    },
    {
        id: "beauty",
        name: "Beauty & Daily Care",
        slug: "beauty",
        sortOrder: 4,
        isActive: true,
        imageUrl: "https://images.unsplash.com/photo-1608248597359-bb5c249a5b39?w=600&auto=format&fit=crop&q=80",
        description: "Dermatologist-tested serums, SPF barriers, and clean formulas.",
        icon: "🌿"
    },
    {
        id: "accessories",
        name: "Everyday Carry & Travel",
        slug: "accessories",
        sortOrder: 5,
        isActive: true,
        imageUrl: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop&q=80",
        description: "RFID-shielded wallets, modular travel packing organizers, and luxury cases.",
        icon: "🎒"
    },
    {
        id: "lifestyle",
        name: "Fitness & Wellness",
        slug: "lifestyle",
        sortOrder: 6,
        isActive: true,
        imageUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&auto=format&fit=crop&q=80",
        description: "High-density grip mats, insulated bottles, and portable cooling fans.",
        icon: "🧘"
    }
];

export const DEMO_PRODUCTS = [
    {
        id: "prod-sw-01",
        name: "XORO Ultra Titanium Smartwatch (AMOLED Display)",
        slug: "xoro-ultra-titanium-smartwatch",
        sku: "XOR-SW-001",
        categoryId: "electronics",
        categoryName: "Electronics & Smart Gear",
        mrp: 3499,
        sellingPrice: 1499,
        stock: 24,
        rating: 0,
        reviewCount: 0,
        isFeatured: true,
        isTrending: true,
        isBestSeller: true,
        tags: ["smartwatch", "wearable", "gadget", "bluetooth", "health"],
        shortDescription: "Ultra-bright 1.96-inch AMOLED display, BT calling, 7-day battery, SpO2 & heart-rate sensor.",
        description: "Elevate your daily hustle with the XORO Ultra Titanium Smartwatch. Engineered with an aerospace-grade titanium alloy casing, vibrant 1.96-inch Always-On AMOLED screen, crystal-clear Bluetooth HD calls, and IP68 waterproof rating. Tracks over 100 sports modes with real-time biometric telemetry.",
        primaryImage: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80",
        images: [
            "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=800&auto=format&fit=crop&q=80"
        ],
        variants: [
            { type: "Color", name: "Midnight Black", value: "Midnight Black", price: 1499 },
            { type: "Color", name: "Titanium Silver", value: "Titanium Silver", price: 1499 },
            { type: "Color", name: "Ocean Orange", value: "Ocean Orange", price: 1599 }
        ],
        specifications: {
            "Display": "1.96\" AMOLED (410x502 px, 1000 Nits)",
            "Battery Life": "Up to 7 days normal / 20 days standby",
            "Water Resistance": "IP68 Certified Water & Dust Resistant",
            "Connectivity": "Bluetooth 5.3 + Dual Microphone ANC",
            "Sensors": "Heart Rate, SpO2, Sleep Tracker, Stress Gauge",
            "Warranty": "1 Year Manufacturer Warranty"
        },
        isActive: true
    },
    {
        id: "prod-eb-02",
        name: "Aura Pods Pro Active Noise Cancelling Earbuds",
        slug: "aura-pods-pro-anc-earbuds",
        sku: "XOR-EB-002",
        categoryId: "electronics",
        categoryName: "Electronics & Smart Gear",
        mrp: 2999,
        sellingPrice: 1199,
        stock: 45,
        rating: 0,
        reviewCount: 0,
        isFeatured: true,
        isTrending: true,
        isBestSeller: true,
        tags: ["earbuds", "audio", "anc", "wireless", "bluetooth"],
        shortDescription: "35dB Hybrid Active Noise Cancellation, 13mm titanium drivers, and 36 hours playtime.",
        description: "Immerse yourself in concert-hall acoustics. The Aura Pods Pro feature 35dB Hybrid ANC, Transparency Mode for instant situational awareness, low-latency 45ms gaming sync, and Type-C fast warp charge.",
        primaryImage: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80",
        images: [
            "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=800&auto=format&fit=crop&q=80"
        ],
        variants: [
            { type: "Color", name: "Matte Black", value: "Matte Black", price: 1199 },
            { type: "Color", name: "Pearl White", value: "Pearl White", price: 1199 }
        ],
        specifications: {
            "Driver Size": "13mm Dynamic Titanium Diaphragm",
            "Noise Cancellation": "35dB Hybrid ANC + Quad ENC Mics",
            "Playtime": "8 Hours (Earbuds) + 28 Hours (Charging Case)",
            "Fast Charge": "10 Min Charge = 120 Min Playtime",
            "Water Rating": "IPX5 Sweat & Splash Guard"
        },
        isActive: true
    },
    {
        id: "prod-dl-03",
        name: "Lumina Minimalist Touch Desk Lamp with Wireless Charger",
        slug: "lumina-touch-desk-lamp-wireless-charger",
        sku: "XOR-DL-003",
        categoryId: "home-kitchen",
        categoryName: "Home & Smart Living",
        mrp: 1899,
        sellingPrice: 849,
        stock: 30,
        rating: 0,
        reviewCount: 0,
        isFeatured: true,
        isTrending: true,
        isBestSeller: false,
        tags: ["lamp", "lighting", "desk", "home", "wireless charging"],
        shortDescription: "5 color temperatures, step-less touch dimming, and built-in 10W fast wireless charging pad.",
        description: "Transform your workspace into an ergonomic sanctuary. Sleek matte aluminum body with foldable dual-axis articulation, flicker-free eye care illumination, and high-speed phone charging base.",
        primaryImage: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80",
        images: [
            "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80"
        ],
        variants: [
            { type: "Finish", name: "Anodized Black", value: "Black", price: 849 },
            { type: "Finish", name: "Arctic Silver", value: "Silver", price: 849 }
        ],
        specifications: {
            "Power Output": "12W LED + 10W Qi Wireless Fast Pad",
            "Color Modes": "3000K (Warm) to 6500K (Cool Daylight)",
            "Controls": "Smart Capacitive Touch Slider",
            "Auto Timer": "30 / 60 Min Sleep Timer"
        },
        isActive: true
    },
    {
        id: "prod-wl-04",
        name: "Aegis Carbon RFID-Shielded Slim Bifold Wallet",
        slug: "aegis-carbon-rfid-slim-wallet",
        sku: "XOR-WL-004",
        categoryId: "accessories",
        categoryName: "Everyday Carry & Travel",
        mrp: 1299,
        sellingPrice: 499,
        stock: 65,
        rating: 0,
        reviewCount: 0,
        isFeatured: true,
        isTrending: false,
        isBestSeller: true,
        tags: ["wallet", "edc", "leather", "rfid", "gift"],
        shortDescription: "Ultra-slim matte carbon fiber vegan leather with quick-card ejection & military-grade RFID block.",
        description: "Ditch bulky pockets. The Aegis Carbon wallet holds up to 8 cards and folded banknotes while remaining paper-thin. Certified 13.56 MHz RFID frequency blocking keeps your cards secure from digital pickpockets.",
        primaryImage: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80",
        images: [
            "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop&q=80"
        ],
        variants: [
            { type: "Texture", name: "Carbon Weave Black", value: "Carbon Black", price: 499 },
            { type: "Texture", name: "Vintage Saddle Brown", value: "Saddle Brown", price: 499 }
        ],
        specifications: {
            "Dimensions": "10.5 cm x 7.2 cm x 0.9 cm",
            "Capacity": "6-8 Cards + Currency Clip",
            "Security": "Full RFID / NFC Blocking Shield",
            "Material": "Reinforced Carbon Fiber Polyurethane"
        },
        isActive: true
    },
    {
        id: "prod-fs-05",
        name: "Radiance Boost 20% Vitamin C + Hyaluronic Face Serum",
        slug: "radiance-boost-vitamin-c-serum",
        sku: "XOR-FS-005",
        categoryId: "beauty",
        categoryName: "Beauty & Daily Care",
        mrp: 1499,
        sellingPrice: 599,
        stock: 52,
        rating: 0,
        reviewCount: 0,
        isFeatured: true,
        isTrending: true,
        isBestSeller: true,
        tags: ["skincare", "serum", "vitamin c", "glow", "beauty"],
        shortDescription: "Potent 20% Ethyl Ascorbic Acid + 1% Hyaluronic Acid + Ferulic booster for glowing skin.",
        description: "Target dark spots, pigmentation, and fine lines with clinical precision. Formulated with stabilized Vitamin C, Japanese Ferulic acid, and pure botanical extracts. Non-sticky, fast-absorbing formula.",
        primaryImage: "https://images.unsplash.com/photo-1608248597359-bb5c249a5b39?w=800&auto=format&fit=crop&q=80",
        images: [
            "https://images.unsplash.com/photo-1608248597359-bb5c249a5b39?w=800&auto=format&fit=crop&q=80",
            "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80"
        ],
        variants: [
            { type: "Size", name: "30 ml Glass Dropper", value: "30ml", price: 599 },
            { type: "Size", name: "50 ml Mega Pack", value: "50ml", price: 899 }
        ],
        specifications: {
            "Volume": "30 ml / 1.01 fl oz",
            "Skin Type": "All Skin Types (Safe for Sensitive Skin)",
            "Free From": "Parabens, Sulfates, Artificial Fragrance",
            "Cruelty Free": "100% PETA Certified Vegan"
        },
        isActive: true
    },
    {
        id: "prod-wb-06",
        name: "HydroVibe 1000ml Thermal Vacuum Insulated Flask",
        slug: "hydrovibe-insulated-thermal-flask",
        sku: "XOR-WB-006",
        categoryId: "lifestyle",
        categoryName: "Fitness & Wellness",
        mrp: 1599,
        sellingPrice: 699,
        stock: 40,
        rating: 0,
        reviewCount: 0,
        isFeatured: true,
        isTrending: true,
        isBestSeller: true,
        tags: ["flask", "bottle", "gym", "travel", "insulated"],
        shortDescription: "Keeps drinks cold for 24 hours / hot for 12 hours. 18/8 food-grade stainless steel with leakproof straw lid.",
        description: "Stay hydrated effortlessly. Double-walled vacuum insulation eliminates condensation. Powder-coated rugged exterior resists scratches and dents, and includes a silicone bumper and carry loop.",
        primaryImage: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80",
        images: [
            "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80"
        ],
        variants: [
            { type: "Color", name: "Matte Olive Green", value: "Olive", price: 699 },
            { type: "Color", name: "Midnight Navy", value: "Navy", price: 699 },
            { type: "Color", name: "Obsidian Black", value: "Black", price: 699 }
        ],
        specifications: {
            "Capacity": "1000 ml (32 oz)",
            "Thermal Rating": "24h Chilled / 12h Piping Hot",
            "Material": "Pro-Grade 304 Stainless Steel (BPA-Free)",
            "Lid Type": "Dual Sipper + Chug Spout"
        },
        isActive: true
    },
    {
        id: "prod-to-07",
        name: "Nomad Explorer Waterproof Tech & Travel Organizer",
        slug: "nomad-explorer-travel-organizer",
        sku: "XOR-TO-007",
        categoryId: "accessories",
        categoryName: "Everyday Carry & Travel",
        mrp: 1499,
        sellingPrice: 599,
        stock: 35,
        rating: 0,
        reviewCount: 0,
        isFeatured: false,
        isTrending: true,
        isBestSeller: false,
        tags: ["travel", "organizer", "cables", "electronics", "pouch"],
        shortDescription: "Triple-layer waterproof Cordura case with elastic cable loops, SD slots, and powerbank pocket.",
        description: "Keep your cables, power banks, SSDs, passports, and adapters organized in one sleek, water-repellent travel clutch. YKK weatherproof zippers ensure lifetime durability.",
        primaryImage: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
        images: [
            "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80"
        ],
        variants: [
            { type: "Color", name: "Heather Charcoal", value: "Charcoal", price: 599 },
            { type: "Color", name: "Deep Denim Blue", value: "Blue", price: 599 }
        ],
        specifications: {
            "Dimensions": "24 cm x 17 cm x 5 cm",
            "Pockets": "12 Elastic Straps + 6 Mesh Slots + 1 Tablet Sleeve",
            "Material": "Waterproof 900D Nylon Oxford"
        },
        isActive: true
    },
    {
        id: "prod-ym-08",
        name: "Zenith Pro Dual-Color Non-Slip TPE Yoga Mat (6mm)",
        slug: "zenith-pro-tpe-yoga-mat",
        sku: "XOR-YM-008",
        categoryId: "lifestyle",
        categoryName: "Fitness & Wellness",
        mrp: 1999,
        sellingPrice: 899,
        stock: 28,
        rating: 0,
        reviewCount: 0,
        isFeatured: true,
        isTrending: false,
        isBestSeller: true,
        tags: ["yoga", "fitness", "mat", "exercise", "pilates"],
        shortDescription: "6mm high-density eco-friendly TPE cushioning with laser-etched body alignment lines.",
        description: "Designed for yogis and athletes. Dual-textured grip surface prevents slipping even during intense hot yoga sessions. Includes complimentary heavy-duty carry strap.",
        primaryImage: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80",
        images: [
            "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&auto=format&fit=crop&q=80"
        ],
        variants: [
            { type: "Color", name: "Teal / Ash Grey", value: "Teal-Grey", price: 899 },
            { type: "Color", name: "Violet / Pastel Pink", value: "Violet-Pink", price: 899 }
        ],
        specifications: {
            "Dimensions": "183 cm x 61 cm x 6 mm",
            "Weight": "950 grams (Ultra lightweight)",
            "Material": "Biodegradable SGS Certified TPE",
            "Included": "Free Elastic Shoulder Strap"
        },
        isActive: true
    }
];

export const DEMO_COUPONS = [
    {
        code: "WELCOME10",
        discountType: "percentage",
        discountValue: 10,
        minimumOrder: 499,
        maximumDiscount: 250,
        description: "10% off on orders above ₹499",
        isActive: true
    },
    {
        code: "FESTIVE20",
        discountType: "percentage",
        discountValue: 20,
        minimumOrder: 1499,
        maximumDiscount: 500,
        description: "20% off on orders above ₹1,499",
        isActive: true
    },
    {
        code: "FLAT150",
        discountType: "flat",
        discountValue: 150,
        minimumOrder: 999,
        maximumDiscount: 150,
        description: "Flat ₹150 OFF on orders above ₹999",
        isActive: true
    }
];
