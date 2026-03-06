package com.luxejewels.controller;

import com.luxejewels.model.Order;
import com.luxejewels.security.JwtUtil;
import com.luxejewels.service.OrderService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Order Controller
 * Handles order and payment API endpoints
 */
@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private JwtUtil jwtUtil;

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
            String userId = getUserIdFromToken(request);
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

            Order order = orderService.createOrder(userId, shippingAddress);
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
            String userId = getUserIdFromToken(request);
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
     * GET /api/orders/my
     */
    @GetMapping("/my")
    public ResponseEntity<Map<String, Object>> getMyOrders(HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String userId = getUserIdFromToken(request);
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
     * Get user ID from JWT token
     */
    private String getUserIdFromToken(HttpServletRequest request) {
        String token = extractToken(request);
        if (token != null && jwtUtil.validateToken(token)) {
            return jwtUtil.getUserIdFromToken(token);
        }
        return null;
    }

    /**
     * Extract JWT token from request
     */
    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
