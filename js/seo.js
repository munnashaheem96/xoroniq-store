// js/seo.js — Centralized SEO, Meta Tags, Open Graph, and Schema.org JSON-LD Engine for XORONIQ.store

export const SITE_SEO = {
    domain: "https://xoroniq.store",
    brand: "XORONIQ",
    siteName: "XORONIQ — Smart Finds. Everyday Essentials.",
    defaultTitle: "XORONIQ — Smart Finds. Everyday Essentials. Online Shopping in India",
    defaultDescription: "Discover trending smart gadgets, aesthetic home essentials, and everyday lifestyle gear at XORONIQ. Fast shipping across India, Cash on Delivery available, and 100% verified quality.",
    defaultKeywords: "trending products online, smart gadgets india, useful home products, affordable kitchen products, kitchen organizers, smart lifestyle products, xoroniq store, online shopping india",
    defaultImage: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200&auto=format&fit=crop&q=80",
    twitterHandle: "@xoroniq",
    currency: "INR",
    country: "IN",
};

/**
 * Update document head metadata (Title, Description, Canonical URL, Open Graph, Twitter Cards, Robots)
 */
export function updateMetaTags({
    title,
    description,
    canonicalUrl,
    keywords,
    ogType = "website",
    ogImage,
    ogImageAlt,
    noindex = false,
    price,
    currency = "INR",
    availability
} = {}) {
    const finalTitle = title ? (title.includes("XORONIQ") ? title : `${title} — XORONIQ`) : SITE_SEO.defaultTitle;
    const finalDesc = description || SITE_SEO.defaultDescription;
    const finalKeywords = keywords || SITE_SEO.defaultKeywords;
    const finalCanonical = canonicalUrl ? formatCanonical(canonicalUrl) : window.location.href.split('#')[0].split('?')[0];
    const finalImage = ogImage || SITE_SEO.defaultImage;
    const finalImageAlt = ogImageAlt || finalTitle;

    // 1. Title
    document.title = finalTitle;

    // 2. Primary Meta Tags
    setMeta('description', finalDesc);
    setMeta('keywords', finalKeywords);
    setMeta('robots', noindex ? 'noindex, nofollow' : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    setMeta('author', SITE_SEO.brand);

    // 3. Canonical Link
    setCanonicalLink(finalCanonical);

    // 4. Open Graph Meta Tags
    setMetaProperty('og:site_name', SITE_SEO.brand);
    setMetaProperty('og:type', ogType);
    setMetaProperty('og:title', finalTitle);
    setMetaProperty('og:description', finalDesc);
    setMetaProperty('og:url', finalCanonical);
    setMetaProperty('og:image', finalImage);
    setMetaProperty('og:image:alt', finalImageAlt);
    setMetaProperty('og:locale', 'en_IN');

    if (ogType === 'product' || price) {
        if (price) setMetaProperty('product:price:amount', String(price));
        setMetaProperty('product:price:currency', currency);
        if (availability) setMetaProperty('product:availability', availability);
    }

    // 5. Twitter / X Card
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:site', SITE_SEO.twitterHandle);
    setMeta('twitter:title', finalTitle);
    setMeta('twitter:description', finalDesc);
    setMeta('twitter:image', finalImage);
    setMeta('twitter:image:alt', finalImageAlt);
}

function formatCanonical(url) {
    if (!url) return SITE_SEO.domain;
    if (url.startsWith("http://") || url.startsWith("https://")) {
        return url;
    }
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${SITE_SEO.domain}${cleanPath}`;
}

function setMeta(name, content) {
    if (!content) return;
    let el = document.querySelector(`meta[name="${name}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}

function setMetaProperty(property, content) {
    if (!content) return;
    let el = document.querySelector(`meta[property="${property}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute('property', property);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}

function setCanonicalLink(href) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
    }
    link.setAttribute('href', href);
}

/**
 * Inject or replace a JSON-LD structured data script
 */
export function injectJsonLd(schemaObject, scriptId = "schema-dynamic") {
    if (!schemaObject) return;
    let script = document.getElementById(scriptId);
    if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schemaObject, null, 2);
}

// ─────────────────────────────────────────────
// SCHEMA GENERATORS (Schema.org)
// ─────────────────────────────────────────────

/**
 * Organization Schema
 */
export function generateOrganizationSchema() {
    return {
        "@context": "https://schema.org",
        "@type": "OnlineStore",
        "@id": `${SITE_SEO.domain}/#organization`,
        "name": SITE_SEO.brand,
        "url": SITE_SEO.domain,
        "logo": {
            "@type": "ImageObject",
            "url": `${SITE_SEO.domain}/assets/logo/xoroniq-logo.svg`,
            "caption": "XORONIQ Logo"
        },
        "description": SITE_SEO.defaultDescription,
        "email": "support@xoroniq.com",
        "telephone": "+91-1800-123-4567",
        "address": {
            "@type": "PostalAddress",
            "addressCountry": "IN"
        },
        "priceRange": "₹₹",
        "sameAs": [
            "https://instagram.com/xoroniq",
            "https://facebook.com/xoroniq"
        ]
    };
}

/**
 * WebSite Schema with Sitelinks SearchBox
 */
export function generateWebSiteSchema() {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${SITE_SEO.domain}/#website`,
        "url": SITE_SEO.domain,
        "name": SITE_SEO.brand,
        "description": SITE_SEO.defaultDescription,
        "publisher": {
            "@id": `${SITE_SEO.domain}/#organization`
        },
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": `${SITE_SEO.domain}/shop.html?search={search_term_string}`
            },
            "query-input": "required name=search_term_string"
        }
    };
}

