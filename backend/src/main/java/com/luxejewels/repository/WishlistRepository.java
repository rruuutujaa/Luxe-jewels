package com.luxejewels.repository;

import com.luxejewels.model.WishlistItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

/**
 * Wishlist Repository - Data access layer for WishlistItem entity
 * Provides methods to interact with wishlist collection in MongoDB
 */
@Repository
public interface WishlistRepository extends MongoRepository<WishlistItem, String> {
    /**
     * Find all wishlist items for a user
     * @param userId User ID
     * @return List of wishlist items
     */
    List<WishlistItem> findByUserId(String userId);

    /**
     * Find wishlist item by user and product
     * Note: This method finds by userId and product.id
     * @param userId User ID
     * @param productId Product ID
     * @return Optional WishlistItem
     */
    Optional<WishlistItem> findByUserIdAndProduct_Id(String userId, String productId);

    /**
     * Check if product exists in user's wishlist
     * Note: This method checks by userId and product.id
     * @param userId User ID
     * @param productId Product ID
     * @return true if exists, false otherwise
     */
    boolean existsByUserIdAndProduct_Id(String userId, String productId);

    Optional<WishlistItem> findByUserIdAndProductId(String userId, String productId);

    boolean existsByUserIdAndProductId(String userId, String productId);
}
