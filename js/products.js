// let allProducts = [];
// let currentCategory = 'all';

// document.addEventListener('DOMContentLoaded', () => {
//     loadProducts();
//     setupCategoryFilters();
// });

// // async function loadProducts() {
// //     try {
// //         const response = await fetch('/api/products');
// //         if (!response.ok) throw new Error('Network error');
// //         allProducts = await response.json();
        
// //         // Initial load: show all
// //         displayProducts(allProducts);
// //     } catch (error) {
// //         console.error('Error:', error);
// //         showError('Our collection is currently being polished. Please check back soon.');
// //     }
// // }


// function setupCategoryFilters() {
//     const buttons = document.querySelectorAll('.filter-btn, .category-btn, [data-category]');
    
//     buttons.forEach(btn => {
//         btn.addEventListener('click', (e) => {
//             e.preventDefault();
//             const rawCategory = btn.getAttribute('data-category') || btn.textContent.trim();
            
//             // MAP LUXURY LABELS: If button says "Trending Now", show all
//             const category = (rawCategory.toLowerCase() === 'trending now') ? 'all' : rawCategory;

//             buttons.forEach(b => b.classList.remove('active'));
//             btn.classList.add('active');
            
//             filterByCategory(category);
//         });
//     });
// }

// function filterByCategory(category) {
//     currentCategory = category.toLowerCase();
//     const filtered = (currentCategory === 'all') 
//         ? allProducts 
//         : allProducts.filter(p => p.category.toLowerCase() === currentCategory);
    
//     displayProducts(filtered);
// }

// function displayProducts(products) {
//     const grid = document.getElementById('productsGrid') || document.querySelector('.products-grid');
//     if (!grid) return;

//     if (products.length === 0) {
//         grid.innerHTML = `<div class="no-products"><p>The ${currentCategory} collection is coming soon.</p></div>`;
//         return;
//     }

//     grid.innerHTML = products.map(product => `
//         <div class="product-card">
//             <div class="product-image">
//                 <img src="${product.imageUrl}" alt="${product.name}" 
//                      onerror="this.src='https://placehold.co/600x600/fafafa/d1d1d1?text=LUXE'">
//                 <button class="wishlist-btn" onclick="toggleWishlist(${product.id})">♥</button>
//             </div>
//             <div class="product-info">
//                 <h3>${product.name}</h3>
//                 <p class="product-category">${product.category}</p>
//                 <p class="product-price">$${parseFloat(product.price).toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
//                 <div class="product-actions">
//                     <button class="btn-add-cart" onclick="addToCartHandler(${product.id})">Add to Bag</button>
//                     <a href="product-details.html?id=${product.id}" class="btn-details">Details</a>
//                 </div>
//             </div>
//         </div>
//     `).join('');
// }
// // Display products in grid
// function displayProducts(products) {
//     const productsGrid = document.getElementById('productsGrid') || 
//                         document.querySelector('.products-grid');
    
//     if (!productsGrid) {
//         console.error('Products grid container not found');
//         return;
//     }
    
//     if (products.length === 0) {
//         productsGrid.innerHTML = `
//             <div class="no-products">
//                 <p>No products found in this category.</p>
//             </div>
//         `;
//         return;
//     }
    
//     productsGrid.innerHTML = products.map(product => `
//         <div class="product-card">
//             <div class="product-image">
//                 <img src="${product.imageUrl}" 
//                      alt="${product.name}"
//                      onerror="this.src='https://via.placeholder.com/400x400?text=No+Image'">
//                 <button class="wishlist-btn" onclick="toggleWishlist(${product.id})">
//                     ❤️
//                 </button>
//             </div>
//             <div class="product-info">
//                 <h3>${product.name}</h3>
//                 <p class="product-category">${product.category}</p>
//                 <p class="product-description">${product.description}</p>
//                 <p class="product-price">$${parseFloat(product.price).toFixed(2)}</p>
//                 <div class="product-actions">
//                     <button class="btn btn-primary btn-add-cart" onclick="addToCartHandler(${product.id})">
//                         Add to Cart
//                     </button>
//                     <a href="product-details.html?id=${product.id}" class="btn btn-outline">
//                         View Details
//                     </a>
//                 </div>
//             </div>
//         </div>
//     `).join('');
// }

