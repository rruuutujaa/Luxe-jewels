package com.luxejewels.controller;

import com.luxejewels.model.User;
import com.luxejewels.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Address APIs (session-authenticated).
 *
 * Required by frontend:
 * - GET /api/address
 * - Add/Edit/Delete must reflect instantly
 */
@RestController
@RequestMapping("/api/address")
public class AddressController {

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<?> getAddresses(HttpServletRequest request) {
        String userId = getUserIdFromSession(request);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User user = userService.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        List<User.Address> addresses = user.getAddresses();
        return ResponseEntity.ok(addresses == null ? List.of() : addresses);
    }

    @PostMapping
    public ResponseEntity<?> addAddress(@RequestBody Map<String, String> body, HttpServletRequest request) {
        String userId = getUserIdFromSession(request);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User user = userService.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.status(404).body(Map.of("message", "User not found"));

        User.Address addr = new User.Address();
        applyAddressFields(addr, body);
        String validation = validate(addr);
        if (validation != null) {
            return ResponseEntity.badRequest().body(Map.of("message", validation));
        }

        List<User.Address> list = user.getAddresses();
        if (list == null) list = new ArrayList<>();
        list.add(addr);
        user.setAddresses(list);
        userService.save(user);
        return ResponseEntity.ok(addr);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateAddress(
            @PathVariable String id,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        String userId = getUserIdFromSession(request);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User user = userService.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.status(404).body(Map.of("message", "User not found"));

        List<User.Address> list = user.getAddresses();
        if (list == null) list = new ArrayList<>();
        User.Address addr = list.stream().filter(a -> a != null && id.equals(a.getId())).findFirst().orElse(null);
        if (addr == null) return ResponseEntity.status(404).body(Map.of("message", "Address not found"));

        applyAddressFields(addr, body);
        String validation = validate(addr);
        if (validation != null) {
            return ResponseEntity.badRequest().body(Map.of("message", validation));
        }
        userService.save(user);
        return ResponseEntity.ok(addr);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAddress(@PathVariable String id, HttpServletRequest request) {
        String userId = getUserIdFromSession(request);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        User user = userService.findById(userId).orElse(null);
        if (user == null) return ResponseEntity.status(404).body(Map.of("message", "User not found"));

        List<User.Address> list = user.getAddresses();
        if (list == null) list = new ArrayList<>();
        list.removeIf(a -> a != null && id.equals(a.getId()));
        user.setAddresses(list);
        userService.save(user);
        return ResponseEntity.ok(Map.of("success", true));
    }

    private void applyAddressFields(User.Address addr, Map<String, String> body) {
        if (body == null) return;
        addr.setLabel(opt(body, "label"));
        addr.setName(opt(body, "name"));
        addr.setPhone(opt(body, "phone"));
        addr.setLine1(opt(body, "line1"));
        addr.setLine2(opt(body, "line2"));
        addr.setCity(opt(body, "city"));
        addr.setState(opt(body, "state"));
        addr.setPincode(opt(body, "pincode"));
    }

    private String validate(User.Address addr) {
        if (addr == null) return "Invalid address";
        if (isBlank(addr.getLabel())) return "Address label is required";
        if (isBlank(addr.getName())) return "Full name is required";
        if (isBlank(addr.getPhone())) return "Phone is required";
        if (isBlank(addr.getLine1())) return "Address line 1 is required";
        if (isBlank(addr.getCity())) return "City is required";
        if (isBlank(addr.getState())) return "State is required";
        if (isBlank(addr.getPincode())) return "Pincode is required";
        return null;
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static String opt(Map<String, String> m, String k) {
        String v = m.get(k);
        return v == null ? null : v.trim();
    }

    private String getUserIdFromSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        String userId = (String) session.getAttribute(AuthController.SESSION_USER_ID);
        return (userId == null || userId.isBlank()) ? null : userId;
    }
}

