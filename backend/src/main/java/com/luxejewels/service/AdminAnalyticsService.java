package com.luxejewels.service;

import com.luxejewels.repository.OrderRepository;
import com.luxejewels.repository.ProductRepository;
import com.luxejewels.repository.UserRepository;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.aggregation.MatchOperation;
import org.springframework.data.mongodb.core.aggregation.GroupOperation;
import org.springframework.data.mongodb.core.aggregation.SortOperation;
import org.springframework.data.mongodb.core.aggregation.UnwindOperation;
import org.springframework.data.mongodb.core.aggregation.ProjectionOperation;
import org.springframework.data.mongodb.core.aggregation.LimitOperation;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

@Service
public class AdminAnalyticsService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private MongoTemplate mongoTemplate;

    public Map<String, Object> computeCoreAnalytics() {
        Map<String, Object> resp = new HashMap<>();
        long totalUsers = userRepository.count();
        long totalProducts = productRepository.count();
        long activeProducts = productRepository.countByIsActiveTrue();
        long outOfStock = productRepository.countByStockEquals(0);
        long lowStock = productRepository.countByStockLessThan(5);
        long totalOrders = orderRepository.count();
        BigDecimal totalRevenue = aggregatePaidRevenue();

        resp.put("totalUsers", totalUsers);
        resp.put("totalProducts", totalProducts);
        resp.put("activeProducts", activeProducts);
        resp.put("outOfStock", outOfStock);
        resp.put("lowStock", lowStock);
        resp.put("totalOrders", totalOrders);
        resp.put("totalRevenue", totalRevenue);
        return resp;
    }

    private BigDecimal aggregatePaidRevenue() {
        MatchOperation matchPaid = Aggregation.match(Criteria.where("paymentStatus").in("PAID", "Paid", "paid"));
        GroupOperation groupSum = Aggregation.group().sum("total").as("totalRevenue");
        Aggregation agg = Aggregation.newAggregation(matchPaid, groupSum);
        AggregationResults<Document> results = mongoTemplate.aggregate(agg, "orders", Document.class);
        Document doc = results.getUniqueMappedResult();
        BigDecimal aggVal = BigDecimal.ZERO;
        if (doc != null) {
            Object val = doc.get("totalRevenue");
            if (val != null) {
                try {
                    if (val instanceof BigDecimal bd) aggVal = bd;
                    else if (val instanceof Number num) aggVal = BigDecimal.valueOf(num.doubleValue());
                    else aggVal = new BigDecimal(String.valueOf(val));
                } catch (Exception ignored) {}
            }
        }
        if (aggVal != null && aggVal.compareTo(BigDecimal.ZERO) > 0) {
            return aggVal;
        }
        // Fallback (case-insensitive + null-safe) if aggregation yields 0
        return orderRepository.findAll().stream()
                .filter(o -> "PAID".equalsIgnoreCase(o.getPaymentStatus()))
                .map(com.luxejewels.model.Order::getTotal)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public List<Map<String, Object>> topSellingProducts(int limit) {
        UnwindOperation unwindItems = Aggregation.unwind("items");
        GroupOperation groupByProduct = Aggregation.group("items.productId").sum("items.quantity").as("totalQty");
        SortOperation sortByQty = Aggregation.sort(org.springframework.data.domain.Sort.Direction.DESC, "totalQty");
        LimitOperation topN = Aggregation.limit(limit);
        Aggregation agg = Aggregation.newAggregation(unwindItems, groupByProduct, sortByQty, topN);
        AggregationResults<Document> results = mongoTemplate.aggregate(agg, "orders", Document.class);
        List<Document> list = results.getMappedResults();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Document d : list) {
            Map<String, Object> m = new HashMap<>();
            Object id = d.get("_id");
            m.put("productId", id != null ? String.valueOf(id) : "");
            m.put("totalQty", d.get("totalQty"));
            out.add(m);
        }
        return out;
    }

    public List<Map<String, Object>> monthlyOrderTotals() {
        ProjectionOperation projectYM = Aggregation.project()
                .andExpression("year($createdAt)").as("year")
                .andExpression("month($createdAt)").as("month")
                .and("total").as("total")
                .and("paymentStatus").as("paymentStatus");
        GroupOperation groupByMonth = Aggregation.group("year", "month")
                .count().as("ordersCount")
                .sum("total").as("grossTotal")
                .sum(
                        org.springframework.data.mongodb.core.aggregation.ConditionalOperators
                                .when(Criteria.where("paymentStatus").is("PAID"))
                                .thenValueOf("total")
                                .otherwise(0)
                ).as("paidTotal");
        SortOperation sortYM = Aggregation.sort(org.springframework.data.domain.Sort.by("year").ascending()
                .and(org.springframework.data.domain.Sort.by("month").ascending()));
        Aggregation agg = Aggregation.newAggregation(projectYM, groupByMonth, sortYM);
        AggregationResults<Document> results = mongoTemplate.aggregate(agg, "orders", Document.class);
        List<Document> docs = results.getMappedResults();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Document d : docs) {
            Map<String, Object> m = new HashMap<>();
            Document id = (Document) d.get("_id");
            m.put("year", id.get("year"));
            m.put("month", id.get("month"));
            m.put("ordersCount", d.get("ordersCount"));
            m.put("grossTotal", d.get("grossTotal"));
            m.put("paidTotal", d.get("paidTotal"));
            out.add(m);
        }
        return out;
    }
}