// // Add to cart handler
// function addToCart(product) {
//     let cart = JSON.parse(localStorage.getItem("cart")) || [];

//     const existing = cart.find(p => p.id === product.id);

//     if (existing) {
//         existing.quantity += 1;
//     } else {
//         cart.push({...product, quantity: 1});
//     }

//     localStorage.setItem("cart", JSON.stringify(cart));

//     updateCartCount();   // 🔥 REQUIRED
// }


// // Add to cart API call
// async function addToCart(productId) {
//     try {
//         const token = localStorage.getItem('token');
        
//         const response = await fetch(`/api/cart/add?productId=${productId}&quantity=1`, {
//             method: 'POST',
//             headers: {
//                 'Authorization': `Bearer ${token}`,
//                 'Content-Type': 'application/json'
//             }
//         });
        
//         if (!response.ok) {
//             throw new Error('Failed to add to cart');
//         }
        
//         alert('Product added to cart successfully!');
//         updateCartCount();
        
//     } catch (error) {
//         console.error('Error adding to cart:', error);
//         alert('Failed to add product to cart. Please try again.');
//     }
// }

// // Toggle wishlist
// function toggleWishlist(productId) {
//     const token = localStorage.getItem('token');
    
//     if (!token) {
//         alert('Please login to add items to wishlist');
//         window.location.href = 'login.html';
//         return;
//     }
    
//     // Add wishlist functionality here
//     console.log('Toggle wishlist for product:', productId);
//     alert('Wishlist feature coming soon!');
// }

// // Update cart count
// function updateCartCount() {
//     const token = localStorage.getItem('token');
    
//     if (!token) return;
    
//     fetch('/api/cart', {
//         headers: {
//             'Authorization': `Bearer ${token}`
//         }
//     })
//     .then(response => response.json())
//     .then(cart => {
//         const cartCount = document.getElementById('cartCount');
//         if (cartCount) {
//             const totalItems = cart.items ? cart.items.length : 0;
//             cartCount.textContent = totalItems;
//         }
//     })
//     .catch(error => console.error('Error updating cart count:', error));
// }

// // Show error message
// function showError(message) {
//     const productsGrid = document.getElementById('productsGrid') || 
//                         document.querySelector('.products-grid');
    
//     if (productsGrid) {
//         productsGrid.innerHTML = `
//             <div class="error-message">
//                 <p>${message}</p>
//             </div>
//         `;
//     }
// }

// // Search functionality
// function searchProducts(query) {
//     const searchTerm = query.toLowerCase();
    
//     const filteredProducts = allProducts.filter(product => 
//         product.name.toLowerCase().includes(searchTerm) ||
//         product.description.toLowerCase().includes(searchTerm) ||
//         product.category.toLowerCase().includes(searchTerm)
//     );
    
//     displayProducts(filteredProducts);
// }

// // Sort products
// function sortProducts(sortBy) {
//     let sortedProducts = [...allProducts];
    
//     switch(sortBy) {
//         case 'price-low':
//             sortedProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
//             break;
//         case 'price-high':
//             sortedProducts.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
//             break;
//         case 'name':
//             sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
//             break;
//         default:
//             break;
//     }
    
//     displayProducts(sortedProducts);
// }
let allProducts = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupCategoryFilters();
    updateCartCount(); // ✅ ensure badge loads
});


// ---------------- LOAD PRODUCTS ----------------

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        if (!response.ok) throw new Error('Network error');

        allProducts = await response.json();
        displayProducts(allProducts);

    } catch (error) {
        console.error(error);
        showError('Collection unavailable right now.');
    }
}


