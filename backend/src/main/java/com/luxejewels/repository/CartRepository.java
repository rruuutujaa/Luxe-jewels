package com.luxejewels.repository;

import com.luxejewels.model.CartItem;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

/**
 * Cart Repository - Data access layer for CartItem entity
 * Provides methods to interact with cart collection in MongoDB
 */
@Repository
public interface CartRepository extends MongoRepository<CartItem, String> {
    /**
     * Find all cart items for a user
     * @param userId User ID
     * @return List of cart items
     */
    List<CartItem> findByUserId(String userId);

    /**
     * Find cart item by user and product
     * Note: This method finds by userId and product.id
     * @param userId User ID
     * @param productId Product ID
     * @return Optional CartItem
     */
    Optional<CartItem> findByUserIdAndProduct_Id(String userId, String productId);

    /**
     * Find cart item by userId and productId (string field)
     */
    Optional<CartItem> findByUserIdAndProductId(String userId, String productId);

    /**
     * Delete all cart items for a user
     * @param userId User ID
     */
    void deleteByUserId(String userId);
}
