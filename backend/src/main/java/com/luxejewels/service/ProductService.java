package com.luxejewels.service;

import com.luxejewels.model.Product;
import com.luxejewels.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Product Service
 * Business logic for product operations
 */
@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    /**
     * Get all active products with stock > 0
     */
    public List<Product> getAllProducts() {
        return productRepository.findByIsActiveTrueAndStockGreaterThan(0);
    }

    /**
     * Get product by ID
     */
    public Optional<Product> getProductById(String id) {
        return productRepository.findById(id);
    }

    /**
     * Get products by category with stock > 0
     */
    public List<Product> getProductsByCategory(String category) {
        if (category == null || category.trim().isEmpty()) {
            return getAllProducts();
        }
        return productRepository.findByCategoryIgnoreCaseAndIsActiveTrueAndStockGreaterThan(category.trim(), 0);
    }

    /**
     * Create new product (admin function)
     */
    public Product createProduct(Product product) {
        return productRepository.save(product);
    }

    /**
     * Update product
     */
    public Product updateProduct(Product product) {
        return productRepository.save(product);
    }

    /**
     * Delete product (soft delete)
     */
    public void deleteProduct(String id) {
        Optional<Product> product = productRepository.findById(id);
        if (product.isPresent()) {
            product.get().setIsActive(false);
            productRepository.save(product.get());
        }
    }
}
