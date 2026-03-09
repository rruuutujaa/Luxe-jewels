package com.luxejewels.controller;

import com.luxejewels.model.Order;
import com.luxejewels.model.Product;
import com.luxejewels.model.User;
import com.luxejewels.repository.OrderRepository;
import com.luxejewels.repository.ProductRepository;
import com.luxejewels.repository.UserRepository;
import com.luxejewels.service.UserService;
import com.luxejewels.service.AdminAnalyticsService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Admin Controller
 * Admin-only endpoints for dashboards and analytics.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private AdminAnalyticsService adminAnalyticsService;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> stats(HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }

            long totalUsers = userRepository.count();
            long totalProducts = productRepository.count();
            long totalOrders = orderRepository.count();

            List<Order> allOrders = orderRepository.findAll();
            BigDecimal revenue = allOrders.stream()
                    .filter(o -> "PAID".equalsIgnoreCase(o.getPaymentStatus()))
                    .map(Order::getTotal)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            long pendingOrders = allOrders.stream()
                    .filter(o -> !"PAID".equalsIgnoreCase(o.getPaymentStatus()))
                    .count();

            int lowStockThreshold = 5;
            long lowStockProducts = productRepository.findByStockLessThanAndIsActive(lowStockThreshold, true).size();

            resp.put("success", true);
            resp.put("totalUsers", totalUsers);
            resp.put("totalProducts", totalProducts);
            resp.put("totalOrders", totalOrders);
            resp.put("totalRevenue", revenue);
            resp.put("pendingOrders", pendingOrders);
            resp.put("lowStockProducts", lowStockProducts);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to compute stats: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @GetMapping("/orders")
    public ResponseEntity<Map<String, Object>> orders(HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }

            List<Order> orders = orderRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
            List<Map<String, Object>> enriched = new ArrayList<>();
            for (Order o : orders) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", o.getId());
                m.put("userId", o.getUserId());
                String userName = null;
                if (o.getUserId() != null) {
                    User u = userRepository.findById(o.getUserId()).orElse(null);
                    if (u != null)
                        userName = u.getName();
                }
                m.put("userName", userName != null && !userName.isBlank() ? userName : "Unknown");
                m.put("items", o.getItems());
                m.put("subtotal", o.getSubtotal());
                m.put("tax", o.getTax());
                m.put("total", o.getTotal());
                m.put("status", o.getStatus());
                m.put("paymentStatus", o.getPaymentStatus());
                m.put("createdAt", o.getCreatedAt());
                enriched.add(m);
            }
            resp.put("success", true);
            resp.put("orders", enriched);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to fetch orders: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @PutMapping("/orders/{orderId}/status")
    public ResponseEntity<Map<String, Object>> updateOrderStatus(
            @PathVariable String orderId,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            String status = body.get("status");
            if (status == null || status.isBlank()) {
                resp.put("success", false);
                resp.put("message", "status is required");
                return ResponseEntity.badRequest().body(resp);
            }
            Order order = orderRepository.findById(orderId).orElse(null);
            if (order == null) {
                resp.put("success", false);
                resp.put("message", "Order not found");
                return ResponseEntity.status(404).body(resp);
            }
            order.setStatus(status.trim().toUpperCase());
            Order saved = orderRepository.save(order);
            resp.put("success", true);
            resp.put("order", saved);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to update order: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> users(@RequestParam(value = "query", required = false) String query,
            HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }

            List<User> users = userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
            if (query != null && !query.isBlank()) {
                String q = query.trim().toLowerCase();
                users = users.stream().filter(u -> (u.getEmail() != null && u.getEmail().toLowerCase().contains(q)) ||
                        (u.getName() != null && u.getName().toLowerCase().contains(q))).collect(Collectors.toList());
            }
            // Never expose password hashes
            List<Map<String, Object>> safeUsers = users.stream().map(u -> Map.<String, Object>of(
                    "id", u.getId(),
                    "name", u.getName(),
                    "email", u.getEmail(),
                    "role", u.getRole(),
                    "disabled", u.getDisabled(),
                    "createdAt", u.getCreatedAt())).collect(Collectors.toList());

            resp.put("success", true);
            resp.put("users", safeUsers);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to fetch users: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<Map<String, Object>> changeUserRole(@PathVariable String id,
            @RequestBody Map<String, String> body, HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            String role = body.getOrDefault("role", "").trim().toUpperCase();
            if (!role.equals("USER") && !role.equals("ADMIN")) {
                resp.put("success", false);
                resp.put("message", "Invalid role");
                return ResponseEntity.badRequest().body(resp);
            }
            User user = userRepository.findById(id).orElse(null);
            if (user == null) {
                resp.put("success", false);
                resp.put("message", "User not found");
                return ResponseEntity.status(404).body(resp);
            }
            user.setRole(role);
            userService.save(user);
            resp.put("success", true);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to change role: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @PutMapping("/users/{id}/disable")
    public ResponseEntity<Map<String, Object>> disableUser(@PathVariable String id,
            @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            Object disabledObj = body.get("disabled");
            boolean disabled = disabledObj != null && Boolean.parseBoolean(String.valueOf(disabledObj));
            User user = userRepository.findById(id).orElse(null);
            if (user == null) {
                resp.put("success", false);
                resp.put("message", "User not found");
                return ResponseEntity.status(404).body(resp);
            }
            user.setDisabled(disabled);
            userService.save(user);
            resp.put("success", true);
            resp.put("disabled", user.getDisabled());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to update user: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @GetMapping("/low-stock")
    public ResponseEntity<Map<String, Object>> lowStock(HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            int threshold = 5;
            List<Product> products = productRepository.findByStockLessThanAndIsActive(threshold, true);
            resp.put("success", true);
            resp.put("threshold", threshold);
            resp.put("products", products);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to fetch low stock: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @GetMapping("/revenue")
    public ResponseEntity<Map<String, Object>> revenue(HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }

            List<Order> orders = orderRepository.findAll();
            BigDecimal totalRevenue = orders.stream()
                    .filter(o -> "PAID".equalsIgnoreCase(o.getPaymentStatus()))
                    .map(Order::getTotal)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Revenue per day (simple aggregation)
            Map<LocalDate, BigDecimal> revenuePerDay = new TreeMap<>();
            for (Order o : orders) {
                if (!"PAID".equalsIgnoreCase(o.getPaymentStatus()) || o.getCreatedAt() == null)
                    continue;
                LocalDate day = o.getCreatedAt().toLocalDate();
                revenuePerDay.put(day, revenuePerDay.getOrDefault(day, BigDecimal.ZERO).add(o.getTotal()));
            }

            resp.put("success", true);
            resp.put("totalRevenue", totalRevenue);
            resp.put("revenuePerDay", revenuePerDay);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to compute revenue: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    /**
     * Analytics endpoint (Admin only)
     * GET /api/admin/analytics
     */
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> analytics(HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            Map<String, Object> data = adminAnalyticsService.computeCoreAnalytics();
            resp.put("success", true);
            resp.putAll(data);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to compute analytics: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    private List<Map<String, Object>> topN(Map<String, Integer> map, int n) {
        return map.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .limit(n)
                .map(e -> Map.<String, Object>of("key", e.getKey(), "value", e.getValue()))
                .collect(Collectors.toList());
    }

    private List<Map<String, Object>> topNMoney(Map<String, BigDecimal> map, int n) {
        return map.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(n)
                .map(e -> Map.<String, Object>of("key", e.getKey(), "value", e.getValue()))
                .collect(Collectors.toList());
    }

    @GetMapping("/analytics/top-products")
    public ResponseEntity<Map<String, Object>> topProducts(@RequestParam(defaultValue = "5") Integer limit,
            HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            List<Map<String, Object>> raw = adminAnalyticsService.topSellingProducts(limit == null ? 5 : limit);
            // Enrich with product name
            List<Map<String, Object>> enriched = raw.stream().map(m -> {
                String pid = String.valueOf(m.getOrDefault("productId", ""));
                Map<String, Object> out = new HashMap<>(m);
                productRepository.findById(pid).ifPresent(p -> out.put("productName", p.getName()));
                return out;
            }).collect(Collectors.toList());
            resp.put("success", true);
            resp.put("items", enriched);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to compute top products: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @GetMapping("/analytics/monthly-orders")
    public ResponseEntity<Map<String, Object>> monthlyOrders(HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            List<Map<String, Object>> items = adminAnalyticsService.monthlyOrderTotals();
            resp.put("success", true);
            resp.put("items", items);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to compute monthly orders: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @GetMapping("/products")
    public ResponseEntity<Map<String, Object>> allProducts(HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            List<Product> products = productRepository.findAll();
            resp.put("success", true);
            resp.put("products", products);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to fetch products: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @PostMapping("/products")
    public ResponseEntity<Map<String, Object>> createProduct(@RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            Product p = new Product();
            p.setName((String) body.get("name"));
            p.setDescription((String) body.get("description"));
            p.setCategory((String) body.get("category"));
            Object priceObj = body.get("price");
            if (priceObj != null) {
                try {
                    java.math.BigDecimal price = new java.math.BigDecimal(String.valueOf(priceObj));
                    p.setPrice(price);
                } catch (Exception ignored) {
                }
            }
            p.setImageUrl((String) body.get("imageUrl"));
            Object stockObj = body.get("stock");
            Integer stock = 50;
            if (stockObj != null) {
                try {
                    stock = Integer.valueOf(String.valueOf(stockObj));
                } catch (Exception ignored) {
                }
            }
            p.setStock(stock == null ? 50 : stock);
            Object activeObj = body.get("isActive");
            Boolean active = activeObj == null ? Boolean.TRUE : Boolean.valueOf(String.valueOf(activeObj));
            p.setIsActive(active);

            Product saved = productRepository.save(p);
            resp.put("success", true);
            resp.put("product", saved);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to create product: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<Map<String, Object>> updateProduct(@PathVariable String id,
            @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            Product p = productRepository.findById(id).orElse(null);
            if (p == null) {
                resp.put("success", false);
                resp.put("message", "Product not found");
                return ResponseEntity.status(404).body(resp);
            }
            if (body.containsKey("name"))
                p.setName((String) body.get("name"));
            if (body.containsKey("description"))
                p.setDescription((String) body.get("description"));
            if (body.containsKey("category"))
                p.setCategory((String) body.get("category"));
            if (body.containsKey("imageUrl"))
                p.setImageUrl((String) body.get("imageUrl"));
            if (body.containsKey("isActive")) {
                Object activeObj = body.get("isActive");
                p.setIsActive(activeObj == null ? p.getIsActive() : Boolean.valueOf(String.valueOf(activeObj)));
            }
            if (body.containsKey("price")) {
                Object priceObj = body.get("price");
                try {
                    java.math.BigDecimal price = new java.math.BigDecimal(String.valueOf(priceObj));
                    p.setPrice(price);
                } catch (Exception ignored) {
                }
            }
            if (body.containsKey("stock")) {
                Object stockObj = body.get("stock");
                try {
                    p.setStock(Integer.valueOf(String.valueOf(stockObj)));
                } catch (Exception ignored) {
                }
            }
            Product saved = productRepository.save(p);
            resp.put("success", true);
            resp.put("product", saved);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to update product: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<Map<String, Object>> deleteProduct(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            Product p = productRepository.findById(id).orElse(null);
            if (p == null) {
                resp.put("success", false);
                resp.put("message", "Product not found");
                return ResponseEntity.status(404).body(resp);
            }
            p.setIsActive(false);
            productRepository.save(p);
            resp.put("success", true);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to delete product: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @PostMapping("/products/init-stock")
    public ResponseEntity<Map<String, Object>> initStock(HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            List<Product> products = productRepository.findAll();
            for (Product p : products) {
                p.setStock(50);
            }
            productRepository.saveAll(products);
            resp.put("success", true);
            resp.put("updated", products.size());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to initialize stock: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    /**
     * Admin-only endpoint to create a new user (including admins).
     * POST /api/admin/users
     */
    @PostMapping("/users")
    public ResponseEntity<Map<String, Object>> createUser(@RequestBody Map<String, String> body,
            HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }

            String name = body.getOrDefault("name", "").trim();
            String email = body.getOrDefault("email", "").trim();
            String password = body.getOrDefault("password", "").trim();
            String role = body.getOrDefault("role", "USER").trim().toUpperCase();

            if (name.isEmpty() || email.isEmpty() || password.isEmpty()) {
                resp.put("success", false);
                resp.put("message", "Name, email and password are required");
                return ResponseEntity.badRequest().body(resp);
            }

            if (!role.equals("USER") && !role.equals("ADMIN")) {
                resp.put("success", false);
                resp.put("message", "Invalid role. Allowed: USER or ADMIN");
                return ResponseEntity.badRequest().body(resp);
            }

            if (userRepository.existsByEmail(email)) {
                resp.put("success", false);
                resp.put("message", "User with this email already exists");
                return ResponseEntity.badRequest().body(resp);
            }

            User user = userService.registerUser(name, email, password);
            user.setRole(role);
            userService.save(user);

            Map<String, Object> safeUser = new HashMap<>();
            safeUser.put("id", user.getId());
            safeUser.put("name", user.getName());
            safeUser.put("email", user.getEmail());
            safeUser.put("role", user.getRole());
            safeUser.put("createdAt", user.getCreatedAt());

            resp.put("success", true);
            resp.put("user", safeUser);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to create user: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    /**
     * Get global wishlist analytics (admin only)
     * GET /api/admin/analytics/wishlist
     */
    @GetMapping("/analytics/wishlist")
    public ResponseEntity<Map<String, Object>> wishlistAnalytics(HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }

            // Get wishlist repository to query all wishlists
            com.luxejewels.repository.WishlistRepository wishlistRepo = com.luxejewels.JewelleryShopApplication
                    .getWishlistRepository();

            if (wishlistRepo == null) {
                resp.put("success", false);
                resp.put("message", "Wishlist service not available");
                return ResponseEntity.status(500).body(resp);
            }

            List<com.luxejewels.model.WishlistItem> allWishlists = wishlistRepo.findAll();

            // Count total wishlist items
            resp.put("totalWishlistItems", allWishlists.size());

            // Count unique users with wishlists
            long usersWithWishlist = allWishlists.stream()
                    .map(com.luxejewels.model.WishlistItem::getUserId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .count();
            resp.put("usersWithWishlist", usersWithWishlist);

            // Most wishlisted products
            Map<String, Long> productCounts = allWishlists.stream()
                    .filter(w -> w.getProductId() != null)
                    .collect(java.util.stream.Collectors.groupingBy(
                            com.luxejewels.model.WishlistItem::getProductId,
                            java.util.stream.Collectors.counting()));

            List<Map<String, Object>> topProducts = productCounts.entrySet().stream()
                    .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                    .limit(10)
                    .map(e -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("productId", e.getKey());
                        m.put("wishlistCount", e.getValue());
                        // Try to get product name
                        productRepository.findById(e.getKey()).ifPresent(p -> m.put("productName", p.getName()));
                        return m;
                    })
                    .collect(Collectors.toList());
            resp.put("topWishlistedProducts", topProducts);

            resp.put("success", true);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to fetch wishlist analytics: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    /**
     * Get global cart analytics (admin only)
     * GET /api/admin/analytics/cart
     */
    @GetMapping("/analytics/cart")
    public ResponseEntity<Map<String, Object>> cartAnalytics(HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }

            // Get cart repository to query all carts
            com.luxejewels.repository.CartRepository cartRepo = com.luxejewels.JewelleryShopApplication
                    .getCartRepository();

            if (cartRepo == null) {
                resp.put("success", false);
                resp.put("message", "Cart service not available");
                return ResponseEntity.status(500).body(resp);
            }

            List<com.luxejewels.model.CartItem> allCartItems = cartRepo.findAll();

            // Count total cart items
            resp.put("totalCartItems", allCartItems.size());

            // Count unique users with carts
            long usersWithCart = allCartItems.stream()
                    .map(com.luxejewels.model.CartItem::getUserId)
                    .filter(Objects::nonNull)
                    .distinct()
                    .count();
            resp.put("usersWithCart", usersWithCart);

            // Calculate total cart value
            final BigDecimal[] totalValue = { BigDecimal.ZERO };
            for (com.luxejewels.model.CartItem item : allCartItems) {
                if (item.getProductId() != null) {
                    productRepository.findById(item.getProductId()).ifPresent(p -> {
                        if (p.getPrice() != null && item.getQuantity() != null) {
                            totalValue[0] = totalValue[0]
                                    .add(p.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
                        }
                    });
                }
            }
            resp.put("totalCartValue", totalValue[0]);

            // Most added to cart products
            Map<String, Long> productCounts = allCartItems.stream()
                    .filter(c -> c.getProductId() != null)
                    .collect(java.util.stream.Collectors.groupingBy(
                            com.luxejewels.model.CartItem::getProductId,
                            java.util.stream.Collectors
                                    .summingLong(c -> c.getQuantity() != null ? c.getQuantity() : 1)));

            List<Map<String, Object>> topProducts = productCounts.entrySet().stream()
                    .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                    .limit(10)
                    .map(e -> {
                        Map<String, Object> m = new HashMap<>();
                        m.put("productId", e.getKey());
                        m.put("addToCartCount", e.getValue());
                        productRepository.findById(e.getKey()).ifPresent(p -> {
                            m.put("productName", p.getName());
                            m.put("price", p.getPrice());
                        });
                        return m;
                    })
                    .collect(Collectors.toList());
            resp.put("topAddedToCartProducts", topProducts);

            resp.put("success", true);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to fetch cart analytics: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    /**
     * Get recent customers (admin only)
     * GET /api/admin/analytics/recent-customers
     */
    @GetMapping("/analytics/recent-customers")
    public ResponseEntity<Map<String, Object>> recentCustomers(
            @RequestParam(defaultValue = "5") Integer limit,
            HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }

            List<User> recentUsers = userRepository.findAll(
                    Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                    .limit(limit)
                    .collect(Collectors.toList());

            // Get order counts and total spent for each user
            List<Map<String, Object>> enriched = new ArrayList<>();
            for (User u : recentUsers) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", u.getId());
                m.put("name", u.getName());
                m.put("email", u.getEmail());
                m.put("createdAt", u.getCreatedAt());

                // Get order stats
                List<Order> userOrders = orderRepository.findByUserId(u.getId());
                m.put("orderCount", userOrders.size());
                BigDecimal totalSpent = userOrders.stream()
                        .filter(o -> "PAID".equalsIgnoreCase(o.getPaymentStatus()))
                        .map(Order::getTotal)
                        .filter(Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
                m.put("totalSpent", totalSpent);

                enriched.add(m);
            }

            resp.put("success", true);
            resp.put("customers", enriched);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to fetch recent customers: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    /**
     * Get recent orders (admin only)
     * GET /api/admin/analytics/recent-orders
     */
    @GetMapping("/analytics/recent-orders")
    public ResponseEntity<Map<String, Object>> recentOrders(
            @RequestParam(defaultValue = "5") Integer limit,
            HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            if (!isAdminSession(request)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }

            List<Order> recentOrders = orderRepository.findAll(
                    Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                    .limit(limit)
                    .collect(Collectors.toList());

            List<Map<String, Object>> enriched = new ArrayList<>();
            for (Order o : recentOrders) {
                Map<String, Object> m = new HashMap<>();
                m.put("id", o.getId());
                m.put("userId", o.getUserId());

                // Get user name
                if (o.getUserId() != null) {
                    User u = userRepository.findById(o.getUserId()).orElse(null);
                    if (u != null)
                        m.put("userName", u.getName());
                }

                m.put("total", o.getTotal());
                m.put("status", o.getStatus());
                m.put("paymentStatus", o.getPaymentStatus());
                m.put("createdAt", o.getCreatedAt());
                m.put("itemCount", o.getItems() != null ? o.getItems().size() : 0);

                enriched.add(m);
            }

            resp.put("success", true);
            resp.put("orders", enriched);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to fetch recent orders: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    private boolean isAdminSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return false;
        String userId = (String) session.getAttribute(AuthController.SESSION_USER_ID);
        if (userId == null || userId.isBlank()) return false;
        User u = userService.findById(userId).orElse(null);
        if (u == null) return false;
        return u.getRole() != null && "ADMIN".equalsIgnoreCase(u.getRole().trim());
    }
}
