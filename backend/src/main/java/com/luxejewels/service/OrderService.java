package com.luxejewels.service;

import com.luxejewels.model.CartItem;
import com.luxejewels.model.Notification;
import com.luxejewels.model.Order;
import com.luxejewels.model.Product;
import com.luxejewels.repository.CartRepository;
import com.luxejewels.repository.NotificationRepository;
import com.luxejewels.repository.OrderRepository;
import com.luxejewels.repository.ProductRepository;
import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.Charge;
import com.stripe.param.ChargeCreateParams;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Order Service
 * Business logic for order operations
 */
@Service
public class OrderService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CouponService couponService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Value("${app.stripe.secretKey:}")
    private String stripeSecretKey;

    /**
     * Create order from cart
     */
    public Order createOrder(String userId, Order.ShippingAddress shippingAddress) {
        return createOrder(userId, shippingAddress, null);
    }

    public Order createOrder(String userId, Order.ShippingAddress shippingAddress, String couponCode) {
        // Get cart items
        List<CartItem> cartItems = cartRepository.findByUserId(userId);
        if (cartItems.isEmpty()) {
            throw new RuntimeException("Cart is empty");
        }

        // Create order
        Order order = new Order();
        order.setUserId(userId);
        order.setShippingAddress(shippingAddress);

        // Convert cart items to order items
        List<Order.OrderItem> orderItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (CartItem cartItem : cartItems) {
            String productId = cartItem.getProductId();
            if ((productId == null || productId.isBlank()) && cartItem.getProduct() != null) {
                productId = cartItem.getProduct().getId();
            }
            if (productId == null || productId.isBlank()) {
                // Skip orphaned cart items safely
                continue;
            }

            Product product = productRepository.findById(productId).orElse(null);
            if (product == null || Boolean.FALSE.equals(product.getIsActive())) {
                // Skip missing/deactivated products safely
                continue;
            }

            int qty = (cartItem.getQuantity() == null) ? 0 : cartItem.getQuantity();
            if (qty <= 0) {
                continue;
            }

            int availableStock = (product.getStock() == null) ? 0 : product.getStock();
            if (availableStock <= 0) {
                throw new RuntimeException("Product out of stock: " + product.getName());
            }
            if (qty > availableStock) {
                throw new RuntimeException("Insufficient stock for: " + product.getName());
            }

            Order.OrderItem orderItem = new Order.OrderItem();
            // Snapshot important product fields so orders remain valid if product changes later
            orderItem.setProductId(product.getId());
            orderItem.setVendorId(product.getVendorId());
            orderItem.setProductName(product.getName());
            orderItem.setQuantity(qty);
            orderItem.setPrice(product.getPrice());
            orderItem.setTotal(product.getPrice().multiply(BigDecimal.valueOf(qty)));
            orderItem.setItemStatus("NEW");
            orderItems.add(orderItem);
            subtotal = subtotal.add(orderItem.getTotal());
        }

        if (orderItems.isEmpty()) {
            throw new RuntimeException("No valid items found in cart");
        }

        order.setItems(orderItems);
        order.setSubtotal(subtotal);

        BigDecimal discount = BigDecimal.ZERO;
        String appliedCode = null;
        if (couponCode != null && !couponCode.isBlank()) {
            var couponOpt = couponService.findValidCoupon(couponCode);
            if (couponOpt.isPresent()) {
                discount = couponService.computeDiscount(couponOpt.get(), cartItems);
                if (discount.compareTo(BigDecimal.ZERO) > 0) {
                    appliedCode = couponOpt.get().getCode();
                }
            }
        }
        order.setCouponCode(appliedCode);
        order.setDiscountAmount(discount);

        BigDecimal taxable = subtotal.subtract(discount == null ? BigDecimal.ZERO : discount);
        if (taxable.compareTo(BigDecimal.ZERO) < 0) taxable = BigDecimal.ZERO;
        order.setTax(taxable.multiply(BigDecimal.valueOf(0.10))); // 10% tax
        order.setTotal(taxable.add(order.getTax()));

        Order savedOrder = orderRepository.save(order);

        return savedOrder;
    }

    /**
     * Process payment.
     * If stripeToken is provided and Stripe key is configured, charges via Stripe.
     * Otherwise, performs a dummy success for backward compatibility.
     */
    public Order processPayment(String userId, String orderId, String stripeToken) {
        Optional<Order> order = orderRepository.findById(orderId);
        if (order.isEmpty()) {
            throw new RuntimeException("Order not found");
        }

        Order o = order.get();
        if (userId == null || !userId.equals(o.getUserId())) {
            throw new RuntimeException("Forbidden");
        }

        if ("PAID".equalsIgnoreCase(o.getPaymentStatus())) {
            return o;
        }

        // Re-verify stock before charging
        for (Order.OrderItem item : o.getItems()) {
            Product p = productRepository.findById(item.getProductId()).orElse(null);
            if (p == null || Boolean.FALSE.equals(p.getIsActive())) {
                throw new RuntimeException("Product unavailable: " + item.getProductName());
            }
            int availableStock = (p.getStock() == null) ? 0 : p.getStock();
            int qty = (item.getQuantity() == null) ? 0 : item.getQuantity();
            if (qty <= 0 || qty > availableStock) {
                throw new RuntimeException("Insufficient stock for: " + item.getProductName());
            }
        }

        // Charge (Stripe when configured + token provided)
        if (stripeToken != null && !stripeToken.isBlank() && stripeSecretKey != null && !stripeSecretKey.isBlank()) {
            try {
                Stripe.apiKey = stripeSecretKey;
                long amountMinor = o.getTotal()
                        .multiply(BigDecimal.valueOf(100))
                        .setScale(0, RoundingMode.HALF_UP)
                        .longValue();

                ChargeCreateParams params = ChargeCreateParams.builder()
                        .setAmount(amountMinor)
                        .setCurrency("inr")
                        .setSource(stripeToken)
                        .setDescription("Luxe Jewels Order " + o.getId())
                        .build();
                Charge.create(params);
            } catch (StripeException e) {
                o.setPaymentStatus("FAILED");
                orderRepository.save(o);
                throw new RuntimeException("Stripe payment failed: " + e.getMessage());
            }
        }

        // Reduce stock after successful charge/dummy success
        for (Order.OrderItem item : o.getItems()) {
            Product p = productRepository.findById(item.getProductId()).orElse(null);
            if (p == null) {
                continue; // should not happen due to checks above
            }
            int availableStock = (p.getStock() == null) ? 0 : p.getStock();
            int qty = (item.getQuantity() == null) ? 0 : item.getQuantity();
            int newStock = Math.max(availableStock - qty, 0);
            p.setStock(newStock);
            productRepository.save(p);
        }

        o.setPaymentStatus("PAID");
        o.setStatus("PROCESSING");
        Order saved = orderRepository.save(o);

        // Vendor notifications (new paid order)
        if (saved.getItems() != null) {
            java.util.Set<String> vendorIds = new java.util.HashSet<>();
            for (Order.OrderItem item : saved.getItems()) {
                if (item != null && item.getVendorId() != null && !item.getVendorId().isBlank()) {
                    vendorIds.add(item.getVendorId());
                }
            }
            for (String vid : vendorIds) {
                Notification n = new Notification();
                n.setVendorId(vid);
                n.setType("NEW_ORDER");
                n.setTitle("New order received");
                n.setMessage("Order " + saved.getId() + " has been paid and is ready to process.");
                notificationRepository.save(n);
            }
        }

        // Clear cart only after successful payment
        cartRepository.deleteByUserId(userId);

        return saved;
    }

    /**
     * Get order by ID
     */
    public Optional<Order> getOrderById(String orderId) {
        return orderRepository.findById(orderId);
    }

    /**
     * Get all orders for user
     */
    public List<Order> getUserOrders(String userId) {
        return orderRepository.findByUserId(userId);
    }
}
