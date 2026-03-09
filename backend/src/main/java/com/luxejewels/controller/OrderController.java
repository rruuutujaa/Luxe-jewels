package com.luxejewels.controller;

import com.luxejewels.model.Order;
import com.luxejewels.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Order Controller
 * Handles order and payment API endpoints
 */
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    /**
     * Create new order from cart
     * POST /api/orders/create
     */
    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createOrder(
            @RequestBody Map<String, Object> requestBody,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userId = getUserIdFromSession(request);
            if (userId == null) {
                response.put("success", false);
                response.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(response);
            }

            // Extract shipping address from request
            @SuppressWarnings("unchecked")
            Map<String, String> shippingAddressMap = (Map<String, String>) requestBody.get("shippingAddress");
            if (shippingAddressMap == null) {
                response.put("success", false);
                response.put("message", "shippingAddress is required");
                return ResponseEntity.badRequest().body(response);
            }
            
            Order.ShippingAddress shippingAddress = new Order.ShippingAddress();
            shippingAddress.setFullName(shippingAddressMap.get("fullName"));
            shippingAddress.setEmail(shippingAddressMap.get("email"));
            shippingAddress.setPhone(shippingAddressMap.get("phone"));
            shippingAddress.setAddress(shippingAddressMap.get("address"));
            shippingAddress.setCity(shippingAddressMap.get("city"));
            shippingAddress.setState(shippingAddressMap.get("state"));
            shippingAddress.setZipCode(shippingAddressMap.get("zipCode"));
            shippingAddress.setCountry(shippingAddressMap.get("country"));

            String couponCode = null;
            Object cc = requestBody.get("couponCode");
            if (cc != null) couponCode = String.valueOf(cc).trim();
            Order order = orderService.createOrder(userId, shippingAddress, couponCode);
            response.put("success", true);
            response.put("message", "Order created successfully");
            response.put("orderId", order.getId());
            response.put("order", order);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to create order: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Process payment (dummy payment)
     * POST /api/orders/payment
     */
    @PostMapping("/payment")
    public ResponseEntity<Map<String, Object>> processPayment(
            @RequestBody Map<String, String> requestBody,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userId = getUserIdFromSession(request);
            if (userId == null) {
                response.put("success", false);
                response.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(response);
            }

            String orderId = requestBody.get("orderId");
            String stripeToken = requestBody.get("stripeToken");
            Order order = orderService.processPayment(userId, orderId, stripeToken);
            
            response.put("success", true);
            response.put("message", "Payment processed successfully");
            response.put("orderId", order.getId());
            response.put("paymentStatus", order.getPaymentStatus());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Payment failed: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Get orders for logged-in user
     * GET /api/orders
     * GET /api/orders/my (backward compatible)
     */
    @GetMapping
    public ResponseEntity<?> getOrders(HttpServletRequest request) {
        try {
            String userId = getUserIdFromSession(request);
            if (userId == null) {
                return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
            }
            List<Order> orders = orderService.getUserOrders(userId);
            return ResponseEntity.ok(orders);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to fetch orders: " + e.getMessage()));
        }
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyOrders(HttpServletRequest request) {
        // Backward compatible wrapper shape for older frontend code
        Map<String, Object> response = new HashMap<>();
        try {
            String userId = getUserIdFromSession(request);
            if (userId == null) {
                response.put("success", false);
                response.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(response);
            }
            List<Order> orders = orderService.getUserOrders(userId);
            response.put("success", true);
            response.put("orders", orders);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Failed to fetch orders: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Get user ID from HttpSession
     */
    private String getUserIdFromSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        String userId = (String) session.getAttribute(AuthController.SESSION_USER_ID);
        return (userId == null || userId.isBlank()) ? null : userId;
    }
}
