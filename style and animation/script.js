/* ================================================
   script.js — Final version with all fixes
   ================================================ */

// ==========================
// SUPABASE CONFIGURATION
// ==========================
const SUPABASE_URL = "https://oitfuaxbowiyvkvxssbp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pdGZ1YXhib3dpeXZrdnhzc2JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTE5NjIsImV4cCI6MjA5OTg4Nzk2Mn0.Gax9njwL7eFaG-C2uAKDYR2rSocVfs_dOJezF1rBK6s";

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================================
// GLOBAL STATE
// =============================================
let currentUser = null;
let cart = [];
let wishlist = [];
let products = [];
let orders = [];
let currentModalProduct = null;

// =============================================
// DOM READY
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    loadLocalData();
    initApp();
    hideLoader();
    initTheme();
    // Remove Profile & Wishlist from dropdown
    removeItemsFromDropdown();
    // Setup wishlist icon click
    setupWishlistToggle();
    // Setup profile buttons
    setupProfileButtons();
    // Setup orders dropdown
    setupOrdersDropdown();
});

function loadLocalData() {
    const savedCart = localStorage.getItem('sk_cart');
    if (savedCart) cart = JSON.parse(savedCart);
    const savedWishlist = localStorage.getItem('sk_wishlist');
    if (savedWishlist) wishlist = JSON.parse(savedWishlist);
    const savedUser = localStorage.getItem('sk_user');
    if (savedUser) currentUser = JSON.parse(savedUser);
    const savedOrders = localStorage.getItem('sk_orders');
    if (savedOrders) orders = JSON.parse(savedOrders);
}

function saveLocalData() {
    localStorage.setItem('sk_cart', JSON.stringify(cart));
    localStorage.setItem('sk_wishlist', JSON.stringify(wishlist));
    if (currentUser) localStorage.setItem('sk_user', JSON.stringify(currentUser));
    else localStorage.removeItem('sk_user');
    localStorage.setItem('sk_orders', JSON.stringify(orders));
}

// =============================================
// REMOVE PROFILE & WISHLIST FROM DROPDOWN
// =============================================
function removeItemsFromDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        const links = dropdown.querySelectorAll('a');
        links.forEach(link => {
            const action = link.dataset.action;
            if (action === 'profile' || action === 'wishlist') {
                link.remove();
            }
        });
    }
    // Also from mobile menu
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            const action = link.dataset.action;
            if (action === 'profile-mobile' || action === 'wishlist-mobile') {
                link.remove();
            }
        });
    }
}

// =============================================
// SETUP ORDERS DROPDOWN
// =============================================
function setupOrdersDropdown() {
    document.querySelectorAll('[data-action="orders"], [data-action="orders-mobile"]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser) {
                openOrdersModal();
            } else {
                alert('Please login first to view your orders.');
            }
        });
    });
}

// =============================================
// SETUP PROFILE BUTTONS
// =============================================
function setupProfileButtons() {
    // Change Name (was Edit Profile)
    const changeNameBtn = document.querySelector('.profile-actions .btn-outline:first-child');
    if (changeNameBtn) {
        changeNameBtn.textContent = 'Change Name';
        changeNameBtn.addEventListener('click', () => {
            if (currentUser) {
                const newName = prompt('Enter your full name:', currentUser.name);
                if (newName && newName.trim()) {
                    currentUser.name = newName.trim();
                    saveLocalData();
                    updateAuthUI();
                    document.getElementById('profileName').textContent = currentUser.name;
                    alert('Name updated successfully!');
                }
            } else {
                alert('Please login first.');
            }
        });
    }

    // Order History
    const orderBtn = document.querySelector('.profile-actions .btn-outline:nth-child(2)');
    if (orderBtn) {
        orderBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser) {
                openOrdersModal();
            } else {
                alert('Please login first.');
            }
        });
    }

    // Saved Addresses
    const addressBtn = document.querySelector('.profile-actions .btn-outline:nth-child(3)');
    if (addressBtn) {
        addressBtn.addEventListener('click', () => {
            if (currentUser) {
                const address = prompt('Enter your saved address (Street, City, Postal):', currentUser.address || '');
                if (address !== null) {
                    currentUser.address = address.trim();
                    saveLocalData();
                    updateAuthUI();
                    document.getElementById('profileAddress').textContent = currentUser.address || 'No address saved';
                    alert('Address saved successfully!');
                }
            } else {
                alert('Please login first.');
            }
        });
    }

    // Remove Wishlist button from profile actions (4th button)
    const wishlistBtn = document.querySelector('.profile-actions .btn-outline:nth-child(4)');
    if (wishlistBtn) wishlistBtn.remove();
}

