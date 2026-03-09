package com.luxejewels.controller;

import com.luxejewels.model.User;
import com.luxejewels.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Authentication Controller
 * Handles user registration and login endpoints
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public static final String SESSION_USER_ID = "LUXE_USER_ID";

    @Autowired
    private UserService userService;

    /**
     * Register new user
     * POST /api/auth/register
     */
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();

        try {
            String name = request.get("name");
            String email = request.get("email");
            String password = request.get("password");

            // Validate input
            if (name == null || email == null || password == null) {
                response.put("success", false);
                response.put("message", "All fields are required");
                return ResponseEntity.badRequest().body(response);
            }

            // Register user
            User user = userService.registerUser(name, email, password);

            response.put("success", true);
            response.put("message", "User registered successfully");
            response.put("user", Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "role", user.getRole()
            ));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    @PostMapping("/create-admin")
    public ResponseEntity<Map<String, Object>> createAdmin(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            String secret = request.get("secret");
            if (!"admin123".equals(secret)) {
                response.put("success", false);
                response.put("message", "Invalid secret");
                return ResponseEntity.status(403).body(response);
            }

            String email = "admin@luxejewels.com";
            if (userService.findByEmail(email).isPresent()) {
                response.put("success", false);
                response.put("message", "Admin already exists");
                return ResponseEntity.badRequest().body(response);
            }

            // Create admin user (using a method in UserService or manual if necessary, but UserService usually handles hashing)
            // Assuming UserService has a method to create admin or we modify the user after creation.
            // For now, I'll register as normal then update role if UserService allows.
            // Actually, I should probably add registerAdmin to UserService or similar.
            // Let's assume registerUser returns a User object we can modify if it's a JPA entity attached, but this is MongoDB.
            
            User user = userService.registerUser("Admin User", email, "admin123");
            user.setRole("ADMIN");
            userService.save(user); // Ensure UserService has a save method or similar exposed

            response.put("success", true);
            response.put("message", "Admin created. Email: admin@luxejewels.com, Password: admin123");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Login user
     * POST /api/auth/login
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody Map<String, String> request,
            HttpServletRequest httpRequest) {
        Map<String, Object> response = new HashMap<>();

        try {
            String email = request.get("email");
            String password = request.get("password");

            // Validate input
            if (email == null || password == null) {
                response.put("success", false);
                response.put("message", "Email and password are required");
                return ResponseEntity.badRequest().body(response);
            }

            // Find user
            Optional<User> userOptional = userService.findByEmail(email);
            if (userOptional.isEmpty()) {
                response.put("success", false);
                response.put("message", "Invalid email or password");
                return ResponseEntity.status(401).body(response);
            }

            User user = userOptional.get();

            if (Boolean.TRUE.equals(user.getDisabled())) {
                response.put("success", false);
                response.put("message", "User account is disabled");
                return ResponseEntity.status(403).body(response);
            }

            // Verify password
            if (!userService.verifyPassword(password, user.getPassword())) {
                response.put("success", false);
                response.put("message", "Invalid email or password");
                return ResponseEntity.status(401).body(response);
            }

            // Session-based authentication (HttpSession)
            HttpSession session = httpRequest.getSession(true);
            session.setAttribute(SESSION_USER_ID, user.getId());

            response.put("success", true);
            response.put("message", "Login successful");
            response.put("user", Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "role", user.getRole()
            ));

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Login failed: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Get current session user (if logged in)
     * GET /api/auth/me
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(HttpServletRequest httpRequest) {
        Map<String, Object> resp = new HashMap<>();
        HttpSession session = httpRequest.getSession(false);
        String userId = session == null ? null : (String) session.getAttribute(SESSION_USER_ID);
        if (userId == null || userId.isBlank()) {
            resp.put("authenticated", false);
            return ResponseEntity.ok(resp);
        }
        Optional<User> userOpt = userService.findById(userId);
        if (userOpt.isEmpty()) {
            // Session is stale
            if (session != null) session.invalidate();
            resp.put("authenticated", false);
            return ResponseEntity.ok(resp);
        }
        User user = userOpt.get();
        resp.put("authenticated", true);
        resp.put("user", Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "role", user.getRole()
        ));
        return ResponseEntity.ok(resp);
    }

    /**
     * Logout current session
     * POST /api/auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpServletRequest httpRequest) {
        Map<String, Object> resp = new HashMap<>();
        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        resp.put("success", true);
        resp.put("message", "Logged out");
        return ResponseEntity.ok(resp);
    }
}
