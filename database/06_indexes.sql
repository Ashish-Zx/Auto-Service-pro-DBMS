-- ============================================================
-- INDEXES — Demonstrates: B+ Tree Index, Composite Index
-- Syllabus: 6.5 Order Indices, 6.6 B+ tree index
-- ============================================================
USE auto_service_database;

-- B+ Tree Index on frequently searched columns
CREATE INDEX idx_customer_name ON customers(last_name, first_name);
CREATE INDEX idx_customer_email ON customers(email);
CREATE INDEX idx_vehicle_plate ON vehicles(license_plate);
CREATE INDEX idx_vehicle_customer ON vehicles(customer_id);

-- Composite index for appointment search (date + status)
CREATE INDEX idx_appointment_date_status ON appointments(appointment_date, status);

-- Index for service order queries
CREATE INDEX idx_order_status ON service_orders(status);
CREATE INDEX idx_order_date ON service_orders(order_date);
CREATE INDEX idx_order_customer ON service_orders(customer_id);

-- Index for parts search
CREATE INDEX idx_part_number ON parts(part_number);
CREATE INDEX idx_part_stock ON parts(quantity_in_stock);

-- Index for payment queries
CREATE INDEX idx_payment_date ON payments(payment_date);
CREATE INDEX idx_payment_order ON payments(order_id);

-- ────────────────────────────────────────────────────────────
-- DEMONSTRATE: EXPLAIN to show index usage (Query Optimization)
-- Syllabus: 5.1 Query Cost Estimation, 5.6 Performance Tuning
-- ────────────────────────────────────────────────────────────

-- Without index (full table scan)
-- EXPLAIN SELECT * FROM service_orders WHERE notes LIKE '%oil%';

-- With index (index scan)
-- EXPLAIN SELECT * FROM service_orders WHERE status = 'pending';
-- EXPLAIN SELECT * FROM customers WHERE last_name = 'Sharma';
-- EXPLAIN SELECT * FROM appointments WHERE appointment_date = '2025-01-05' AND status = 'confirmed';