// =============================================
// ORDERS MODAL
// =============================================
function openOrdersModal() {
    let modal = document.getElementById('ordersModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ordersModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal orders-modal glass">
                <button class="modal-close" id="ordersModalClose">&times;</button>
                <h2 style="margin-bottom:16px;">Your Orders</h2>
                <div id="ordersList" class="orders-list">
                    <p style="color:var(--text-muted);text-align:center;padding:20px;">No orders found.</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('ordersModalClose').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }

    const container = document.getElementById('ordersList');
    const userOrders = orders.filter(o => o.email === currentUser?.email || o.customer === currentUser?.name);
    
    if (userOrders.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:20px;">No orders found.</p>`;
    } else {
        container.innerHTML = userOrders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <span class="order-id">#${order.id}</span>
                    <span class="order-status">${order.status || 'Pending'}</span>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `${item.name} × ${item.qty}`).join(', ')}
                </div>
                <div class="order-footer">
                    <span>Total: $${order.total.toFixed(2)}</span>
                    <span class="order-payment">Payment: ${order.payment || 'COD'}</span>
                </div>
                <div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">
                    Date: ${order.date || new Date().toLocaleDateString()}
                </div>
            </div>
        `).join('');
    }

    modal.classList.add('active');
}

// =============================================
// THEME TOGGLE
// =============================================
function initTheme() {
    const savedTheme = localStorage.getItem('sk_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('sk_theme', next);
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
});

// =============================================
// PAGE LOADER
// =============================================
function hideLoader() {
    const loader = document.getElementById('pageLoader');
    if (loader) loader.classList.add('hidden');
}

// =============================================
// NAVIGATION & MOBILE MENU
// =============================================
const mobileToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');
if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
        mobileMenu.classList.toggle('open');
    });
}

// =============================================
// SEARCH
// =============================================
document.getElementById('searchToggle').addEventListener('click', () => {
    const query = prompt('Search for a product (e.g., "T-Shirt", "Coat"):');
    if (!query) return;
    const lower = query.toLowerCase();
    const matches = products.filter(p => p.name.toLowerCase().includes(lower) || p.category.includes(lower));
    if (matches.length === 0) {
        alert('No products found. Try a different keyword.');
        return;
    }
    const firstMatch = matches[0];
    const categoryMap = {
        tshirts: 'category-tshirts',
        shirts: 'category-shirts',
        skirts: 'category-skirts',
        coats: 'category-coats'
    };
    const sectionId = categoryMap[firstMatch.category];
    if (sectionId) {
        document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
        const cards = document.querySelectorAll(`#${sectionId} .product-card`);
        cards.forEach(card => {
            const id = parseInt(card.dataset.id);
            if (id === firstMatch.id) {
                card.style.border = '2px solid var(--accent)';
                setTimeout(() => card.style.border = '', 2000);
            }
        });
    }
});

// =============================================
// SAMPLE DATA
// =============================================
const imageSeed = (id) => `https://picsum.photos/seed/${id}/300/300`;

const sampleCategories = [
    { id: 1, name: "Women's T-Shirts", image: "https://picsum.photos/seed/cat1/300/200", desc: "Essential tees" },
    { id: 2, name: "Women's Shirts", image: "https://picsum.photos/seed/cat2/300/200", desc: "Sophisticated styles" },
    { id: 3, name: "Women's Skirts", image: "https://picsum.photos/seed/cat3/300/200", desc: "Elegant silhouettes" },
    { id: 4, name: "Women's Coats", image: "https://picsum.photos/seed/cat4/300/200", desc: "Timeless outerwear" }
];

const sampleProducts = [
    { id: 101, name: "Classic White Tee", category: "tshirts", price: 49.99, oldPrice: 69.99, discount: 30, rating: 4.5, image: imageSeed(101), description: "Soft cotton blend, perfect for layering." },
    { id: 102, name: "Striped Breton Tee", category: "tshirts", price: 59.99, oldPrice: 79.99, discount: 25, rating: 4.8, image: imageSeed(102), description: "Classic striped design, nautical charm." },
    { id: 103, name: "Silk Blend Crew", category: "tshirts", price: 89.99, oldPrice: null, discount: 0, rating: 4.9, image: imageSeed(103), description: "Luxurious silk-cotton blend." },
    { id: 201, name: "Linen Button-Up", category: "shirts", price: 79.99, oldPrice: 99.99, discount: 20, rating: 4.6, image: imageSeed(201), description: "Breathable linen, relaxed fit." },
    { id: 202, name: "Satin Blouse", category: "shirts", price: 69.99, oldPrice: 89.99, discount: 22, rating: 4.7, image: imageSeed(202), description: "Elegant satin with a subtle sheen." },
    { id: 203, name: "Oversized Oxford", category: "shirts", price: 99.99, oldPrice: null, discount: 0, rating: 4.4, image: imageSeed(203), description: "Classic oxford, modern oversized silhouette." },
    { id: 301, name: "Pleated Midi Skirt", category: "skirts", price: 89.99, oldPrice: 119.99, discount: 25, rating: 4.8, image: imageSeed(301), description: "Flattering pleats, midi length." },
    { id: 302, name: "Leather Mini Skirt", category: "skirts", price: 129.99, oldPrice: 159.99, discount: 18, rating: 4.5, image: imageSeed(302), description: "Genuine leather, edgy and chic." },
    { id: 303, name: "Tulle Maxi Skirt", category: "skirts", price: 149.99, oldPrice: null, discount: 0, rating: 4.9, image: imageSeed(303), description: "Dreamy tulle, floor-length." },
    { id: 401, name: "Wool Cashmere Coat", category: "coats", price: 299.99, oldPrice: 399.99, discount: 25, rating: 4.9, image: imageSeed(401), description: "Luxurious wool-cashmere blend." },
    { id: 402, name: "Trench Coat", category: "coats", price: 199.99, oldPrice: 249.99, discount: 20, rating: 4.7, image: imageSeed(402), description: "Classic trench with modern tailoring." },
    { id: 403, name: "Puffer Jacket", category: "coats", price: 179.99, oldPrice: null, discount: 0, rating: 4.3, image: imageSeed(403), description: "Lightweight puffer, perfect for layering." }
];

