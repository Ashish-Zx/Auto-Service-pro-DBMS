-- ============================================================
-- VIEWS — Demonstrates: Virtual Tables, Complex Joins, Aggregation
-- Syllabus: 3.8 Views
-- ============================================================
USE auto_service_database;

-- ────────────────────────────────────────────────────────────
-- VIEW 1: Customer Service History (Multi-table JOIN)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_customer_service_history AS
SELECT 
    c.customer_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    c.phone,
    v.license_plate,
    CONCAT(v.make, ' ', v.model, ' (', v.year, ')') AS vehicle,
    so.order_id,
    so.order_date,
    so.status AS order_status,
    so.total_amount,
    p.payment_method,
    p.status AS payment_status
FROM customers c
JOIN vehicles v ON c.customer_id = v.customer_id
JOIN service_orders so ON v.vehicle_id = so.vehicle_id
LEFT JOIN payments p ON so.order_id = p.order_id
ORDER BY so.order_date DESC;

-- ────────────────────────────────────────────────────────────
-- VIEW 2: Mechanic Workload Dashboard
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_mechanic_workload AS
SELECT 
    m.mechanic_id,
    CONCAT(m.first_name, ' ', m.last_name) AS mechanic_name,
    m.specialization,
    m.status AS current_status,
    COUNT(ma.order_id) AS total_jobs,
    COALESCE(SUM(ma.hours_worked), 0) AS total_hours_worked,
    COALESCE(ROUND(AVG(f.rating), 1), 0) AS avg_customer_rating
FROM mechanics m
LEFT JOIN mechanic_assignments ma ON m.mechanic_id = ma.mechanic_id
LEFT JOIN service_orders so ON ma.order_id = so.order_id
LEFT JOIN feedback f ON so.order_id = f.order_id
GROUP BY m.mechanic_id, m.first_name, m.last_name, m.specialization, m.status;

-- ────────────────────────────────────────────────────────────
-- VIEW 3: Inventory Status (Low Stock Alert)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_inventory_status AS
SELECT 
    p.part_id,
    p.part_name,
    p.part_number,
    p.quantity_in_stock,
    p.reorder_level,
    p.unit_price,
    s.company_name AS supplier,
    s.phone AS supplier_phone,
    CASE 
        WHEN p.quantity_in_stock = 0 THEN 'OUT OF STOCK' COLLATE utf8mb4_0900_ai_ci
        WHEN p.quantity_in_stock <= p.reorder_level THEN 'LOW STOCK' COLLATE utf8mb4_0900_ai_ci
        ELSE 'IN STOCK' COLLATE utf8mb4_0900_ai_ci
    END AS stock_status
FROM parts p
LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
ORDER BY p.quantity_in_stock ASC;

-- ────────────────────────────────────────────────────────────
-- VIEW 4: Daily Revenue Report
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_daily_revenue AS
SELECT 
    DATE(p.payment_date) AS payment_date,
    COUNT(DISTINCT p.order_id) AS total_orders,
    SUM(p.amount) AS total_revenue,
    AVG(p.amount) AS avg_order_value,
    GROUP_CONCAT(DISTINCT p.payment_method) AS payment_methods_used
FROM payments p
WHERE p.status = 'completed'
GROUP BY DATE(p.payment_date)
ORDER BY payment_date DESC;

-- ────────────────────────────────────────────────────────────
-- VIEW 5: Service Popularity Report
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_service_popularity AS
SELECT 
    s.service_id,
    s.service_name,
    sc.category_name,
    s.base_price,
    COUNT(sli.order_id) AS times_ordered,
    COALESCE(SUM(sli.line_total), 0) AS total_revenue
FROM services s
JOIN service_categories sc ON s.category_id = sc.category_id
LEFT JOIN service_line_items sli ON s.service_id = sli.service_id
GROUP BY s.service_id, s.service_name, sc.category_name, s.base_price
ORDER BY total_revenue DESC;
