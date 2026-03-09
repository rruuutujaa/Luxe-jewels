package com.luxejewels.controller;

import com.luxejewels.model.CartItem;
import com.luxejewels.model.Product;
import com.luxejewels.service.CartService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;

/**
 * Cart Controller
 * Handles shopping cart API endpoints
 */
@RestController
@RequestMapping("/api/cart")
public class CartController {

    @Autowired
    private CartService cartService;

    /**
     * Get cart items for logged-in user
     * GET /api/cart
     */
    @GetMapping
    public ResponseEntity<?> getCartItems(HttpServletRequest request) {
        try {
            String userId = getUserIdFromSession(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
            }

            List<CartItem> items = cartService.getCartItems(userId);
            return ResponseEntity.ok(toCartDtos(items));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to fetch cart items"));
        }
    }

    /**
     * Add item to cart
     * POST /api/cart
     * POST /api/cart/add (backward compatible)
     */
    @PostMapping
    public ResponseEntity<?> addToCartV2(
            @RequestBody Map<String, Object> requestBody,
            HttpServletRequest request) {
        return addToCart(requestBody, request);
    }

    @PostMapping("/add")
    public ResponseEntity<?> addToCart(
            @RequestBody Map<String, Object> requestBody,
            HttpServletRequest request) {
        try {
            String userId = getUserIdFromSession(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
            }

            String productId = (String) requestBody.get("productId");
            Integer quantity = requestBody.get("quantity") != null ?
                    Integer.parseInt(requestBody.get("quantity").toString()) : 1;

            CartItem cartItem = cartService.addToCart(userId, productId, quantity);
            return ResponseEntity.ok(toCartDto(cartItem));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to add to cart: " + e.getMessage()));
        }
    }

    /**
     * Update cart item quantity
     * PUT /api/cart/update/{cartItemId}
     */
    @PutMapping("/update/{cartItemId}")
    public ResponseEntity<?> updateQuantity(
            @PathVariable String cartItemId,
            @RequestBody Map<String, Object> requestBody,
            HttpServletRequest request) {
        try {
            String userId = getUserIdFromSession(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
            }

            Integer quantity = Integer.parseInt(requestBody.get("quantity").toString());
            CartItem cartItem = cartService.updateQuantity(userId, cartItemId, quantity);

            if (cartItem == null) {
                return ResponseEntity.ok(Map.of("removed", true));
            } else {
                return ResponseEntity.ok(toCartDto(cartItem));
            }
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to update cart: " + e.getMessage()));
        }
    }

    /**
     * Remove item from cart
     * DELETE /api/cart/{cartItemId}
     * DELETE /api/cart/remove/{cartItemId} (backward compatible)
     */
    @DeleteMapping("/{cartItemId}")
    public ResponseEntity<?> removeFromCartV2(
            @PathVariable String cartItemId,
            HttpServletRequest request) {
        return removeFromCart(cartItemId, request);
    }

    @DeleteMapping("/remove/{cartItemId}")
    public ResponseEntity<?> removeFromCart(
            @PathVariable String cartItemId,
            HttpServletRequest request) {
        try {
            String userId = getUserIdFromSession(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
            }

            cartService.removeFromCart(userId, cartItemId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to remove item: " + e.getMessage()));
        }
    }

    /**
     * Clear all items from user's cart
     * DELETE /api/cart/clear
     */
    @DeleteMapping("/clear")
    public ResponseEntity<?> clearCart(HttpServletRequest request) {
        try {
            String userId = getUserIdFromSession(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
            }
            cartService.clearCart(userId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to clear cart: " + e.getMessage()));
        }
    }

    /**
     * Get user ID from HttpSession
     */
    private String getUserIdFromSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        String userId = (String) session.getAttribute(AuthController.SESSION_USER_ID);
        return (userId == null || userId.isBlank()) ? null : userId;
    }

    private List<Map<String, Object>> toCartDtos(List<CartItem> items) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (items == null) return out;
        for (CartItem item : items) {
            if (item == null) continue;
            out.add(toCartDto(item));
        }
        return out;
    }

    private Map<String, Object> toCartDto(CartItem item) {
        Product p = item.getProduct();
        BigDecimal price = (p == null || p.getPrice() == null) ? BigDecimal.ZERO : p.getPrice();
        int qty = item.getQuantity() == null ? 0 : item.getQuantity();
        BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(qty));
        return Map.of(
                "id", item.getId(),
                "productId", item.getProductId() != null ? item.getProductId() : (p != null ? p.getId() : null),
                "quantity", qty,
                "product", p == null ? null : Map.of(
                        "id", p.getId(),
                        "name", p.getName(),
                        "price", p.getPrice(),
                        "imageUrl", p.getImageUrl(),
                        "category", p.getCategory()
                ),
                "lineTotal", lineTotal
        );
    }
}
