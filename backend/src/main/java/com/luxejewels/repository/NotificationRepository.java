package com.luxejewels.repository;

import com.luxejewels.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {
    List<Notification> findTop50ByVendorIdOrderByCreatedAtDesc(String vendorId);
    long countByVendorIdAndReadFalse(String vendorId);
}

