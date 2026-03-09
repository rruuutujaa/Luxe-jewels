package com.luxejewels.controller;

import com.luxejewels.model.Order;
import com.luxejewels.model.Notification;
import com.luxejewels.model.Product;
import com.luxejewels.model.StockLog;
import com.luxejewels.model.User;
import com.luxejewels.repository.NotificationRepository;
import com.luxejewels.repository.OrderRepository;
import com.luxejewels.repository.ProductRepository;
import com.luxejewels.repository.StockLogRepository;
import com.luxejewels.repository.UserRepository;
import com.luxejewels.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Vendor (Supplier) panel APIs.
 * Session-based auth: vendor can only access their own data.
 */
@RestController
@RequestMapping("/api/vendor")
public class VendorController {

    private static final int LOW_STOCK_THRESHOLD = 5;

    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private StockLogRepository stockLogRepository;
    @Autowired private NotificationRepository notificationRepository;

    // -------------------------
    // Profile
    // -------------------------

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        return ResponseEntity.ok(safeVendor(vendor));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        vendor.setName(optStr(body, "vendorName", vendor.getName()));
        vendor.setCompanyName(optStr(body, "companyName", vendor.getCompanyName()));
        vendor.setPhone(optStr(body, "phone", vendor.getPhone()));
        vendor.setBusinessAddress(optStr(body, "businessAddress", vendor.getBusinessAddress()));
        vendor.setBankDetails(optStr(body, "bankDetails", vendor.getBankDetails()));