// ---------------- CATEGORY FILTER ----------------

function setupCategoryFilters() {
    const buttons = document.querySelectorAll('[data-category]');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const cat = btn.dataset.category.toLowerCase();
            currentCategory = cat;

            if (cat === 'all') {
                displayProducts(allProducts);
            } else {
                displayProducts(
                    allProducts.filter(p =>
                        p.category.toLowerCase() === cat
                    )
                );
            }
        });
    });
}


// ---------------- DISPLAY PRODUCTS ----------------

function displayProducts(products) {
    const grid = document.getElementById('productsGrid') ||
                 document.querySelector('.products-grid');

    if (!grid) return;

    if (!products.length) {
        grid.innerHTML = `<div class="no-products">
            <p>No products found.</p>
        </div>`;
        return;
    }

    grid.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-image">
                <img src="${product.imageUrl}"
                     alt="${product.name}"
                     onerror="this.src='https://via.placeholder.com/400'">
                <button class="wishlist-btn"
                        onclick="toggleWishlist(${product.id})">
                    ❤️
                </button>
            </div>

            <div class="product-info">
                <h3>${product.name}</h3>
                <p>${product.category}</p>
                <p>$${parseFloat(product.price).toFixed(2)}</p>

                <div class="product-actions">
                    <button class="btn btn-primary"
                        onclick="addToCartHandler(${product.id})">
                        Add to Cart
                    </button>

                    <a href="product-details.html?id=${product.id}"
                       class="btn btn-outline">
                       Details
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}


// ---------------- ADD TO CART (BACKEND) ----------------

async function addToCartHandler(productId) {
    const token = localStorage.getItem('token');

    if (!token) {
        alert("Login first");
        window.location.href = "login.html";
        return;
    }

    try {
        const res = await fetch(
            `/api/cart/add?productId=${productId}&quantity=1`,
            {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        if (!res.ok) throw new Error();

        alert("Added to cart");

        // ✅ delay so backend commit completes
        setTimeout(updateCartCount, 300);

    } catch (e) {
        console.error(e);
        alert("Failed to add");
    }
}


// ---------------- CART BADGE FIX ----------------

async function updateCartCount() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const res = await fetch('/api/cart', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) return;

        const data = await res.json();
        const badge = document.getElementById("cartBadge");
        if (!badge) return;

        // ✅ works for BOTH formats
        const count = Array.isArray(data)
            ? data.length
            : (data.items ? data.items.length : 0);

        badge.textContent = count > 0 ? `(${count})` : "";
        badge.style.display = count > 0 ? "inline" : "none";

    } catch (e) {
        console.error(e);
    }
}


// ---------------- WISHLIST ----------------

function toggleWishlist(productId) {
    const token = localStorage.getItem('token');

    if (!token) {
        alert('Please login first');
        window.location.href = 'login.html';
        return;
    }

    alert('Wishlist coming soon');
}


// ---------------- SEARCH ----------------

function searchProducts(query) {
    const s = query.toLowerCase();

    displayProducts(
        allProducts.filter(p =>
            p.name.toLowerCase().includes(s) ||
            p.category.toLowerCase().includes(s) ||
            (p.description || '').toLowerCase().includes(s)
        )
    );
}


// ---------------- SORT ----------------

function sortProducts(type) {
    let arr = [...allProducts];

    if (type === "price-low")
        arr.sort((a,b)=>a.price-b.price);

    if (type === "price-high")
        arr.sort((a,b)=>b.price-a.price);

    if (type === "name")
        arr.sort((a,b)=>a.name.localeCompare(b.name));

    displayProducts(arr);
}


// ---------------- ERROR ----------------

function showError(msg) {
    const grid = document.getElementById('productsGrid');
    if (grid) grid.innerHTML = `<p>${msg}</p>`;
}
