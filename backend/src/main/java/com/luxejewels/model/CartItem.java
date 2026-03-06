package com.luxejewels.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DBRef;

/**
 * CartItem Model - Represents an item in user's shopping cart
 * Stored in MongoDB collection "cart"
 */
@Document(collection = "cart")
public class CartItem {
    @Id
    private String id;
    private String userId; // Reference to user
    /**
     * Stable product reference stored as a plain string.
     * This prevents DBRef loading issues and makes queries consistent.
     */
    private String productId;
    @DBRef
    private Product product; // Optional DBRef (may be null)
    private Integer quantity;

    // Constructors
    public CartItem() {
        this.quantity = 1;
    }

    public CartItem(String userId, Product product, Integer quantity) {
        this();
        this.userId = userId;
        this.product = product;
        this.quantity = quantity;
    }

    // Getters and Setters
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }
}