// =============================================
// FETCH FROM SUPABASE
// =============================================
async function fetchProductsFromSupabase() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select(`*, categories ( slug )`);
        if (error) throw error;
        if (data && data.length > 0) {
            return data.map(p => {
                let catSlug = p.categories?.slug || '';
                const slugMap = {
                    'womens-tshirts': 'tshirts',
                    'womens-shirts': 'shirts',
                    'womens-skirts': 'skirts',
                    'womens-coats': 'coats'
                };
                const mapped = slugMap[catSlug] || catSlug;
                const idMap = { 1: 'tshirts', 2: 'shirts', 3: 'skirts', 4: 'coats' };
                const finalCategory = mapped || idMap[p.category_id] || 'tshirts';
                return {
                    id: p.id,
                    name: p.name,
                    category: finalCategory,
                    price: p.price,
                    oldPrice: p.old_price || null,
                    discount: p.discount_percent || 0,
                    rating: p.rating || 4.0,
                    image: p.images && p.images[0] ? p.images[0] : `https://picsum.photos/seed/${p.id}/300/300`,
                    description: p.description || ''
                };
            });
        }
    } catch (e) {
        console.warn('Supabase fetch failed, using sample data.', e);
    }
    return null;
}

async function fetchCategoriesFromSupabase() {
    try {
        const { data, error } = await supabase.from('categories').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
            return data.map(c => ({
                id: c.id,
                name: c.name,
                image: c.image_url || `https://picsum.photos/seed/cat${c.id}/300/200`,
                desc: c.description || ''
            }));
        }
    } catch (e) {
        console.warn('Supabase categories fetch failed, using sample.', e);
    }
    return null;
}

// =============================================
// RENDER
// =============================================
function renderCategories(categoriesData) {
    const grid = document.getElementById('categoriesGrid');
    if (!grid) return;
    const cats = categoriesData || sampleCategories;
    grid.innerHTML = cats.map(cat => `
        <div class="category-card">
            <img src="${cat.image}" alt="${cat.name}" />
            <h3>${cat.name}</h3>
            <p>${cat.desc}</p>
            <a href="#category-${cat.id === 1 ? 'tshirts' : cat.id === 2 ? 'shirts' : cat.id === 3 ? 'skirts' : 'coats'}" class="btn-outline">View Collection</a>
        </div>
    `).join('');
}

function renderProducts(productsData) {
    const data = productsData || sampleProducts;
    products = data;
    const containers = {
        tshirts: document.getElementById('productsTshirts'),
        shirts: document.getElementById('productsShirts'),
        skirts: document.getElementById('productsSkirts'),
        coats: document.getElementById('productsCoats')
    };
    Object.keys(containers).forEach(key => {
        const container = containers[key];
        if (!container) return;
        const filtered = data.filter(p => p.category === key);
        container.innerHTML = filtered.map(p => buildProductCard(p)).join('');
    });
    attachProductEvents();
}

function buildProductCard(product) {
    const oldPriceHtml = product.oldPrice ? `<span class="old">$${product.oldPrice.toFixed(2)}</span>` : '';
    const discountHtml = product.discount > 0 ? `<span class="discount">-${product.discount}%</span>` : '';
    const stars = '★'.repeat(Math.floor(product.rating)) + '☆'.repeat(5 - Math.floor(product.rating));
    return `
        <div class="product-card" data-id="${product.id}">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name}" />
                ${product.discount > 0 ? `<span class="product-badge">Sale</span>` : ''}
                <div class="product-actions">
                    <button class="fav-btn" data-id="${product.id}"><i class="fas fa-heart"></i></button>
                    <button class="quickview-btn" data-id="${product.id}"><i class="fas fa-eye"></i></button>
                </div>
            </div>
            <div class="product-info">
                <h4>${product.name}</h4>
                <div class="product-rating">${stars}</div>
                <div class="product-price">
                    <span class="current">$${product.price.toFixed(2)}</span>
                    ${oldPriceHtml} ${discountHtml}
                </div>
                <div class="product-buttons">
                    <button class="btn-add" data-id="${product.id}">Add to Cart</button>
                    <button class="btn-buy" data-id="${product.id}">Buy Now</button>
                </div>
            </div>
        </div>
    `;
}

