package com.luxejewels.repository;

import com.luxejewels.model.Order;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * Order Repository - Data access layer for Order entity
 * Provides methods to interact with orders collection in MongoDB
 */
@Repository
public interface OrderRepository extends MongoRepository<Order, String> {
    /**
     * Find all orders for a user
     * @param userId User ID
     * @return List of orders
     */
    List<Order> findByUserId(String userId);
}
