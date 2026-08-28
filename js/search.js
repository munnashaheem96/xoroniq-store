// js/search.js — Search with debouncing and suggestions for XORONIQ

import { searchProducts } from "./db.js";
import { APP_CONFIG } from "./config.js";
import { renderProductCard, showSkeletons } from "./app.js";
import { trackSearch as gaTrackSearch } from "./analytics.js";
import { trackSearch as metaTrackSearch } from "./meta.js";

let _debounceTimer = null;
let _lastQuery = "";

// ─────────────────────────────────────────────
// SEARCH INPUT INIT
// ─────────────────────────────────────────────

export function initSearch(options = {}) {
    const {
        inputId = "search-input",
        suggestionsId = "search-suggestions",
        resultsId = "search-results",
        onResults = null,
    } = options;

    const input = document.getElementById(inputId);
    const suggestions = document.getElementById(suggestionsId);

    if (!input) return;

    input.addEventListener("input", () => {
        const q = input.value.trim();
        clearTimeout(_debounceTimer);

        if (!q || q.length < 2) {
            if (suggestions) suggestions.innerHTML = "";
            if (suggestions) suggestions.classList.remove("suggestions-visible");
            return;
        }

        _debounceTimer = setTimeout(() => {
            performSearch(q, suggestions, resultsId, onResults);
        }, APP_CONFIG.searchDebounce);
    });

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            clearTimeout(_debounceTimer);
            const q = input.value.trim();
            if (q) {
                window.location.href = `/shop.html?q=${encodeURIComponent(q)}`;
            }
        }
    });

    // Close suggestions on outside click
    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && suggestions && !suggestions.contains(e.target)) {
            suggestions.classList.remove("suggestions-visible");
        }
    });

    // Check for query in URL
    const urlQ = new URLSearchParams(window.location.search).get("q");
    if (urlQ && input) {
        input.value = urlQ;
        performSearch(urlQ, suggestions, resultsId, onResults);
    }
}

async function performSearch(q, suggestionsEl, resultsId, onResults) {
    if (q === _lastQuery) return;
    _lastQuery = q;

    // Track search
    gaTrackSearch(q);
    metaTrackSearch(q);

    try {
        const results = await searchProducts(q, APP_CONFIG.productsPerPage);

        // Inline suggestions
        if (suggestionsEl) {
            renderSuggestions(suggestionsEl, results, q);
        }

        // Full results if on shop page
        if (resultsId) {
            const container = document.getElementById(resultsId);
            if (container) renderSearchResults(container, results, q);
        }

        if (onResults) onResults(results, q);
    } catch (e) {
        console.error("[Search] Error:", e);
    }
}

function renderSuggestions(container, results, q) {
    if (!results || results.length === 0) {
        container.innerHTML = `<div class="suggestion-item suggestion-empty">No results for "<strong>${escapeHtml(q)}</strong>"</div>`;
    } else {
        const items = results.slice(0, 5).map(p => `
        <a class="suggestion-item" href="/products/${p.slug || p.id}">
            <img src="${p.primaryImage || APP_CONFIG.placeholderImage}" alt="${p.name}" class="suggestion-img" loading="lazy" width="40" height="40">
            <div class="suggestion-info">
                <span class="suggestion-name">${highlightQuery(p.name, q)}</span>
                <span class="suggestion-price">₹${p.sellingPrice?.toLocaleString("en-IN")}</span>
            </div>
        </a>`).join("");

        container.innerHTML = items + (results.length > 5
            ? `<a class="suggestion-more" href="/shop.html?q=${encodeURIComponent(q)}">View all ${results.length} results →</a>`
            : "");
    }
    container.classList.add("suggestions-visible");
}

function renderSearchResults(container, results, q) {
    if (!results || results.length === 0) {
        container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h3>No results found</h3>
            <p>We couldn't find anything for "<strong>${escapeHtml(q)}</strong>".<br>Try different keywords or browse our categories.</p>
            <a href="/shop.html" class="btn btn-primary">Browse All Products</a>
        </div>`;
        return;
    }
    container.innerHTML = results.map(p => renderProductCard(p)).join("");
}

function highlightQuery(text, q) {
    if (!q) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${escapeRegex(q)})`, "gi");
    return escaped.replace(regex, "<mark>$1</mark>");
}

function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