function attachProductEvents() {
    document.querySelectorAll('.quickview-btn').forEach(btn => {
        btn.removeEventListener('click', handleQuickView);
        btn.addEventListener('click', handleQuickView);
    });
    document.querySelectorAll('.btn-add').forEach(btn => {
        btn.removeEventListener('click', handleAddToCart);
        btn.addEventListener('click', handleAddToCart);
    });
    document.querySelectorAll('.btn-buy').forEach(btn => {
        btn.removeEventListener('click', handleBuyNow);
        btn.addEventListener('click', handleBuyNow);
    });
    document.querySelectorAll('.fav-btn').forEach(btn => {
        btn.removeEventListener('click', handleFavorite);
        btn.addEventListener('click', handleFavorite);
    });
}

function handleQuickView(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    const product = products.find(p => p.id === id);
    if (product) openProductModal(product);
}

function handleAddToCart(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    const product = products.find(p => p.id === id);
    if (product) addToCart(product);
}

function handleBuyNow(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    const product = products.find(p => p.id === id);
    if (product) {
        addToCart(product);
        openCheckout();
    }
}

function handleFavorite(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    const product = products.find(p => p.id === id);
    if (!product) return;
    const idx = wishlist.findIndex(item => item.id === id);
    if (idx > -1) {
        wishlist.splice(idx, 1);
        e.currentTarget.style.color = '';
    } else {
        wishlist.push(product);
        e.currentTarget.style.color = '#e74c3c';
    }
    saveLocalData();
    updateWishlistBadge();
}

// =============================================
// PRODUCT MODAL
// =============================================
function openProductModal(product) {
    currentModalProduct = product;
    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalPrice').textContent = `$${product.price.toFixed(2)}`;
    document.getElementById('modalOldPrice').textContent = product.oldPrice ? `$${product.oldPrice.toFixed(2)}` : '';
    document.getElementById('modalDiscount').textContent = product.discount > 0 ? `-${product.discount}%` : '';
    document.getElementById('modalRating').textContent = '★'.repeat(Math.floor(product.rating)) + '☆'.repeat(5 - Math.floor(product.rating));
    document.getElementById('modalDescription').textContent = product.description;
    document.getElementById('modalMainImage').querySelector('img').src = product.image;
    const thumbContainer = document.getElementById('modalThumbnails');
    thumbContainer.innerHTML = `<img src="${product.image}" alt="thumb" /><img src="${product.image}" alt="thumb" /><img src="${product.image}" alt="thumb" />`;
    document.getElementById('productModal').classList.add('active');
    document.getElementById('qtyInput').value = 1;
}

document.getElementById('productModalClose').addEventListener('click', () => {
    document.getElementById('productModal').classList.remove('active');
});
document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('productModal').classList.remove('active');
});

document.getElementById('qtyMinus').addEventListener('click', () => {
    const inp = document.getElementById('qtyInput');
    let val = parseInt(inp.value) || 1;
    if (val > 1) inp.value = val - 1;
});
document.getElementById('qtyPlus').addEventListener('click', () => {
    const inp = document.getElementById('qtyInput');
    let val = parseInt(inp.value) || 1;
    if (val < 10) inp.value = val + 1;
});

document.getElementById('modalAddToCart').addEventListener('click', () => {
    if (currentModalProduct) {
        const qty = parseInt(document.getElementById('qtyInput').value) || 1;
        for (let i = 0; i < qty; i++) addToCart(currentModalProduct);
        document.getElementById('productModal').classList.remove('active');
    }
});

document.getElementById('modalBuyNow').addEventListener('click', () => {
    if (currentModalProduct) {
        const qty = parseInt(document.getElementById('qtyInput').value) || 1;
        for (let i = 0; i < qty; i++) addToCart(currentModalProduct);
        document.getElementById('productModal').classList.remove('active');
        openCheckout();
    }
});

// =============================================
// CART
// =============================================
function addToCart(product) {
    const existing = cart.find(item => item.id === product.id);
    if (existing) existing.qty += 1;
    else cart.push({ ...product, qty: 1 });
    saveLocalData();
    updateCartUI();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveLocalData();
    updateCartUI();
}

function updateCartUI() {
    const badge = document.getElementById('cartBadge');
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    if (badge) badge.textContent = totalItems;
    renderCartItems();
    updateCartTotals();
    updateCheckoutSummary();
}

