package com.luxejewels.service;

import com.luxejewels.model.WishlistItem;
import com.luxejewels.model.Product;
import com.luxejewels.repository.WishlistRepository;
import com.luxejewels.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Wishlist Service
 * Business logic for wishlist operations
 */
@Service
public class WishlistService {

    @Autowired
    private WishlistRepository wishlistRepository;

    @Autowired
    private ProductRepository productRepository;

    /**
     * Get all wishlist items for user
     */
    public List<WishlistItem> getWishlistItems(String userId) {
        List<WishlistItem> items = wishlistRepository.findByUserId(userId);
        // Defensive hydration: DBRef may be null in older documents
        for (WishlistItem item : items) {
            if (item == null) continue;
            if (item.getProductId() == null && item.getProduct() != null) {
                item.setProductId(item.getProduct().getId());
            }
            if (item.getProduct() == null && item.getProductId() != null) {
                productRepository.findById(item.getProductId()).ifPresent(item::setProduct);
            }
        }
        return items;
    }

    /**
     * Add item to wishlist
     */
    public WishlistItem addToWishlist(String userId, String productId) {
        if (productId == null || productId.isBlank()) {
            throw new RuntimeException("productId is required");
        }
        // Check if product exists
        Optional<Product> product = productRepository.findById(productId);
        if (product.isEmpty()) {
            throw new RuntimeException("Product not found");
        }

        // Check if item already exists in wishlist (prefer stable productId field)
        if (wishlistRepository.existsByUserIdAndProductId(userId, productId)
                || wishlistRepository.existsByUserIdAndProduct_Id(userId, productId)) {
            // Idempotent add: return existing item instead of creating duplicates
            return wishlistRepository.findByUserIdAndProductId(userId, productId)
                    .or(() -> wishlistRepository.findByUserIdAndProduct_Id(userId, productId))
                    .orElseThrow(() -> new RuntimeException("Product already in wishlist"));
        }

        // Create new wishlist item
        WishlistItem wishlistItem = new WishlistItem();
        wishlistItem.setUserId(userId);
        wishlistItem.setProductId(productId);
        wishlistItem.setProduct(product.get());
        return wishlistRepository.save(wishlistItem);
    }

    /**
     * Remove item from wishlist
     */
    public void removeFromWishlist(String wishlistItemId) {
        wishlistRepository.deleteById(wishlistItemId);
    }

    /**
     * Check if product is in wishlist
     */
    public boolean isInWishlist(String userId, String productId) {
        return wishlistRepository.existsByUserIdAndProductId(userId, productId)
                || wishlistRepository.existsByUserIdAndProduct_Id(userId, productId);
    }
}
