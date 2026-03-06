package com.luxejewels.service;

import com.luxejewels.model.CartItem;
import com.luxejewels.model.Product;
import com.luxejewels.repository.CartRepository;
import com.luxejewels.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Cart Service
 * Business logic for shopping cart operations
 */
@Service
public class CartService {

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private ProductRepository productRepository;

    /**
     * Get all cart items for user
     */
    public List<CartItem> getCartItems(String userId) {
        List<CartItem> items = cartRepository.findByUserId(userId);
        // Defensive hydration: DBRef may be null in older documents
        for (CartItem item : items) {
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
     * Add item to cart
     */
    public CartItem addToCart(String userId, String productId, Integer quantity) {
        if (productId == null || productId.isBlank()) {
            throw new RuntimeException("productId is required");
        }
        int qtyToAdd = (quantity == null) ? 1 : quantity;
        if (qtyToAdd <= 0) {
            throw new RuntimeException("Quantity must be greater than 0");
        }

        // Check if product exists
        Optional<Product> product = productRepository.findById(productId);
        if (product.isEmpty()) {
            throw new RuntimeException("Product not found");
        }
        Product p = product.get();
        if (Boolean.FALSE.equals(p.getIsActive())) {
            throw new RuntimeException("Product is not available");
        }
        int availableStock = (p.getStock() == null) ? 0 : p.getStock();
        if (availableStock <= 0) {
            throw new RuntimeException("Product is out of stock");
        }

        // Check if item already exists in cart
        Optional<CartItem> existingItem = cartRepository.findByUserIdAndProductId(userId, productId);
        if (existingItem.isEmpty()) {
            // Backward-compat: older documents used DBRef-only
            existingItem = cartRepository.findByUserIdAndProduct_Id(userId, productId);
        }
        
        if (existingItem.isPresent()) {
            // Update quantity
            CartItem item = existingItem.get();
            int currentQty = (item.getQuantity() == null) ? 0 : item.getQuantity();
            int newQty = currentQty + qtyToAdd;
            if (newQty > availableStock) {
                newQty = availableStock; // clamp to stock
            }
            item.setQuantity(newQty);
            // Ensure stable references are set
            item.setProductId(productId);
            if (item.getProduct() == null) {
                item.setProduct(p);
            }
            return cartRepository.save(item);
        } else {
            // Create new cart item
            CartItem cartItem = new CartItem();
            cartItem.setUserId(userId);
            cartItem.setProductId(productId);
            cartItem.setProduct(p);
            cartItem.setQuantity(Math.min(qtyToAdd, availableStock));
            return cartRepository.save(cartItem);
        }
    }

    /**
     * Update cart item quantity
     */
    public CartItem updateQuantity(String userId, String cartItemId, Integer quantity) {
        Optional<CartItem> cartItem = cartRepository.findById(cartItemId);
        if (cartItem.isEmpty()) {
            throw new RuntimeException("Cart item not found");
        }
        if (userId == null || !userId.equals(cartItem.get().getUserId())) {
            throw new RuntimeException("Forbidden");
        }

        int newQty = (quantity == null) ? 0 : quantity;
        if (newQty <= 0) {
            cartRepository.deleteById(cartItemId);
            return null;
        }

        CartItem item = cartItem.get();

        // Resolve productId (DBRef may be null)
        String productId = item.getProductId();
        if ((productId == null || productId.isBlank()) && item.getProduct() != null) {
            productId = item.getProduct().getId();
            item.setProductId(productId);
        }
        if (productId == null || productId.isBlank()) {
            // orphan cart item, remove safely
            cartRepository.deleteById(cartItemId);
            return null;
        }

        Product p = productRepository.findById(productId).orElse(null);
        if (p == null || Boolean.FALSE.equals(p.getIsActive())) {
            // product removed/unavailable -> remove item
            cartRepository.deleteById(cartItemId);
            return null;
        }
        int availableStock = (p.getStock() == null) ? 0 : p.getStock();
        if (availableStock <= 0) {
            cartRepository.deleteById(cartItemId);
            return null;
        }

        if (newQty > availableStock) {
            newQty = availableStock;
        }

        item.setQuantity(newQty);
        if (item.getProduct() == null) {
            item.setProduct(p);
        }
        return cartRepository.save(cartItem.get());
    }

    /**
     * Remove item from cart
     */
    public void removeFromCart(String userId, String cartItemId) {
        Optional<CartItem> existing = cartRepository.findById(cartItemId);
        if (existing.isEmpty()) {
            return;
        }
        if (userId == null || !userId.equals(existing.get().getUserId())) {
            throw new RuntimeException("Forbidden");
        }
        cartRepository.deleteById(cartItemId);
    }

    /**
     * Clear user's cart
     */
    public void clearCart(String userId) {
        cartRepository.deleteByUserId(userId);
    }
}