        userService.save(vendor);
        return ResponseEntity.ok(safeVendor(vendor));
    }

    // -------------------------
    // Products (CRUD)
    // -------------------------

    @GetMapping("/products")
    public ResponseEntity<?> myProducts(HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        List<Product> products = productRepository.findByVendorId(vendor.getId());
        products.sort(Comparator.comparing(Product::getUpdatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return ResponseEntity.ok(products);
    }

    @PostMapping("/products")
    public ResponseEntity<?> createProduct(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Product p = new Product();
        p.setVendorId(vendor.getId());
        applyProductFields(p, body);
        p.setCreatedAt(java.time.LocalDateTime.now());
        p.setUpdatedAt(java.time.LocalDateTime.now());

        // Backward compatibility for shop cards
        if ((p.getImageUrl() == null || p.getImageUrl().isBlank()) && p.getImages() != null && !p.getImages().isEmpty()) {
            p.setImageUrl(p.getImages().get(0));
        }

        Product saved = productRepository.save(p);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/products/{id}")
    public ResponseEntity<?> updateProduct(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Product p = productRepository.findById(id).orElse(null);
        if (p == null) return ResponseEntity.status(404).body(Map.of("message", "Product not found"));
        if (!vendor.getId().equals(p.getVendorId())) return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));

        applyProductFields(p, body);
        p.setUpdatedAt(java.time.LocalDateTime.now());
        if ((p.getImageUrl() == null || p.getImageUrl().isBlank()) && p.getImages() != null && !p.getImages().isEmpty()) {
            p.setImageUrl(p.getImages().get(0));
        }

        Product saved = productRepository.save(p);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/products/{id}")
    public ResponseEntity<?> deleteProduct(@PathVariable String id, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Product p = productRepository.findById(id).orElse(null);
        if (p == null) return ResponseEntity.status(404).body(Map.of("message", "Product not found"));
        if (!vendor.getId().equals(p.getVendorId())) return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));

        productRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/products/{id}/duplicate")
    public ResponseEntity<?> duplicateProduct(@PathVariable String id, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Product src = productRepository.findById(id).orElse(null);
        if (src == null) return ResponseEntity.status(404).body(Map.of("message", "Product not found"));
        if (!vendor.getId().equals(src.getVendorId())) return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));

        Product p = new Product();
        p.setVendorId(vendor.getId());
        p.setName((src.getName() == null ? "Copy" : (src.getName() + " (Copy)")));
        p.setDescription(src.getDescription());
        p.setCategory(src.getCategory());
        p.setSubCategory(src.getSubCategory());
        p.setPrice(src.getPrice());
        p.setDiscountPrice(src.getDiscountPrice());
        p.setMetalType(src.getMetalType());
        p.setPurity(src.getPurity());
        p.setWeight(src.getWeight());
        p.setSize(src.getSize());
        p.setDiamondDetails(src.getDiamondDetails());
        p.setMakingCharges(src.getMakingCharges());
        p.setImageUrl(src.getImageUrl());
        p.setImages(src.getImages() == null ? new ArrayList<>() : new ArrayList<>(src.getImages()));
        p.setVideoUrl(src.getVideoUrl());
        p.setSku(null); // force new sku
        p.setTags(src.getTags() == null ? new ArrayList<>() : new ArrayList<>(src.getTags()));
        p.setFeatured(Boolean.TRUE.equals(src.getFeatured()));
        p.setIsActive(Boolean.TRUE.equals(src.getIsActive()));
        p.setStock(src.getStock() == null ? 0 : src.getStock());
        p.setCreatedAt(java.time.LocalDateTime.now());
        p.setUpdatedAt(java.time.LocalDateTime.now());

        Product saved = productRepository.save(p);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/products/{id}/status")
    public ResponseEntity<?> setProductStatus(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Product p = productRepository.findById(id).orElse(null);
        if (p == null) return ResponseEntity.status(404).body(Map.of("message", "Product not found"));
        if (!vendor.getId().equals(p.getVendorId())) return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));

        Boolean isActive = optBool(body, "isActive", p.getIsActive());
        p.setIsActive(isActive);
        p.setUpdatedAt(java.time.LocalDateTime.now());
        Product saved = productRepository.save(p);
        return ResponseEntity.ok(saved);
    }

    // -------------------------
    // Inventory
    // -------------------------

    @GetMapping("/inventory")
    public ResponseEntity<?> inventory(HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        List<Product> products = productRepository.findByVendorId(vendor.getId());
        List<Map<String, Object>> rows = products.stream().map(p -> Map.<String, Object>of(
                "id", p.getId(),
                "name", p.getName(),
                "sku", p.getSku(),
                "stock", p.getStock() == null ? 0 : p.getStock(),
                "lowStock", (p.getStock() != null && p.getStock() < LOW_STOCK_THRESHOLD),
                "isActive", p.getIsActive() != null && p.getIsActive(),
                "updatedAt", p.getUpdatedAt()
        )).collect(Collectors.toList());
        return ResponseEntity.ok(rows);
    }

    @PutMapping("/inventory/{productId}")
    public ResponseEntity<?> updateStock(@PathVariable String productId, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Product p = productRepository.findById(productId).orElse(null);
        if (p == null) return ResponseEntity.status(404).body(Map.of("message", "Product not found"));
        if (!vendor.getId().equals(p.getVendorId())) return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));

        int prev = p.getStock() == null ? 0 : p.getStock();
        Integer newStockObj = optInt(body, "stock", prev);
        int newStock = Math.max(0, newStockObj == null ? prev : newStockObj);

        p.setStock(newStock);
        p.setUpdatedAt(java.time.LocalDateTime.now());
        productRepository.save(p);

        StockLog log = new StockLog();
        log.setVendorId(vendor.getId());
        log.setProductId(p.getId());
        log.setPreviousStock(prev);
        log.setNewStock(newStock);
        log.setNote(optStr(body, "note", null));
        stockLogRepository.save(log);

        if (newStock < LOW_STOCK_THRESHOLD) {
            Notification n = new Notification();
            n.setVendorId(vendor.getId());
            n.setType("LOW_STOCK");
            n.setTitle("Low stock alert");
            n.setMessage((p.getName() == null ? "A product" : p.getName()) + " is low on stock (" + newStock + ").");
            notificationRepository.save(n);
        }

        return ResponseEntity.ok(Map.of("productId", p.getId(), "stock", newStock));
    }

    @GetMapping("/inventory/{productId}/logs")
    public ResponseEntity<?> stockLogs(@PathVariable String productId, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Product p = productRepository.findById(productId).orElse(null);
        if (p == null) return ResponseEntity.status(404).body(Map.of("message", "Product not found"));
        if (!vendor.getId().equals(p.getVendorId())) return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));

        return ResponseEntity.ok(stockLogRepository.findTop50ByVendorIdAndProductIdOrderByCreatedAtDesc(vendor.getId(), productId));
    }

    // -------------------------
    // Orders
    // -------------------------

    @GetMapping("/orders")
    public ResponseEntity<?> vendorOrders(HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        List<Order> orders = orderRepository.findAll();
        List<Map<String, Object>> rows = new ArrayList<>();

        for (Order o : orders) {
            if (o == null || o.getItems() == null) continue;
            User customer = (o.getUserId() == null) ? null : userRepository.findById(o.getUserId()).orElse(null);
            String customerName = customer != null ? customer.getName() : "Customer";

            for (Order.OrderItem item : o.getItems()) {
                if (item == null) continue;
                if (item.getVendorId() == null) continue;
                if (!vendor.getId().equals(item.getVendorId())) continue;

                rows.add(Map.of(
                        "orderId", o.getId(),
                        "productId", item.getProductId(),
                        "productName", item.getProductName(),
                        "customerName", customerName,
                        "quantity", item.getQuantity(),
                        "totalPrice", item.getTotal(),
                        "orderDate", o.getCreatedAt(),
                        "status", item.getItemStatus() == null ? "NEW" : item.getItemStatus(),
                        "paymentStatus", o.getPaymentStatus()
                ));
            }
        }

        rows.sort((a, b) -> {
            Object da = a.get("orderDate");
            Object db = b.get("orderDate");
            if (da == null && db == null) return 0;
            if (da == null) return 1;
            if (db == null) return -1;
            return String.valueOf(db).compareTo(String.valueOf(da));
        });

        return ResponseEntity.ok(rows);
    }

    @PutMapping("/orders/{orderId}/items/{productId}/status")
    public ResponseEntity<?> updateVendorOrderItemStatus(
            @PathVariable String orderId,
            @PathVariable String productId,
            @RequestBody Map<String, Object> body,
            HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Order o = orderRepository.findById(orderId).orElse(null);
        if (o == null) return ResponseEntity.status(404).body(Map.of("message", "Order not found"));
        if (o.getItems() == null) return ResponseEntity.badRequest().body(Map.of("message", "Order has no items"));

        String status = optStr(body, "status", null);
        if (status == null || status.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "status is required"));
        status = status.trim().toUpperCase();
        Set<String> allowed = Set.of("NEW", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED");
        if (!allowed.contains(status)) return ResponseEntity.badRequest().body(Map.of("message", "Invalid status"));

        boolean updated = false;
        for (Order.OrderItem item : o.getItems()) {
            if (item == null) continue;
            if (!Objects.equals(item.getProductId(), productId)) continue;
            if (!Objects.equals(item.getVendorId(), vendor.getId())) continue;
            item.setItemStatus(status);
            updated = true;
        }

        if (!updated) return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));

        orderRepository.save(o);
        return ResponseEntity.ok(Map.of("success", true, "status", status));
    }

    // -------------------------
    // Sales analytics
    // -------------------------

    @GetMapping("/sales")
    public ResponseEntity<?> sales(HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        List<Product> products = productRepository.findByVendorId(vendor.getId());
        List<Order> orders = orderRepository.findAll();

        long totalProducts = products.size();
        long lowStockAlerts = products.stream().filter(p -> (p.getStock() != null && p.getStock() < LOW_STOCK_THRESHOLD)).count();

        BigDecimal totalRevenue = BigDecimal.ZERO;
        long totalOrderLines = 0;
        long pendingOrderLines = 0;

        Map<String, Long> productSalesQty = new HashMap<>();
        Map<String, BigDecimal> productSalesRevenue = new HashMap<>();
        Map<String, BigDecimal> monthlyRevenue = new HashMap<>(); // YYYY-MM

        for (Order o : orders) {
            if (o == null || o.getItems() == null) continue;
            boolean paid = "PAID".equalsIgnoreCase(o.getPaymentStatus());
            for (Order.OrderItem item : o.getItems()) {
                if (item == null) continue;
                if (!vendor.getId().equals(item.getVendorId())) continue;
                totalOrderLines++;
                String itemStatus = item.getItemStatus() == null ? "NEW" : item.getItemStatus();
                if (Set.of("NEW", "PROCESSING").contains(itemStatus.toUpperCase())) pendingOrderLines++;

                int qty = item.getQuantity() == null ? 0 : item.getQuantity();
                BigDecimal lineTotal = item.getTotal() == null ? BigDecimal.ZERO : item.getTotal();

                if (paid) {
                    totalRevenue = totalRevenue.add(lineTotal);
                    productSalesQty.put(item.getProductId(), productSalesQty.getOrDefault(item.getProductId(), 0L) + qty);
                    productSalesRevenue.put(item.getProductId(), productSalesRevenue.getOrDefault(item.getProductId(), BigDecimal.ZERO).add(lineTotal));

                    if (o.getCreatedAt() != null) {
                        LocalDate d = o.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
                        String key = d.getYear() + "-" + String.format("%02d", d.getMonthValue());
                        monthlyRevenue.put(key, monthlyRevenue.getOrDefault(key, BigDecimal.ZERO).add(lineTotal));
                    }
                }
            }
        }

        // top selling product by qty
        String topProductId = productSalesQty.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
        Product topProduct = (topProductId == null) ? null : productRepository.findById(topProductId).orElse(null);

        List<Map<String, Object>> topProducts = productSalesRevenue.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .limit(5)
                .map(e -> {
                    Product p = productRepository.findById(e.getKey()).orElse(null);
                    return Map.<String, Object>of(
                            "productId", e.getKey(),
                            "name", p != null ? p.getName() : "Product",
                            "revenue", e.getValue(),
                            "qty", productSalesQty.getOrDefault(e.getKey(), 0L)
                    );
                })
                .collect(Collectors.toList());

        List<Map<String, Object>> monthly = monthlyRevenue.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> Map.<String, Object>of("month", e.getKey(), "revenue", e.getValue()))
                .collect(Collectors.toList());

        Map<String, Object> resp = new HashMap<>();
        resp.put("totalProducts", totalProducts);
        resp.put("totalOrders", totalOrderLines);
        resp.put("totalRevenue", totalRevenue);
        resp.put("pendingOrders", pendingOrderLines);
        resp.put("lowStockAlerts", lowStockAlerts);
        resp.put("topSellingProduct", topProduct == null ? null : Map.of(
                "id", topProduct.getId(),
                "name", topProduct.getName(),
                "qty", productSalesQty.getOrDefault(topProduct.getId(), 0L),
                "revenue", productSalesRevenue.getOrDefault(topProduct.getId(), BigDecimal.ZERO)
        ));
        resp.put("monthlyRevenue", monthly);
        resp.put("topProducts", topProducts);

        return ResponseEntity.ok(resp);
    }

    // -------------------------
    // Helpers
    // -------------------------

    private User requireVendor(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        String userId = (String) session.getAttribute(AuthController.SESSION_USER_ID);
        if (userId == null || userId.isBlank()) return null;
        User u = userService.findById(userId).orElse(null);
        if (u == null) return null;
        if (u.getRole() == null || !"VENDOR".equalsIgnoreCase(u.getRole().trim())) return null;
        if (Boolean.TRUE.equals(u.getDisabled())) return null;
        return u;
    }

    private Map<String, Object> safeVendor(User u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("vendorName", u.getName());
        m.put("companyName", u.getCompanyName());
        m.put("email", u.getEmail());
        m.put("phone", u.getPhone());
        m.put("businessAddress", u.getBusinessAddress());
        m.put("bankDetails", u.getBankDetails());
        return m;
    }

    private void applyProductFields(Product p, Map<String, Object> body) {
        if (body == null) return;
        p.setName(optStr(body, "name", p.getName()));
        p.setCategory(optStr(body, "category", p.getCategory()));
        p.setSubCategory(optStr(body, "subCategory", p.getSubCategory()));
        p.setDescription(optStr(body, "description", p.getDescription()));

        p.setPrice(optMoney(body, "price", p.getPrice()));
        p.setDiscountPrice(optMoney(body, "discountPrice", p.getDiscountPrice()));
        p.setMakingCharges(optMoney(body, "makingCharges", p.getMakingCharges()));
        p.setWeight(optMoney(body, "weight", p.getWeight()));

        p.setMetalType(optStr(body, "metalType", p.getMetalType()));
        p.setPurity(optStr(body, "purity", p.getPurity()));
        p.setSize(optStr(body, "size", p.getSize()));
        p.setDiamondDetails(optStr(body, "diamondDetails", p.getDiamondDetails()));

        p.setStock(optInt(body, "stock", p.getStock()));
        p.setSku(optStr(body, "sku", p.getSku()));
        p.setVideoUrl(optStr(body, "videoUrl", p.getVideoUrl()));
        p.setFeatured(optBool(body, "featured", p.getFeatured()));
        p.setIsActive(optBool(body, "isActive", p.getIsActive()));

        // Accept either imageUrl or images[]
        String imageUrl = optStr(body, "imageUrl", p.getImageUrl());
        p.setImageUrl(imageUrl);

        Object imagesObj = body.get("images");
        if (imagesObj instanceof List<?> list) {
            List<String> imgs = list.stream().filter(Objects::nonNull).map(String::valueOf).map(String::trim).filter(s -> !s.isBlank()).toList();
            p.setImages(new ArrayList<>(imgs));
        }

        Object tagsObj = body.get("tags");
        if (tagsObj instanceof List<?> list) {
            List<String> t = list.stream().filter(Objects::nonNull).map(String::valueOf).map(String::trim).filter(s -> !s.isBlank()).toList();
            p.setTags(new ArrayList<>(t));
        }
    }

    private static String optStr(Map<String, Object> m, String k, String def) {
        Object v = m.get(k);
        if (v == null) return def;
        String s = String.valueOf(v).trim();
        return s.isBlank() ? def : s;
    }

    private static Integer optInt(Map<String, Object> m, String k, Integer def) {
        Object v = m.get(k);
        if (v == null) return def;
        try { return Integer.parseInt(String.valueOf(v)); } catch (Exception e) { return def; }
    }

    private static Boolean optBool(Map<String, Object> m, String k, Boolean def) {
        Object v = m.get(k);
        if (v == null) return def;
        return Boolean.parseBoolean(String.valueOf(v));
    }

    private static BigDecimal optMoney(Map<String, Object> m, String k, BigDecimal def) {
        Object v = m.get(k);
        if (v == null) return def;
        try { return new BigDecimal(String.valueOf(v)); } catch (Exception e) { return def; }
    }
}

