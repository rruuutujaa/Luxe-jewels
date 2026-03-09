package com.luxejewels.config;

import com.luxejewels.model.Product;
import com.luxejewels.model.User;
import com.luxejewels.repository.ProductRepository;
import com.luxejewels.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Optional;

/**
 * Data Initializer
 * Seeds the database with sample products on application startup
 * This helps with testing and demonstration
 */
@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        seedAdminUser();
        String vendorId = seedVendorUser();
        // Check if products already exist
        if (productRepository.count() > 0) {
            return; // Skip initialization if products exist
        }

        // Create sample products
        Product[] sampleProducts = {
            new Product("Diamond Engagement Ring", "Beautiful diamond engagement ring with 1 carat center stone", "Rings", new BigDecimal("2999.99")),
            new Product("Gold Necklace", "Elegant 18K gold necklace with intricate design", "Necklaces", new BigDecimal("1299.99")),
            new Product("Pearl Earrings", "Classic pearl drop earrings, perfect for any occasion", "Earrings", new BigDecimal("499.99")),
            new Product("Silver Bracelet", "Delicate silver bracelet with engraved patterns", "Bracelets", new BigDecimal("349.99")),
            new Product("Luxury Watch", "Premium Swiss watch with leather strap", "Watches", new BigDecimal("1999.99")),
            new Product("Rose Gold Ring", "Stunning rose gold ring with gemstone accents", "Rings", new BigDecimal("899.99")),
            new Product("Diamond Pendant", "Exquisite diamond pendant on gold chain", "Necklaces", new BigDecimal("1599.99")),
            new Product("Stud Earrings", "Classic diamond stud earrings", "Earrings", new BigDecimal("799.99")),
            new Product("Tennis Bracelet", "Diamond tennis bracelet in white gold", "Bracelets", new BigDecimal("2499.99")),
            new Product("Chronograph Watch", "Professional chronograph watch with multiple features", "Watches", new BigDecimal("1499.99"))
        };

        // Set image URLs (placeholder images)
        for (Product product : sampleProducts) {
            product.setImageUrl("https://via.placeholder.com/300x300?text=" + product.getName().replace(" ", "+"));
            product.setStock(10);
            product.setIsActive(true);
            product.setVendorId(vendorId);
            productRepository.save(product);
        }

        System.out.println("Sample products initialized successfully!");
    }

    /**
     * One-time creation of admin user if missing.
     */
    private void seedAdminUser() {
        String adminEmail = "rutujantamboli.clustor@gmail.com";
        if (userRepository.existsByEmail(adminEmail)) {
            return;
        }
        User admin = new User();
        admin.setName("Admin");
        admin.setEmail(adminEmail);
        admin.setPassword(passwordEncoder.encode("rutuja"));
        admin.setRole("ADMIN");
        userRepository.save(admin);
        System.out.println("Admin user created: " + adminEmail);
    }

    /**
     * One-time creation of a vendor user for testing the supplier panel.
     * Returns vendor userId.
     */
    private String seedVendorUser() {
        String vendorEmail = "vendor@luxejewels.com";
        Optional<User> existing = userRepository.findByEmail(vendorEmail);
        if (existing.isPresent()) {
            return existing.get().getId();
        }
        User vendor = new User();
        vendor.setName("Vendor");
        vendor.setCompanyName("Luxe Supplier Co.");
        vendor.setEmail(vendorEmail);
        vendor.setPassword(passwordEncoder.encode("vendor123"));
        vendor.setRole("VENDOR");
        userRepository.save(vendor);
        System.out.println("Vendor user created: " + vendorEmail);
        return vendor.getId();
    }
}
