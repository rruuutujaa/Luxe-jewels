package com.luxejewels.controller;

import com.luxejewels.model.CartItem;
import com.luxejewels.security.JwtUtil;
import com.luxejewels.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Cart Controller
 * Handles shopping cart API endpoints
 */
@RestController
@RequestMapping("/api/cart")
@CrossOrigin(origins = "*")
public class CartController {

    @Autowired
    private CartService cartService;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * Get cart items for logged-in user
     * GET /api/cart
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getCartItems(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userId = getUserIdFromToken(request);
            if (userId == null) {
                response.put("success", false);
                response.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(response);
            }

            List<CartItem> items = cartService.getCartItems(userId);
            response.put("success", true);
            response.put("items", items);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to fetch cart items");
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Add item to cart
     * POST /api/cart/add
     */
    @PostMapping("/add")
    public ResponseEntity<Map<String, Object>> addToCart(
            @RequestBody Map<String, Object> requestBody,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userId = getUserIdFromToken(request);
            if (userId == null) {
                response.put("success", false);
                response.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(response);
            }

            String productId = (String) requestBody.get("productId");
            Integer quantity = requestBody.get("quantity") != null ?
                    Integer.parseInt(requestBody.get("quantity").toString()) : 1;

            CartItem cartItem = cartService.addToCart(userId, productId, quantity);
            response.put("success", true);
            response.put("message", "Item added to cart");
            response.put("item", cartItem);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to add to cart: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Update cart item quantity
     * PUT /api/cart/update/{cartItemId}
     */
    @PutMapping("/update/{cartItemId}")
    public ResponseEntity<Map<String, Object>> updateQuantity(
            @PathVariable String cartItemId,
            @RequestBody Map<String, Object> requestBody,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userId = getUserIdFromToken(request);
            if (userId == null) {
                response.put("success", false);
                response.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(response);
            }

            Integer quantity = Integer.parseInt(requestBody.get("quantity").toString());
            CartItem cartItem = cartService.updateQuantity(userId, cartItemId, quantity);

            if (cartItem == null) {
                response.put("success", true);
                response.put("message", "Item removed from cart");
            } else {
                response.put("success", true);
                response.put("message", "Cart updated");
                response.put("item", cartItem);
            }
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to update cart: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Remove item from cart
     * DELETE /api/cart/remove/{cartItemId}
     */
    @DeleteMapping("/remove/{cartItemId}")
    public ResponseEntity<Map<String, Object>> removeFromCart(
            @PathVariable String cartItemId,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userId = getUserIdFromToken(request);
            if (userId == null) {
                response.put("success", false);
                response.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(response);
            }

            cartService.removeFromCart(userId, cartItemId);
            response.put("success", true);
            response.put("message", "Item removed from cart");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to remove item: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Clear all items from user's cart
     * DELETE /api/cart/clear
     */
    @DeleteMapping("/clear")
    public ResponseEntity<Map<String, Object>> clearCart(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userId = getUserIdFromToken(request);
            if (userId == null) {
                response.put("success", false);
                response.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(response);
            }
            cartService.clearCart(userId);
            response.put("success", true);
            response.put("message", "Cart cleared");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to clear cart: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Get user ID from JWT token
     */
    private String getUserIdFromToken(HttpServletRequest request) {
        String token = extractToken(request);
        if (token != null && jwtUtil.validateToken(token)) {
            return jwtUtil.getUserIdFromToken(token);
        }
        return null;
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
}
