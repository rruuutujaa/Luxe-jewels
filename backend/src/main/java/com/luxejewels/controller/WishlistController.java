package com.luxejewels.controller;

import com.luxejewels.model.WishlistItem;
import com.luxejewels.model.Product;
import com.luxejewels.service.WishlistService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Wishlist Controller
 * Handles wishlist API endpoints
 */
@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    @Autowired
    private WishlistService wishlistService;

    /**
     * Get wishlist items for logged-in user
     * GET /api/wishlist
     */
    @GetMapping
    public ResponseEntity<?> getWishlistItems(HttpServletRequest request) {
        try {
            String userId = getUserIdFromSession(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
            }

            List<WishlistItem> items = wishlistService.getWishlistItems(userId);
            return ResponseEntity.ok(toWishlistDtos(items));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to fetch wishlist items"));
        }
    }

    /**
     * Add item to wishlist
     * POST /api/wishlist
     * POST /api/wishlist/add (backward compatible)
     */
    @PostMapping
    public ResponseEntity<?> addToWishlistV2(
            @RequestBody Map<String, String> requestBody,
            HttpServletRequest request) {
        return addToWishlist(requestBody, request);
    }

    @PostMapping("/add")
    public ResponseEntity<?> addToWishlist(
            @RequestBody Map<String, String> requestBody,
            HttpServletRequest request) {
        try {
            String userId = getUserIdFromSession(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
            }

            String productId = requestBody.get("productId");
            WishlistItem wishlistItem = wishlistService.addToWishlist(userId, productId);
            return ResponseEntity.ok(toWishlistDto(wishlistItem));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to add to wishlist: " + e.getMessage()));
        }
    }

    /**
     * Remove item from wishlist
     * DELETE /api/wishlist/{wishlistItemId}
     * DELETE /api/wishlist/remove/{wishlistItemId} (backward compatible)
     */
    @DeleteMapping("/{wishlistItemId}")
    public ResponseEntity<?> removeFromWishlistV2(
            @PathVariable String wishlistItemId,
            HttpServletRequest request) {
        return removeFromWishlist(wishlistItemId, request);
    }

    @DeleteMapping("/remove/{wishlistItemId}")
    public ResponseEntity<?> removeFromWishlist(
            @PathVariable String wishlistItemId,
            HttpServletRequest request) {
        try {
            String userId = getUserIdFromSession(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
            }

            wishlistService.removeFromWishlist(wishlistItemId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to remove item: " + e.getMessage()));
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

    private List<Map<String, Object>> toWishlistDtos(List<WishlistItem> items) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (items == null) return out;
        for (WishlistItem item : items) {
            if (item == null) continue;
            out.add(toWishlistDto(item));
        }
        return out;
    }

    private Map<String, Object> toWishlistDto(WishlistItem item) {
        Product p = item.getProduct();
        return Map.of(
                "id", item.getId(),
                "productId", item.getProductId() != null ? item.getProductId() : (p != null ? p.getId() : null),
                "product", p == null ? null : Map.of(
                        "id", p.getId(),
                        "name", p.getName(),
                        "price", p.getPrice(),
                        "imageUrl", p.getImageUrl(),
                        "category", p.getCategory()
                )
        );
    }
}
