package com.luxejewels.controller;

import com.luxejewels.model.Review;
import com.luxejewels.model.User;
import com.luxejewels.repository.ReviewRepository;
import com.luxejewels.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vendor/reviews")
public class VendorReviewController {

    @Autowired private ReviewRepository reviewRepository;
    @Autowired private UserService userService;

    @GetMapping
    public ResponseEntity<?> list(HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        List<Review> reviews = reviewRepository.findByVendorIdOrderByCreatedAtDesc(vendor.getId());
        return ResponseEntity.ok(reviews);
    }

    @PostMapping("/{id}/reply")
    public ResponseEntity<?> reply(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        Review r = reviewRepository.findById(id).orElse(null);
        if (r == null) return ResponseEntity.status(404).body(Map.of("message", "Review not found"));
        if (!vendor.getId().equals(r.getVendorId())) return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));

        String message = body == null || body.get("message") == null ? null : String.valueOf(body.get("message")).trim();
        if (message == null || message.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "message is required"));

        Review.VendorReply vr = new Review.VendorReply();
        vr.setMessage(message);
        vr.setCreatedAt(LocalDateTime.now());
        r.setVendorReply(vr);
        reviewRepository.save(r);
        return ResponseEntity.ok(r);
    }

    @PutMapping("/{id}/report")
    public ResponseEntity<?> report(@PathVariable String id, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        Review r = reviewRepository.findById(id).orElse(null);
        if (r == null) return ResponseEntity.status(404).body(Map.of("message", "Review not found"));
        if (!vendor.getId().equals(r.getVendorId())) return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        r.setReported(true);
        reviewRepository.save(r);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private User requireVendor(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        String userId = (String) session.getAttribute(AuthController.SESSION_USER_ID);
        if (userId == null || userId.isBlank()) return null;
        User u = userService.findById(userId).orElse(null);
        if (u == null) return null;
        if (u.getRole() == null || !"VENDOR".equalsIgnoreCase(u.getRole().trim())) return null;
        if (Boolean.TRUE.equals(u.getDisabled())) return null;
        return u;
    }
}

