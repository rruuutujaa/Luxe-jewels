package com.luxejewels.repository;

import com.luxejewels.model.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/**
 * User Repository - Data access layer for User entity
 * Provides methods to interact with users collection in MongoDB
 */
@Repository
public interface UserRepository extends MongoRepository<User, String> {
    /**
     * Find user by email address
     * @param email User's email
     * @return Optional User object
     */
    Optional<User> findByEmail(String email);

    /**
     * Check if user exists by email
     * @param email User's email
     * @return true if user exists, false otherwise
     */
    boolean existsByEmail(String email);
}
