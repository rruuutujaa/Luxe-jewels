package com.luxejewels.controller;

import com.luxejewels.model.Coupon;
import com.luxejewels.model.User;
import com.luxejewels.repository.CouponRepository;
import com.luxejewels.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/vendor/coupons")
public class VendorCouponController {

    @Autowired private CouponRepository couponRepository;
    @Autowired private UserService userService;

    @GetMapping
    public ResponseEntity<?> list(HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        List<Coupon> coupons = couponRepository.findByVendorId(vendor.getId());
        coupons.sort(Comparator.comparing(Coupon::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return ResponseEntity.ok(coupons);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        String code = optStr(body, "code", null);
        if (code == null || code.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "code is required"));

        Coupon c = new Coupon();
        c.setVendorId(vendor.getId());
        c.setCode(code.toUpperCase());
        c.setType(optStr(body, "type", "PERCENT").toUpperCase());
        c.setValue(optMoney(body, "value", BigDecimal.ZERO));
        c.setProductId(optStr(body, "productId", null));
        c.setCategory(optStr(body, "category", null));
        c.setActive(optBool(body, "active", true));
        c.setStartAt(optDate(body, "startAt", null));
        c.setEndAt(optDate(body, "endAt", null));
        c.setCreatedAt(LocalDateTime.now());

        if (c.getValue() == null || c.getValue().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "value must be > 0"));
        }
        if (!"PERCENT".equals(c.getType()) && !"FIXED".equals(c.getType())) {
            return ResponseEntity.badRequest().body(Map.of("message", "type must be PERCENT or FIXED"));
        }

        return ResponseEntity.ok(couponRepository.save(c));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        Coupon c = couponRepository.findById(id).orElse(null);
        if (c == null) return ResponseEntity.status(404).body(Map.of("message", "Coupon not found"));
        if (!vendor.getId().equals(c.getVendorId())) return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));

        c.setCode(optStr(body, "code", c.getCode()));
        c.setType(optStr(body, "type", c.getType()));
        c.setValue(optMoney(body, "value", c.getValue()));
        c.setProductId(optStr(body, "productId", c.getProductId()));
        c.setCategory(optStr(body, "category", c.getCategory()));
        c.setActive(optBool(body, "active", c.getActive()));
        c.setStartAt(optDate(body, "startAt", c.getStartAt()));
        c.setEndAt(optDate(body, "endAt", c.getEndAt()));

        return ResponseEntity.ok(couponRepository.save(c));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, HttpServletRequest request) {
        User vendor = requireVendor(request);
        if (vendor == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));
        Coupon c = couponRepository.findById(id).orElse(null);
        if (c == null) return ResponseEntity.status(404).body(Map.of("message", "Coupon not found"));
        if (!vendor.getId().equals(c.getVendorId())) return ResponseEntity.status(403).body(Map.of("message", "Forbidden"));
        couponRepository.deleteById(id);
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

    private static String optStr(Map<String, Object> m, String k, String def) {
        if (m == null) return def;
        Object v = m.get(k);
        if (v == null) return def;
        String s = String.valueOf(v).trim();
        return s.isBlank() ? def : s;
    }

    private static Boolean optBool(Map<String, Object> m, String k, Boolean def) {
        if (m == null) return def;
        Object v = m.get(k);
        if (v == null) return def;
        return Boolean.parseBoolean(String.valueOf(v));
    }

    private static BigDecimal optMoney(Map<String, Object> m, String k, BigDecimal def) {
        if (m == null) return def;
        Object v = m.get(k);
        if (v == null) return def;
        try { return new BigDecimal(String.valueOf(v)); } catch (Exception e) { return def; }
    }

    private static LocalDateTime optDate(Map<String, Object> m, String k, LocalDateTime def) {
        if (m == null) return def;
        Object v = m.get(k);
        if (v == null) return def;
        try { return LocalDateTime.parse(String.valueOf(v)); } catch (Exception e) { return def; }
    }
}

