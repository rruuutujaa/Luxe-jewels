package com.luxejewels.repository;

import com.luxejewels.model.SupportTicket;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportTicketRepository extends MongoRepository<SupportTicket, String> {
    List<SupportTicket> findByVendorIdOrderByCreatedAtDesc(String vendorId);
}

