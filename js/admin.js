// js/admin.js — Admin Panel Bootstrap & Navigation for XORONIQ

import { requireAdmin, logout } from './auth.js';
import { showToast as baseShowToast, formatPrice as baseFormatPrice, formatDate as baseFormatDate } from './app.js';

export const showToast = baseShowToast;
export const formatPrice = baseFormatPrice;
export const formatDate = baseFormatDate;

export async function initAdmin() {
    try {
        const user = await requireAdmin();
        if (user) {
            renderAdminUserInfo(user);
        }
        initSidebarEvents();
        return user;
    } catch(e) {
        return null;
    }
}

function renderAdminUserInfo(user) {
    const avatarEls = document.querySelectorAll('.admin-header-avatar');
    const initial = (user.displayName || user.email || 'A')[0].toUpperCase();
    avatarEls.forEach(el => el.textContent = initial);
}

function initSidebarEvents() {
    const toggle = document.getElementById('admin-mobile-toggle') || document.querySelector('.admin-mobile-toggle');
    const sidebar = document.querySelector('.admin-sidebar');
    const overlay = document.getElementById('admin-overlay');

    if (toggle && sidebar) {
        toggle.onclick = () => {
            sidebar.classList.toggle('drawer-open');
            if (overlay) overlay.classList.toggle('visible');
        };

        if (overlay) {
            overlay.onclick = () => {
                sidebar.classList.remove('drawer-open');
                overlay.classList.remove('visible');
            };
        }
    }

    // Active link highlight
    const path = window.location.pathname;
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href && (path === href || path.endsWith(href))) {
            link.classList.add('active');
        }
    });

    // Logout
    document.querySelectorAll('.sidebar-logout, #admin-logout-btn').forEach(btn => {
        btn.onclick = async () => {
            await logout();
            window.location.href = '/admin/login.html';
        };
    });
}

// ── Shared Admin Sidebar HTML ──
export function getAdminSidebarHTML(activePage = '') {
    const links = [
        { href: '/admin/index.html', label: 'Dashboard', icon: '<rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect>' },
        { href: null, label: 'STORE MANAGEMENT', section: true },
        { href: '/admin/products.html', label: 'Products', icon: '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"></path>' },
        { href: '/admin/categories.html', label: 'Categories', icon: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"></path>' },
        { href: '/admin/orders.html', label: 'Orders', icon: '<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"></path>' },
        { href: '/admin/customers.html', label: 'Customers', icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path><circle cx="9" cy="7" r="4"></circle>' },
        { href: '/admin/reviews.html', label: 'Reviews', icon: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>' },
        { href: null, label: 'MARKETING & GROWTH', section: true },
        { href: '/admin/banners.html', label: 'Banners', icon: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>' },
        { href: '/admin/coupons.html', label: 'Coupons', icon: '<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"></path>' },
        { href: '/admin/meta-ads.html', label: 'Meta Pixel & Ads', icon: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>' },
        { href: null, label: 'SETTINGS & TOOLS', section: true },
        { href: '/admin/analytics.html', label: 'Analytics', icon: '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="20"></line>' },
        { href: '/admin/settings.html', label: 'Store Settings', icon: '<circle cx="12" cy="12" r="3"></circle>' },
        { href: '/admin/seed.html', label: 'Demo Data Seeder', icon: '<polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polyline>' }
    ];

    const linksHTML = links.map(l => {
        if (l.section) return `<div class="sidebar-section-label">${l.label}</div>`;
        const isActive = window.location.pathname.endsWith(l.href.split('/').pop());
        return `
        <a href="${l.href}" class="sidebar-link ${isActive ? 'active' : ''}">
            <svg class="sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${l.icon}</svg>
            ${l.label}
        </a>`;
    }).join('');

    return `
    <aside class="admin-sidebar">
        <div class="sidebar-logo">
            <span class="sidebar-logo-text">XORONIQ</span>
            <span class="sidebar-logo-sub">Admin Control Center</span>
        </div>
        <nav class="sidebar-nav">${linksHTML}</nav>
        <div class="sidebar-footer">
            <a href="/" class="sidebar-link" target="_blank">
                <svg class="sidebar-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                View Live Store
            </a>
            <button class="sidebar-logout" id="admin-logout-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Sign Out
            </button>
        </div>
    </aside>
    <div id="admin-overlay" class="admin-overlay"></div>`;
}

export function getStatusBadgeClass(status) {
    const map = {
        'Pending': 'badge-warning',
        'Confirmed': 'badge-primary',
        'Processing': 'badge-primary',
        'Shipped': 'badge-primary',
        'Out for Delivery': 'badge-warning',
        'Delivered': 'badge-success',
        'Cancelled': 'badge-error',
        'Refunded': 'badge-error'
    };
    return map[status] || 'badge-primary';
}
