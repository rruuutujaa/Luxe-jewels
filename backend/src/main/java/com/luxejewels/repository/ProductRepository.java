package com.luxejewels.repository;

import com.luxejewels.model.Product;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

/**
 * Product Repository - Data access layer for Product entity
 * Provides methods to interact with products collection in MongoDB
 */
@Repository
public interface ProductRepository extends MongoRepository<Product, String> {
    /**
     * Find all active products
     * @param isActive Product active status
     * @return List of active products
     */
    List<Product> findByIsActive(Boolean isActive);

    /**
     * Find products by category
     * @param category Product category
     * @return List of products in the category
     */
    List<Product> findByCategory(String category);

    /**
     * Find active products by category (case insensitive)
     * @param category Product category
     * @param isActive Product active status
     * @return List of active products in the category
     */
    List<Product> findByCategoryIgnoreCaseAndIsActive(String category, Boolean isActive);

    List<Product> findByStockLessThanAndIsActive(Integer stock, Boolean isActive);

    long countByIsActiveTrue();
    long countByStockEquals(Integer stock);
    long countByStockLessThan(Integer stock);

    List<Product> findByIsActiveTrueAndStockGreaterThan(Integer stock);
    List<Product> findByCategoryIgnoreCaseAndIsActiveTrueAndStockGreaterThan(String category, Integer stock);
}