function renderCartItems() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    if (cart.length === 0) {
        container.innerHTML = `<div class="cart-empty"><i class="fas fa-shopping-bag"></i><p>Your cart is empty.</p><a href="#categories" class="btn-outline">Start Shopping</a></div>`;
        document.getElementById('cartFooter').style.display = 'none';
        return;
    }
    document.getElementById('cartFooter').style.display = 'block';
    container.innerHTML = cart.map(item => `
        <div class="cart-item" data-id="${item.id}">
            <img src="${item.image}" alt="${item.name}" />
            <div class="cart-item-details">
                <h4>${item.name}</h4>
                <div class="item-price">$${item.price.toFixed(2)}</div>
                <div class="item-qty">
                    <button class="cart-qty-minus" data-id="${item.id}">-</button>
                    <span>${item.qty}</span>
                    <button class="cart-qty-plus" data-id="${item.id}">+</button>
                </div>
            </div>
            <span class="cart-item-remove" data-id="${item.id}"><i class="fas fa-trash-alt"></i></span>
        </div>
    `).join('');
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            removeFromCart(id);
        });
    });
    document.querySelectorAll('.cart-qty-minus').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const item = cart.find(i => i.id === id);
            if (item && item.qty > 1) { item.qty--; saveLocalData(); updateCartUI(); }
            else if (item) { removeFromCart(id); }
        });
    });
    document.querySelectorAll('.cart-qty-plus').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const item = cart.find(i => i.id === id);
            if (item) { item.qty++; saveLocalData(); updateCartUI(); }
        });
    });
}

function updateCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shipping = subtotal > 0 ? (subtotal > 100 ? 0 : 9.99) : 0;
    const total = subtotal + shipping;
    document.getElementById('cartSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('cartShipping').textContent = `$${shipping.toFixed(2)}`;
    document.getElementById('cartTotal').textContent = `$${total.toFixed(2)}`;
}

// =============================================
// CART SLIDEOUT
// =============================================
document.getElementById('cartToggle').addEventListener('click', toggleCart);
document.getElementById('cartClose').addEventListener('click', toggleCart);
document.getElementById('cartOverlay').addEventListener('click', toggleCart);

function toggleCart() {
    document.getElementById('cartSlideout').classList.toggle('open');
    document.getElementById('cartOverlay').classList.toggle('active');
}

// =============================================
// WISHLIST TOGGLE (Heart icon)
// =============================================
function setupWishlistToggle() {
    document.querySelector('.wishlist-toggle')?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleWishlist();
    });
}

function toggleWishlist() {
    let slideout = document.getElementById('wishlistSlideout');
    if (!slideout) {
        slideout = document.createElement('div');
        slideout.id = 'wishlistSlideout';
        slideout.className = 'wishlist-slideout';
        slideout.innerHTML = `
            <div class="wishlist-header">
                <h3><i class="fas fa-heart"></i> Your Wishlist</h3>
                <button class="wishlist-close" id="wishlistClose">&times;</button>
            </div>
            <div class="wishlist-items" id="wishlistItems">
                <div class="wishlist-empty"><i class="fas fa-heart"></i><p>Your wishlist is empty.</p></div>
            </div>
        `;
        document.body.appendChild(slideout);

        document.getElementById('wishlistClose').addEventListener('click', () => {
            slideout.classList.remove('open');
            const overlay = document.getElementById('wishlistOverlay');
            if (overlay) overlay.classList.remove('active');
        });
        const overlay = document.createElement('div');
        overlay.id = 'wishlistOverlay';
        overlay.className = 'cart-overlay';
        overlay.style.zIndex = '1649';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => {
            slideout.classList.remove('open');
            overlay.classList.remove('active');
        });
        window.wishlistOverlay = overlay;
    }

    slideout.classList.toggle('open');
    const overlay = document.getElementById('wishlistOverlay');
    if (overlay) overlay.classList.toggle('active');
    renderWishlistItems();
}

function renderWishlistItems() {
    const container = document.getElementById('wishlistItems');
    if (!container) return;
    if (wishlist.length === 0) {
        container.innerHTML = `<div class="wishlist-empty"><i class="fas fa-heart"></i><p>Your wishlist is empty.</p></div>`;
        return;
    }
    container.innerHTML = wishlist.map(item => `
        <div class="wishlist-item" data-id="${item.id}">
            <img src="${item.image}" alt="${item.name}" />
            <div class="wishlist-item-details">
                <h4>${item.name}</h4>
                <div class="item-price">$${item.price.toFixed(2)}</div>
            </div>
            <button class="btn-add" data-id="${item.id}">Add to Cart</button>
            <span class="wishlist-item-remove" data-id="${item.id}"><i class="fas fa-trash-alt"></i></span>
        </div>
    `).join('');

    container.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const product = wishlist.find(p => p.id === id);
            if (product) {
                addToCart(product);
                const idx = wishlist.findIndex(p => p.id === id);
                if (idx > -1) {
                    wishlist.splice(idx, 1);
                    saveLocalData();
                    updateWishlistBadge();
                    renderWishlistItems();
                }
            }
        });
    });
    container.querySelectorAll('.wishlist-item-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const idx = wishlist.findIndex(p => p.id === id);
            if (idx > -1) {
                wishlist.splice(idx, 1);
                saveLocalData();
                updateWishlistBadge();
                renderWishlistItems();
                document.querySelectorAll('.fav-btn').forEach(fav => {
                    if (parseInt(fav.dataset.id) === id) fav.style.color = '';
                });
            }
        });
    });
}

