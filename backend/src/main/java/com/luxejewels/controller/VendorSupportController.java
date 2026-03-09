package com.luxejewels.controller;

import com.luxejewels.model.SupportTicket;
import com.luxejewels.model.User;
import com.luxejewels.repository.SupportTicketRepository;
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
@RequestMapping("/api/vendor/support")
public class VendorSupportController {

    @Autowired private SupportTicketRepository ticketRepository;
    @Autowired private UserService userService;

    @GetMapping("/tickets")
    public ResponseEntity<?> list(HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        List<SupportTicket> tickets = ticketRepository.findByVendorIdOrderByCreatedAtDesc(vendor.getId());
        return ResponseEntity.ok(tickets);
    }

    @PostMapping("/tickets")
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        String subject = body == null || body.get("subject") == null ? null : String.valueOf(body.get("subject")).trim();
        String message = body == null || body.get("message") == null ? null : String.valueOf(body.get("message")).trim();
        if (subject == null || subject.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "subject is required"));
        if (message == null || message.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "message is required"));

        SupportTicket t = new SupportTicket();
        t.setVendorId(vendor.getId());
        t.setSubject(subject);
        t.setMessage(message);
        t.setStatus("OPEN");
        t.setCreatedAt(LocalDateTime.now());
        t.setUpdatedAt(LocalDateTime.now());

        return ResponseEntity.ok(ticketRepository.save(t));
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

