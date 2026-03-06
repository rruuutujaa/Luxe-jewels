package com.luxejewels.controller;

import com.luxejewels.model.WishlistItem;
import com.luxejewels.security.JwtUtil;
import com.luxejewels.service.WishlistService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Wishlist Controller
 * Handles wishlist API endpoints
 */
@RestController
@RequestMapping("/api/wishlist")
@CrossOrigin(origins = "*")
public class WishlistController {

    @Autowired
    private WishlistService wishlistService;

    @Autowired
    private JwtUtil jwtUtil;

    /**
     * Get wishlist items for logged-in user
     * GET /api/wishlist
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getWishlistItems(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userId = getUserIdFromToken(request);
            if (userId == null) {
                response.put("success", false);
                response.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(response);
            }

            List<WishlistItem> items = wishlistService.getWishlistItems(userId);
            response.put("success", true);
            response.put("items", items);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to fetch wishlist items");
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Add item to wishlist
     * POST /api/wishlist/add
     */
    @PostMapping("/add")
    public ResponseEntity<Map<String, Object>> addToWishlist(
            @RequestBody Map<String, String> requestBody,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userId = getUserIdFromToken(request);
            if (userId == null) {
                response.put("success", false);
                response.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(response);
            }

            String productId = requestBody.get("productId");
            WishlistItem wishlistItem = wishlistService.addToWishlist(userId, productId);
            response.put("success", true);
            response.put("message", "Item added to wishlist");
            response.put("item", wishlistItem);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to add to wishlist: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Remove item from wishlist
     * DELETE /api/wishlist/remove/{wishlistItemId}
     */
    @DeleteMapping("/remove/{wishlistItemId}")
    public ResponseEntity<Map<String, Object>> removeFromWishlist(
            @PathVariable String wishlistItemId,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userId = getUserIdFromToken(request);
            if (userId == null) {
                response.put("success", false);
                response.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(response);
            }

            wishlistService.removeFromWishlist(wishlistItemId);
            response.put("success", true);
            response.put("message", "Item removed from wishlist");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to remove item: " + e.getMessage());
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
