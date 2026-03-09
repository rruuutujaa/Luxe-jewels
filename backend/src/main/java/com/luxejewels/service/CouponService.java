package com.luxejewels.service;

import com.luxejewels.model.CartItem;
import com.luxejewels.model.Coupon;
import com.luxejewels.model.Product;
import com.luxejewels.repository.CouponRepository;
import com.luxejewels.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class CouponService {

    @Autowired private CouponRepository couponRepository;
    @Autowired private ProductRepository productRepository;

    public Optional<Coupon> findValidCoupon(String code) {
        if (code == null || code.isBlank()) return Optional.empty();
        Optional<Coupon> c = couponRepository.findByCodeIgnoreCase(code.trim());
        if (c.isEmpty()) return Optional.empty();
        Coupon coupon = c.get();
        if (coupon.getActive() != null && !coupon.getActive()) return Optional.empty();
        LocalDateTime now = LocalDateTime.now();
        if (coupon.getStartAt() != null && now.isBefore(coupon.getStartAt())) return Optional.empty();
        if (coupon.getEndAt() != null && now.isAfter(coupon.getEndAt())) return Optional.empty();
        if (coupon.getValue() == null || coupon.getValue().compareTo(BigDecimal.ZERO) <= 0) return Optional.empty();
        String type = coupon.getType() == null ? "" : coupon.getType().trim().toUpperCase();
        if (!type.equals("PERCENT") && !type.equals("FIXED")) return Optional.empty();
        return Optional.of(coupon);
    }

    /**
     * Computes discount for the given cart snapshot.
     * If coupon targets a product/category, discount applies only on eligible subtotal.
     */
    public BigDecimal computeDiscount(Coupon coupon, List<CartItem> cartItems) {
        if (coupon == null || cartItems == null || cartItems.isEmpty()) return BigDecimal.ZERO;

        BigDecimal eligibleSubtotal = BigDecimal.ZERO;
        for (CartItem ci : cartItems) {
            if (ci == null) continue;
            int qty = ci.getQuantity() == null ? 0 : ci.getQuantity();
            if (qty <= 0) continue;

            String productId = ci.getProductId();
            if ((productId == null || productId.isBlank()) && ci.getProduct() != null) {
                productId = ci.getProduct().getId();
            }
            if (productId == null || productId.isBlank()) continue;

            Product p = productRepository.findById(productId).orElse(null);
            if (p == null || Boolean.FALSE.equals(p.getIsActive())) continue;

            if (coupon.getProductId() != null && !coupon.getProductId().isBlank()) {
                if (!coupon.getProductId().equals(p.getId())) continue;
            }
            if (coupon.getCategory() != null && !coupon.getCategory().isBlank()) {
                if (p.getCategory() == null || !p.getCategory().equalsIgnoreCase(coupon.getCategory().trim())) continue;
            }

            BigDecimal price = p.getPrice() == null ? BigDecimal.ZERO : p.getPrice();
            eligibleSubtotal = eligibleSubtotal.add(price.multiply(BigDecimal.valueOf(qty)));
        }

        if (eligibleSubtotal.compareTo(BigDecimal.ZERO) <= 0) return BigDecimal.ZERO;

        String type = coupon.getType().trim().toUpperCase();
        BigDecimal value = coupon.getValue();

        BigDecimal discount;
        if ("PERCENT".equals(type)) {
            BigDecimal pct = value.max(BigDecimal.ZERO).min(new BigDecimal("90"));
            discount = eligibleSubtotal.multiply(pct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        } else {
            discount = value;
        }

        if (discount.compareTo(BigDecimal.ZERO) < 0) discount = BigDecimal.ZERO;
        if (discount.compareTo(eligibleSubtotal) > 0) discount = eligibleSubtotal;
        return discount.setScale(2, RoundingMode.HALF_UP);
    }
}

