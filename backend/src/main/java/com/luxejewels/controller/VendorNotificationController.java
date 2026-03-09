package com.luxejewels.controller;

import com.luxejewels.model.Notification;
import com.luxejewels.model.User;
import com.luxejewels.repository.NotificationRepository;
import com.luxejewels.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vendor/notifications")
public class VendorNotificationController {

    @Autowired private NotificationRepository notificationRepository;
    @Autowired private UserService userService;

    @GetMapping
    public ResponseEntity<?> list(HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        List<Notification> items = notificationRepository.findTop50ByVendorIdOrderByCreatedAtDesc(vendor.getId());
        long unread = notificationRepository.countByVendorIdAndReadFalse(vendor.getId());
        return ResponseEntity.ok(Map.of("unread", unread, "items", items));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable String id, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        Notification n = notificationRepository.findById(id).orElse(null);
        if (n == null) return ResponseEntity.status(404).body(Map.of("message", "Not found"));
        if (!vendor.getId().equals(n.getVendorId())) return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        n.setRead(true);
        notificationRepository.save(n);
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