/**
 * Product Schema with Offer, Brand, and Availability
 */
export function generateProductSchema(product, canonicalUrl) {
    if (!product) return null;
    const url = canonicalUrl || `${SITE_SEO.domain}/products/${product.slug || product.id}`;
    const images = (product.images && product.images.length > 0)
        ? product.images
        : [product.primaryImage || SITE_SEO.defaultImage];
    const inStock = (product.stock === undefined || product.stock > 0);

    const schema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "@id": `${url}/#product`,
        "name": product.name,
        "image": images,
        "description": product.shortDescription || product.description || `${product.name} available at XORONIQ.`,
        "sku": product.sku || `XOR-${(product.id || '001').toUpperCase()}`,
        "mpn": product.sku || product.id,
        "brand": {
            "@type": "Brand",
            "name": SITE_SEO.brand
        },
        "offers": {
            "@type": "Offer",
            "url": url,
            "priceCurrency": "INR",
            "price": product.sellingPrice || product.price || 0,
            "priceValidUntil": new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            "itemCondition": "https://schema.org/NewCondition",
            "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "seller": {
                "@type": "Organization",
                "name": SITE_SEO.brand
            },
            "hasMerchantReturnPolicy": {
                "@type": "MerchantReturnPolicy",
                "applicableCountry": "IN",
                "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                "merchantReturnDays": 7,
                "returnMethod": "https://schema.org/ReturnByMail",
                "returnFees": "https://schema.org/FreeReturn"
            },
            "shippingDetails": {
                "@type": "OfferShippingDetails",
                "shippingRate": {
                    "@type": "MonetaryAmount",
                    "value": (product.sellingPrice >= 999 ? 0 : 20),
                    "currency": "INR"
                },
                "shippingDestination": {
                    "@type": "DefinedRegion",
                    "addressCountry": "IN"
                },
                "deliveryTime": {
                    "@type": "ShippingDeliveryTime",
                    "handlingTime": {
                        "@type": "QuantitativeValue",
                        "minValue": 1,
                        "maxValue": 2,
                        "unitCode": "d"
                    },
                    "transitTime": {
                        "@type": "QuantitativeValue",
                        "minValue": 2,
                        "maxValue": 5,
                        "unitCode": "d"
                    }
                }
            }
        }
    };

    if (product.rating && product.rating > 0 && product.reviewCount && product.reviewCount > 0) {
        schema.aggregateRating = {
            "@type": "AggregateRating",
            "ratingValue": Number(product.rating).toFixed(1),
            "reviewCount": product.reviewCount,
            "bestRating": "5",
            "worstRating": "1"
        };
    }

    return schema;
}

/**
 * BreadcrumbList Schema
 */
export function generateBreadcrumbsSchema(items = []) {
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.url ? formatCanonical(item.url) : undefined
        }))
    };
}

/**
 * CollectionPage Schema for Category / Shop
 */
export function generateCollectionSchema(title, description, products = [], canonicalUrl = "/shop.html") {
    return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": title || "All Products Catalog — XORONIQ",
        "description": description || SITE_SEO.defaultDescription,
        "url": formatCanonical(canonicalUrl),
        "mainEntity": {
            "@type": "ItemList",
            "itemListElement": products.slice(0, 24).map((p, idx) => ({
                "@type": "ListItem",
                "position": idx + 1,
                "name": p.name,
                "url": formatCanonical(`/products/${p.slug || p.id}`)
            }))
        }
    };
}

/**
 * FAQPage Schema
 */
export function generateFAQSchema(faqList = []) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqList.map(item => ({
            "@type": "Question",
            "name": item.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer
            }
        }))
    };
}
