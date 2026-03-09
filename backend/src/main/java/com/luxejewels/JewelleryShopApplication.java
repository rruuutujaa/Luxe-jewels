package com.luxejewels;

import com.luxejewels.repository.CartRepository;
import com.luxejewels.repository.WishlistRepository;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ApplicationContext;

/**
 * Main Spring Boot Application Class
 * Entry point for the Jewellery E-Commerce backend application
 */
@SpringBootApplication
public class JewelleryShopApplication {

    private static ApplicationContext context;

    public static void main(String[] args) {
        context = SpringApplication.run(JewelleryShopApplication.class, args);
    }

    public static CartRepository getCartRepository() {
        return context.getBean(CartRepository.class);
    }

    public static WishlistRepository getWishlistRepository() {
        return context.getBean(WishlistRepository.class);
    }
}
