package com.luxejewels.controller;

import com.luxejewels.model.Product;
import com.luxejewels.security.JwtUtil;
import com.luxejewels.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Product Controller
 * Handles product-related API endpoints
 */
@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * Get all products
     * GET /api/products
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllProducts() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Product> products = productService.getAllProducts();
            response.put("success", true);
            response.put("products", products);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to fetch products");
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Get product by ID
     * GET /api/products/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getProductById(@PathVariable String id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<Product> product = productService.getProductById(id);
            if (product.isPresent()) {
                response.put("success", true);
                response.put("product", product.get());
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "Product not found");
                return ResponseEntity.status(404).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to fetch product");
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Create new product (Admin only)
     * POST /api/products
     */
    @PostMapping
    public ResponseEntity<Map<String, Object>> createProduct(
            @RequestBody Product product,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            // Validate authentication (basic check - can be enhanced with role-based access)
            String token = extractToken(request);
            if (token == null || !jwtUtil.validateToken(token)) {
                response.put("success", false);
                response.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(response);
            }
            if (!isAdmin(token)) {
                response.put("success", false);
                response.put("message", "Forbidden");
                return ResponseEntity.status(403).body(response);
            }

            Product createdProduct = productService.createProduct(product);
            response.put("success", true);
            response.put("message", "Product created successfully");
            response.put("product", createdProduct);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to create product: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Update product (Admin only)
     * PUT /api/products/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateProduct(
            @PathVariable String id,
            @RequestBody Product product,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String token = extractToken(request);
            if (token == null || !jwtUtil.validateToken(token)) {
                response.put("success", false);
                response.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(response);
            }
            if (!isAdmin(token)) {
                response.put("success", false);
                response.put("message", "Forbidden");
                return ResponseEntity.status(403).body(response);
            }
            product.setId(id);
            Product updated = productService.updateProduct(product);
            response.put("success", true);
            response.put("message", "Product updated successfully");
            response.put("product", updated);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to update product: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Deactivate product (Admin only) - soft delete
     * DELETE /api/products/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteProduct(
            @PathVariable String id,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String token = extractToken(request);
            if (token == null || !jwtUtil.validateToken(token)) {
                response.put("success", false);
                response.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(response);
            }
            if (!isAdmin(token)) {
                response.put("success", false);
                response.put("message", "Forbidden");
                return ResponseEntity.status(403).body(response);
            }
            productService.deleteProduct(id);
            response.put("success", true);
            response.put("message", "Product deactivated successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to delete product: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Extract JWT token from request
     */
    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }

    private boolean isAdmin(String token) {
        String role = jwtUtil.getRoleFromToken(token);
        return role != null && "ADMIN".equalsIgnoreCase(role.trim());
    }
}
