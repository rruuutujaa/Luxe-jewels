package com.luxejewels.repository;

import com.luxejewels.model.StockLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StockLogRepository extends MongoRepository<StockLog, String> {
    List<StockLog> findTop50ByVendorIdAndProductIdOrderByCreatedAtDesc(String vendorId, String productId);
}

