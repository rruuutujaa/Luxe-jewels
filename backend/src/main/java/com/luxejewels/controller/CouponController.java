package com.luxejewels.controller;

import com.luxejewels.model.CartItem;
import com.luxejewels.repository.CartRepository;
import com.luxejewels.service.CouponService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Public coupon apply endpoint (used at checkout).
 * Session-based: computes discount for the logged-in user's cart.
 */
@RestController
@RequestMapping("/api/coupons")
public class CouponController {

    @Autowired private CouponService couponService;
    @Autowired private CartRepository cartRepository;

    @PostMapping("/apply")
    public ResponseEntity<?> apply(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        String userId = getUserIdFromSession(request);
        if (userId == null) return ResponseEntity.status(401).body(Map.of("message", "Unauthorized"));

        String code = body == null || body.get("code") == null ? null : String.valueOf(body.get("code")).trim();
        if (code == null || code.isBlank()) return ResponseEntity.badRequest().body(Map.of("message", "code is required"));

        var couponOpt = couponService.findValidCoupon(code);
        if (couponOpt.isEmpty()) return ResponseEntity.status(404).body(Map.of("message", "Invalid coupon"));

        List<CartItem> cartItems = cartRepository.findByUserId(userId);
        BigDecimal discount = couponService.computeDiscount(couponOpt.get(), cartItems);
        return ResponseEntity.ok(Map.of(
                "code", couponOpt.get().getCode(),
                "discountAmount", discount
        ));
    }

    private String getUserIdFromSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) return null;
        String userId = (String) session.getAttribute(AuthController.SESSION_USER_ID);
        return (userId == null || userId.isBlank()) ? null : userId;
    }
}

