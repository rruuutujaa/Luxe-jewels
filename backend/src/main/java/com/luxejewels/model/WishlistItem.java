package com.luxejewels.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.index.CompoundIndex;

/**
 * WishlistItem Model - Represents an item in user's wishlist
 * Stored in MongoDB collection "wishlist"
 */
@Document(collection = "wishlist")
@CompoundIndex(name = "uniq_user_product", def = "{'userId': 1, 'productId': 1}", unique = true)
public class WishlistItem {
    @Id
    private String id;
    private String userId; // Reference to user
    /**
     * Stable product reference stored as a plain string.
     * Used for consistent querying + unique index.
     */
    private String productId;
    @DBRef
    private Product product; // Optional DBRef (may be null)

    // Constructors
    public WishlistItem() {
    }

    public WishlistItem(String userId, Product product) {
        this.userId = userId;
        this.product = product;
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
}