// =============================================
// CHECKOUT
// =============================================
function openCheckout() {
    document.getElementById('checkoutSection').style.display = 'block';
    document.getElementById('checkoutSection').scrollIntoView({ behavior: 'smooth' });
    toggleCart();
    updateCheckoutSummary();
}

function updateCheckoutSummary() {
    const container = document.getElementById('checkoutItems');
    if (!container) return;
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const shipping = subtotal > 0 ? (subtotal > 100 ? 0 : 9.99) : 0;
    const total = subtotal + shipping;
    container.innerHTML = cart.map(item => `
        <div class="checkout-item">
            <span>${item.name} × ${item.qty}</span>
            <span>$${(item.price * item.qty).toFixed(2)}</span>
        </div>
    `).join('');
    document.getElementById('checkoutSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('checkoutShipping').textContent = `$${shipping.toFixed(2)}`;
    document.getElementById('checkoutTotal').textContent = `$${total.toFixed(2)}`;
}

document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
document.getElementById('backToCartBtn').addEventListener('click', () => {
    document.getElementById('checkoutSection').style.display = 'none';
});

document.getElementById('confirmOrderBtn').addEventListener('click', async () => {
    const name = document.getElementById('checkoutName').value.trim();
    const phone = document.getElementById('checkoutPhone').value.trim();
    const email = document.getElementById('checkoutEmail').value.trim();
    const address = document.getElementById('checkoutAddress').value.trim();
    const city = document.getElementById('checkoutCity').value.trim();
    const postal = document.getElementById('checkoutPostal').value.trim();
    if (!name || !phone || !email || !address || !city || !postal) {
        alert('Please fill in all required fields.');
        return;
    }
    const payment = document.querySelector('input[name="payment"]:checked').value;
    const order = {
        id: Date.now(),
        customer: name,
        phone,
        email,
        address: `${address}, ${city}, ${postal}`,
        items: cart.map(item => ({ name: item.name, qty: item.qty, price: item.price })),
        total: cart.reduce((sum, item) => sum + item.price * item.qty, 0) + (cart.length > 0 ? (cart.reduce((s, i) => s + i.price * i.qty, 0) > 100 ? 0 : 9.99) : 0),
        payment,
        status: 'Pending',
        date: new Date().toLocaleDateString()
    };
    orders.push(order);
    saveLocalData();
    cart = [];
    saveLocalData();
    updateCartUI();
    document.getElementById('checkoutSection').style.display = 'none';
    alert('Order placed successfully!');
    if (document.getElementById('adminPanel').style.display !== 'none') renderAdminOrders();
});

// =============================================
// WISHLIST BADGE
// =============================================
function updateWishlistBadge() {
    const badge = document.querySelector('.wishlist-badge');
    if (badge) badge.textContent = wishlist.length;
}

// =============================================
// AUTH
// =============================================
document.getElementById('loginBtn').addEventListener('click', () => {
    document.getElementById('loginModal').classList.add('active');
});
document.getElementById('loginModalClose').addEventListener('click', () => {
    document.getElementById('loginModal').classList.remove('active');
});
document.getElementById('registerModalClose').addEventListener('click', () => {
    document.getElementById('registerModal').classList.remove('active');
});
document.getElementById('switchToRegister').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('registerModal').classList.add('active');
});
document.getElementById('switchToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerModal').classList.remove('active');
    document.getElementById('loginModal').classList.add('active');
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const user = data.user;
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, phone, avatar_url')
            .eq('id', user.id)
            .single();
        if (profileError && profileError.code !== 'PGRST116') throw profileError;
        currentUser = {
            id: user.id,
            email: user.email,
            name: profile?.full_name || user.email.split('@')[0],
            phone: profile?.phone || '',
            avatar: profile?.avatar_url || null,
            address: localStorage.getItem('sk_address') || ''
        };
        saveLocalData();
        document.getElementById('loginModal').classList.remove('active');
        updateAuthUI();
        if (email === 'admin@sk.com') {
            document.getElementById('adminPanel').style.display = 'flex';
            updateDashboardStats();
            renderAdminOrders();
            renderAdminProducts();
        }
        alert('Logged in successfully!');
    } catch (err) {
        if (email === 'admin@sk.com' && password === 'admin') {
            currentUser = {
                id: 'admin-local',
                email: 'admin@sk.com',
                name: 'Admin',
                phone: '+1 234 567 890',
                avatar: null,
                address: localStorage.getItem('sk_address') || ''
            };
            saveLocalData();
            document.getElementById('loginModal').classList.remove('active');
            updateAuthUI();
            document.getElementById('adminPanel').style.display = 'flex';
            updateDashboardStats();
            renderAdminOrders();
            renderAdminProducts();
            alert('Logged in as Admin (local mode).');
            return;
        }
        alert('Login failed: ' + err.message);
    }
});

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;
    if (password !== confirm) {
        alert('Passwords do not match.');
        return;
    }
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName, phone }
            }
        });
        if (error) throw error;
        alert('Registration successful! Please check your email for confirmation.');
        document.getElementById('registerModal').classList.remove('active');
    } catch (err) {
        alert('Registration failed: ' + err.message);
    }
});

