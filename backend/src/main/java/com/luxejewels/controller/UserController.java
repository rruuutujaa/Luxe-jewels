package com.luxejewels.controller;

import com.luxejewels.model.Order;
import com.luxejewels.model.User;
import com.luxejewels.repository.CartRepository;
import com.luxejewels.repository.OrderRepository;
import com.luxejewels.repository.WishlistRepository;
import com.luxejewels.security.JwtUtil;
import com.luxejewels.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * User Controller
 * Endpoints for user dashboard and profile.
 */
@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserService userService;

    @Autowired
    private CartRepository cartRepository;

    @Autowired
    private WishlistRepository wishlistRepository;

    @Autowired
    private OrderRepository orderRepository;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            String token = extractToken(request);
            if (token == null || !jwtUtil.validateToken(token)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            String userId = jwtUtil.getUserIdFromToken(token);
            User user = userService.findById(userId).orElse(null);
            if (user == null) {
                resp.put("success", false);
                resp.put("message", "User not found");
                return ResponseEntity.status(404).body(resp);
            }
            resp.put("success", true);
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("name", user.getName());
            userMap.put("email", user.getEmail());
            userMap.put("role", user.getRole());
            userMap.put("createdAt", user.getCreatedAt());
            userMap.put("phone", user.getPhone());
            userMap.put("phoneLocked", user.getPhoneLocked());
            userMap.put("addresses", user.getAddresses());
            resp.put("user", userMap);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to load profile: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @GetMapping("/me/stats")
    public ResponseEntity<Map<String, Object>> myStats(HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            String token = extractToken(request);
            if (token == null || !jwtUtil.validateToken(token)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            String userId = jwtUtil.getUserIdFromToken(token);

            int cartCount = cartRepository.findByUserId(userId).stream()
                    .map(ci -> ci.getQuantity() == null ? 0 : ci.getQuantity())
                    .reduce(0, Integer::sum);

            long wishlistCount = wishlistRepository.findByUserId(userId).size();

            List<Order> orders = orderRepository.findByUserId(userId);
            BigDecimal totalSpent = orders.stream()
                    .filter(o -> "PAID".equalsIgnoreCase(o.getPaymentStatus()))
                    .map(Order::getTotal)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Get recent 5 orders sorted by creation date descending
            List<Order> recentOrders = orders.stream()
                    .sorted(Comparator.comparing(Order::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                    .limit(5)
                    .collect(Collectors.toList());

            resp.put("success", true);
            resp.put("cartCount", cartCount);
            resp.put("wishlistCount", wishlistCount);
            resp.put("totalSpent", totalSpent);
            resp.put("ordersCount", orders.size());
            resp.put("recentOrders", recentOrders);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to compute stats: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> updateProfile(@RequestBody Map<String, String> body, HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            String token = extractToken(request);
            if (token == null || !jwtUtil.validateToken(token)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            String userId = jwtUtil.getUserIdFromToken(token);
            User user = userService.findById(userId).orElse(null);
            if (user == null) {
                resp.put("success", false);
                resp.put("message", "User not found");
                return ResponseEntity.status(404).body(resp);
            }
            String name = body.get("name");
            if (name != null && !name.trim().isEmpty()) {
                user.setName(name.trim());
            }
            userService.save(user);
            resp.put("success", true);
            resp.put("user", user);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to update profile: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @PutMapping("/me/phone")
    public ResponseEntity<Map<String, Object>> setPhone(@RequestBody Map<String, String> body, HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            String token = extractToken(request);
            if (token == null || !jwtUtil.validateToken(token)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            String userId = jwtUtil.getUserIdFromToken(token);
            User user = userService.findById(userId).orElse(null);
            if (user == null) {
                resp.put("success", false);
                resp.put("message", "User not found");
                return ResponseEntity.status(404).body(resp);
            }
            if (Boolean.TRUE.equals(user.getPhoneLocked()) && user.getPhone() != null && !user.getPhone().isBlank()) {
                resp.put("success", false);
                resp.put("message", "Phone number is locked and can only be set once");
                return ResponseEntity.status(400).body(resp);
            }
            String phone = body.get("phone");
            if (phone == null || phone.trim().isEmpty()) {
                resp.put("success", false);
                resp.put("message", "Phone is required");
                return ResponseEntity.badRequest().body(resp);
            }
            user.setPhone(phone.trim());
            user.setPhoneLocked(true);
            userService.save(user);
            resp.put("success", true);
            resp.put("phone", user.getPhone());
            resp.put("phoneLocked", user.getPhoneLocked());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to set phone: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @PostMapping("/me/addresses")
    public ResponseEntity<Map<String, Object>> addAddress(@RequestBody Map<String, String> body, HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            String token = extractToken(request);
            if (token == null || !jwtUtil.validateToken(token)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            String userId = jwtUtil.getUserIdFromToken(token);
            User user = userService.findById(userId).orElse(null);
            if (user == null) {
                resp.put("success", false);
                resp.put("message", "User not found");
                return ResponseEntity.status(404).body(resp);
            }
            User.Address addr = new User.Address();
            addr.setLabel(opt(body, "label"));
            addr.setName(opt(body, "name"));
            addr.setLine1(opt(body, "line1"));
            addr.setLine2(opt(body, "line2"));
            addr.setCity(opt(body, "city"));
            addr.setState(opt(body, "state"));
            addr.setPincode(opt(body, "pincode"));
            addr.setPhone(opt(body, "phone"));
            if (isBlank(addr.getLabel()) || isBlank(addr.getName()) || isBlank(addr.getLine1()) ||
                isBlank(addr.getLine2()) || isBlank(addr.getCity()) || isBlank(addr.getState()) ||
                isBlank(addr.getPincode()) || isBlank(addr.getPhone())) {
                resp.put("success", false);
                resp.put("message", "All address fields are required");
                return ResponseEntity.badRequest().body(resp);
            }
            List<User.Address> list = user.getAddresses();
            if (list == null) {
                list = new ArrayList<>();
                user.setAddresses(list);
            }
            list.add(addr);
            userService.save(user);
            resp.put("success", true);
            resp.put("addresses", user.getAddresses());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to add address: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    @DeleteMapping("/me/addresses/{id}")
    public ResponseEntity<Map<String, Object>> deleteAddress(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> resp = new HashMap<>();
        try {
            String token = extractToken(request);
            if (token == null || !jwtUtil.validateToken(token)) {
                resp.put("success", false);
                resp.put("message", "Unauthorized");
                return ResponseEntity.status(401).body(resp);
            }
            String userId = jwtUtil.getUserIdFromToken(token);
            User user = userService.findById(userId).orElse(null);
            if (user == null) {
                resp.put("success", false);
                resp.put("message", "User not found");
                return ResponseEntity.status(404).body(resp);
            }
            List<User.Address> list = user.getAddresses();
            if (list == null) list = new ArrayList<>();
            list.removeIf(a -> a.getId() != null && a.getId().equals(id));
            user.setAddresses(list);
            userService.save(user);
            resp.put("success", true);
            resp.put("addresses", user.getAddresses());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            resp.put("success", false);
            resp.put("message", "Failed to delete address: " + e.getMessage());
            return ResponseEntity.status(500).body(resp);
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static String opt(Map<String, String> m, String k) {
        String v = m.get(k);
        return v == null ? null : v.trim();
    }
    private String extractToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}