// Profile - open modal
document.getElementById('profileToggle').addEventListener('click', () => {
    if (currentUser) {
        document.getElementById('profileName').textContent = currentUser.name;
        document.getElementById('profileEmail').textContent = currentUser.email;
        document.getElementById('profilePhone').textContent = currentUser.phone || '+1 234 567 890';
        document.getElementById('profileAddress').textContent = currentUser.address || 'No address saved';
        const avatarImg = document.getElementById('profileAvatarImg');
        const avatarIcon = document.getElementById('profileAvatarIcon');
        if (currentUser.avatar) {
            avatarImg.src = currentUser.avatar;
            avatarImg.style.display = 'block';
            avatarIcon.style.display = 'none';
        } else {
            avatarImg.style.display = 'none';
            avatarIcon.style.display = 'block';
        }
        document.getElementById('profileModal').classList.add('active');
    } else {
        alert('Please login first.');
    }
});

document.getElementById('profileModalClose').addEventListener('click', () => {
    document.getElementById('profileModal').classList.remove('active');
});
document.getElementById('profileLogoutBtn').addEventListener('click', logout);

document.querySelectorAll('[data-action="logout"], [data-action="logout-mobile"]').forEach(el => {
    el.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
});

// Avatar upload
document.getElementById('avatarUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
        const base64 = ev.target.result;
        if (currentUser) {
            currentUser.avatar = base64;
            saveLocalData();
            const avatarImg = document.getElementById('profileAvatarImg');
            const avatarIcon = document.getElementById('profileAvatarIcon');
            avatarImg.src = base64;
            avatarImg.style.display = 'block';
            avatarIcon.style.display = 'none';
            const navAvatar = document.querySelector('.nav-avatar');
            if (navAvatar) {
                navAvatar.src = base64;
                navAvatar.style.display = 'block';
                const icon = document.getElementById('profileToggle').querySelector('i');
                if (icon) icon.style.display = 'none';
            }
            try {
                await supabase.from('profiles').update({ avatar_url: base64 }).eq('id', currentUser.id);
            } catch (err) { /* ignore */ }
        }
    };
    reader.readAsDataURL(file);
});

async function logout() {
    try {
        await supabase.auth.signOut();
    } catch (e) { /* ignore */ }
    currentUser = null;
    saveLocalData();
    updateAuthUI();
    document.getElementById('profileModal').classList.remove('active');
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    document.getElementById('adminPanel').style.display = 'none';
    alert('Logged out.');
}

function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userProfile = document.getElementById('userProfile');
    const userName = document.getElementById('userNameDisplay');
    if (currentUser) {
        loginBtn.style.display = 'none';
        userProfile.style.display = 'flex';
        userName.textContent = currentUser.name;
        const profileToggle = document.getElementById('profileToggle');
        let navAvatar = profileToggle.querySelector('.nav-avatar');
        if (!navAvatar) {
            const icon = profileToggle.querySelector('i');
            if (icon) {
                const img = document.createElement('img');
                img.className = 'nav-avatar';
                profileToggle.replaceChild(img, icon);
                navAvatar = img;
            }
        }
        if (navAvatar) {
            if (currentUser.avatar) {
                navAvatar.src = currentUser.avatar;
                navAvatar.style.display = 'block';
            } else {
                navAvatar.style.display = 'none';
                if (!profileToggle.querySelector('i')) {
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-user-circle';
                    profileToggle.prepend(icon);
                }
            }
        }
    } else {
        loginBtn.style.display = 'inline-block';
        userProfile.style.display = 'none';
        const profileToggle = document.getElementById('profileToggle');
        const navAvatar = profileToggle?.querySelector('.nav-avatar');
        if (navAvatar) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-user-circle';
            profileToggle.replaceChild(icon, navAvatar);
        }
    }
    if (!currentUser) {
        document.getElementById('adminPanel').style.display = 'none';
    }
}

// =============================================
// ADMIN PANEL
// =============================================
document.querySelectorAll('.admin-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.dataset.admin;
        if (target === 'logout') {
            logout();
            document.getElementById('adminPanel').style.display = 'none';
            return;
        }
        document.querySelectorAll('.admin-page').forEach(page => page.style.display = 'none');
        const pageMap = {
            dashboard: 'adminDashboard',
            orders: 'adminOrders',
            products: 'adminProducts',
            categories: 'adminCategories',
            customers: 'adminCustomers',
            reports: 'adminReports',
            settings: 'adminSettings'
        };
        const pageId = pageMap[target];
        if (pageId) document.getElementById(pageId).style.display = 'block';
        document.querySelectorAll('.admin-nav a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');
        if (target === 'orders') renderAdminOrders();
        if (target === 'products') renderAdminProducts();
        if (target === 'dashboard') updateDashboardStats();
    });
});

function renderAdminOrders() {
    const tbody = document.getElementById('adminOrdersBody');
    if (!tbody) return;
    if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="text-center">No orders yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>#${order.id}</td>
            <td>${order.customer}</td>
            <td>${order.phone}</td>
            <td>${order.email}</td>
            <td>${order.items.map(i => i.name).join(', ')}</td>
            <td>${order.items.reduce((s,i) => s + i.qty, 0)}</td>
            <td>$${order.total.toFixed(2)}</td>
            <td>$${(order.total * 0.4).toFixed(2)}</td>
            <td>${order.address}</td>
            <td>${order.date}</td>
            <td>${order.payment}</td>
            <td><span style="background:#f1c40f;padding:2px 10px;border-radius:50px;font-size:0.7rem;">${order.status}</span></td>
            <td>
                <button class="btn-outline" style="padding:2px 8px;font-size:0.7rem;">View</button>
                <button class="btn-outline" style="padding:2px 8px;font-size:0.7rem;">Approve</button>
                <button class="btn-outline" style="padding:2px 8px;font-size:0.7rem;">Ship</button>
                <button class="btn-outline" style="padding:2px 8px;font-size:0.7rem;">Deliver</button>
                <button class="btn-outline" style="padding:2px 8px;font-size:0.7rem;color:#e74c3c;">Cancel</button>
            </td>
        </tr>
    `).join('');
}

function renderAdminProducts() {
    const tbody = document.getElementById('adminProductsBody');
    if (!tbody) return;
    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center">No products yet.</td></tr>`;
        return;
    }
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><img src="${p.image}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;" /></td>
            <td>${p.name}</td>
            <td>$${p.price.toFixed(2)}</td>
            <td>50</td>
            <td>${p.discount}%</td>
            <td>${p.category}</td>
            <td>
                <button class="btn-outline" style="padding:2px 8px;font-size:0.7rem;" onclick="alert('Edit functionality coming soon.')">Edit</button>
                <button class="btn-outline" style="padding:2px 8px;font-size:0.7rem;color:#e74c3c;" onclick="if(confirm('Delete this product?')){ alert('Deletion not implemented yet.'); }">Delete</button>
            </td>
        </tr>
    `).join('');
}

function updateDashboardStats() {
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.date).toDateString() === today).length;
    document.querySelectorAll('.stat-card').forEach((card, idx) => {
        const spans = card.querySelectorAll('span');
        if (spans.length) {
            if (idx === 0) spans[0].textContent = `$${(totalRevenue * 0.3).toFixed(0)}`;
            else if (idx === 1) spans[0].textContent = `$${totalRevenue.toFixed(0)}`;
            else if (idx === 2) spans[0].textContent = `$${totalRevenue.toFixed(0)}`;
            else if (idx === 3) spans[0].textContent = `$${(totalRevenue * 0.4).toFixed(0)}`;
            else if (idx === 4) spans[0].textContent = todayOrders;
            else if (idx === 5) spans[0].textContent = totalOrders - todayOrders;
            else if (idx === 6) spans[0].textContent = todayOrders;
            else if (idx === 7) spans[0].textContent = 1;
        }
    });
}

// =============================================
// INIT
// =============================================
async function initApp() {
    let supabaseProducts = await fetchProductsFromSupabase();
    let supabaseCategories = await fetchCategoriesFromSupabase();
    if (!supabaseProducts) supabaseProducts = sampleProducts;
    if (!supabaseCategories) supabaseCategories = sampleCategories;

    renderCategories(supabaseCategories);
    renderProducts(supabaseProducts);
    updateAuthUI();
    updateCartUI();
    updateWishlistBadge();

    if (currentUser && currentUser.email === 'admin@sk.com') {
        document.getElementById('adminPanel').style.display = 'flex';
        updateDashboardStats();
        renderAdminOrders();
        renderAdminProducts();
    }
}

// =============================================
// MODAL CLOSE ON OVERLAY
// =============================================
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
});