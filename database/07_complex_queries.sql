-- ============================================================
-- COMPLEX QUERIES — Demonstrates ALL SQL concepts from Unit 3
-- ============================================================
USE auto_service_database;

-- ────────────────────────────────────────────────────────────
-- 1. SUB-QUERY: Customers who spent more than average
-- Syllabus: 3.3 Queries and Sub-Queries
-- ────────────────────────────────────────────────────────────
SELECT 
    CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
    total_spent
FROM customers c
JOIN (
    SELECT customer_id, SUM(total_amount) AS total_spent
    FROM service_orders
    WHERE status != 'cancelled'
    GROUP BY customer_id
) AS customer_totals ON c.customer_id = customer_totals.customer_id
WHERE total_spent > (
    SELECT AVG(total_amount)           -- ★ Scalar sub-query ★
    FROM service_orders 
    WHERE status != 'cancelled'
);

-- ────────────────────────────────────────────────────────────
-- 2. CORRELATED SUB-QUERY: Vehicles with no service history
-- ────────────────────────────────────────────────────────────
SELECT v.license_plate, v.make, v.model, 
       CONCAT(c.first_name, ' ', c.last_name) AS owner
FROM vehicles v
JOIN customers c ON v.customer_id = c.customer_id
WHERE NOT EXISTS (                      -- ★ Correlated sub-query ★
    SELECT 1 FROM service_orders so 
    WHERE so.vehicle_id = v.vehicle_id
);

-- ────────────────────────────────────────────────────────────
-- 3. SET OPERATIONS: UNION, INTERSECT simulation
-- Syllabus: 3.4 Set Operations
-- ────────────────────────────────────────────────────────────

-- UNION: All people in system (customers + mechanics)
SELECT first_name, last_name, email, 'Customer' AS role FROM customers
UNION
SELECT first_name, last_name, email, 'Mechanic' AS role FROM mechanics;

-- INTERSECT simulation: Customers who have both given feedback AND made payments
SELECT DISTINCT c.customer_id, CONCAT(c.first_name, ' ', c.last_name) AS name
FROM customers c
WHERE c.customer_id IN (SELECT customer_id FROM feedback)
  AND c.customer_id IN (SELECT customer_id FROM service_orders 
                         WHERE order_id IN (SELECT order_id FROM payments WHERE status='completed'));

-- EXCEPT simulation: Parts never used in any service
SELECT p.part_id, p.part_name, p.part_number
FROM parts p
WHERE p.part_id NOT IN (SELECT DISTINCT part_id FROM parts_used);

-- ────────────────────────────────────────────────────────────
-- 4. JOINS: All types demonstrated
-- Syllabus: 3.5 Relations (Joined, Derived)
-- ────────────────────────────────────────────────────────────

-- INNER JOIN: Orders with mechanic details
SELECT so.order_id, so.order_date, so.status,
       CONCAT(m.first_name, ' ', m.last_name) AS mechanic,
       ma.hours_worked
FROM service_orders so
INNER JOIN mechanic_assignments ma ON so.order_id = ma.order_id
INNER JOIN mechanics m ON ma.mechanic_id = m.mechanic_id;

-- LEFT JOIN: All customers with their orders (including those with no orders)
SELECT c.customer_id, CONCAT(c.first_name, ' ', c.last_name) AS customer,
       COALESCE(COUNT(so.order_id), 0) AS order_count,
       COALESCE(SUM(so.total_amount), 0) AS total_spent
FROM customers c
LEFT JOIN service_orders so ON c.customer_id = so.customer_id
GROUP BY c.customer_id, c.first_name, c.last_name;

-- RIGHT JOIN: All services with their usage count
SELECT s.service_name, s.base_price, 
       COALESCE(COUNT(sli.order_id), 0) AS times_used
FROM service_line_items sli
RIGHT JOIN services s ON sli.service_id = s.service_id
GROUP BY s.service_id, s.service_name, s.base_price;

-- SELF JOIN: Find mechanics in the same specialization
SELECT CONCAT(m1.first_name, ' ', m1.last_name) AS mechanic1,
       CONCAT(m2.first_name, ' ', m2.last_name) AS mechanic2,
       m1.specialization
FROM mechanics m1
JOIN mechanics m2 ON m1.specialization = m2.specialization 
                  AND m1.mechanic_id < m2.mechanic_id;

-- ★ 5-TABLE JOIN: Complete service order details ★
SELECT 
    so.order_id,
    CONCAT(c.first_name, ' ', c.last_name) AS customer,
    CONCAT(v.make, ' ', v.model) AS vehicle,
    v.license_plate,
    s.service_name,
    sli.line_total AS service_cost,
    CONCAT(m.first_name, ' ', m.last_name) AS mechanic
FROM service_orders so
JOIN customers c ON so.customer_id = c.customer_id
JOIN vehicles v ON so.vehicle_id = v.vehicle_id
JOIN service_line_items sli ON so.order_id = sli.order_id
JOIN services s ON sli.service_id = s.service_id
LEFT JOIN mechanic_assignments ma ON so.order_id = ma.order_id
LEFT JOIN mechanics m ON ma.mechanic_id = m.mechanic_id;

-- ────────────────────────────────────────────────────────────
-- 5. AGGREGATE FUNCTIONS with GROUP BY & HAVING
-- ────────────────────────────────────────────────────────────

-- Monthly revenue report
SELECT 
    DATE_FORMAT(p.payment_date, '%Y-%m') AS month,
    COUNT(*) AS total_transactions,
    SUM(p.amount) AS revenue,
    AVG(p.amount) AS avg_transaction,
    MIN(p.amount) AS min_transaction,
    MAX(p.amount) AS max_transaction
FROM payments p
WHERE p.status = 'completed'
GROUP BY DATE_FORMAT(p.payment_date, '%Y-%m')
HAVING revenue > 1000                    -- ★ HAVING clause ★
ORDER BY month DESC;

-- ────────────────────────────────────────────────────────────
-- 6. WINDOW FUNCTIONS (Advanced SQL)
-- ────────────────────────────────────────────────────────────
SELECT 
    order_id,
    customer_id,
    total_amount,
    order_date,
    SUM(total_amount) OVER (ORDER BY order_date) AS running_total,
    RANK() OVER (ORDER BY total_amount DESC) AS amount_rank,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY order_date) AS visit_number
FROM service_orders
WHERE status != 'cancelled';

-- ────────────────────────────────────────────────────────────
-- 7. DML OPERATIONS
-- Syllabus: 3.6 DDL and DML Commands
-- ────────────────────────────────────────────────────────────

-- UPDATE with sub-query: Apply 10% discount for customers with 3+ visits
UPDATE service_orders so
SET discount_amount = total_amount * 0.10
WHERE customer_id IN (
    SELECT customer_id FROM (
        SELECT customer_id, COUNT(*) AS visits
        FROM service_orders
        GROUP BY customer_id
        HAVING visits >= 3
    ) AS frequent_customers
)
AND status = 'pending';

-- DELETE with condition
-- DELETE FROM appointments WHERE status = 'cancelled' AND appointment_date < DATE_SUB(CURDATE(), INTERVAL 6 MONTH);

-- ────────────────────────────────────────────────────────────
-- 8. DCL COMMANDS (Role-based access)
-- Syllabus: 1.5 DCL
-- ────────────────────────────────────────────────────────────

-- Create database users with different privileges
-- CREATE USER 'admin_user'@'localhost' IDENTIFIED BY 'admin123';
-- CREATE USER 'receptionist'@'localhost' IDENTIFIED BY 'recep123';
-- CREATE USER 'mechanic_user'@'localhost' IDENTIFIED BY 'mech123';

-- GRANT: Admin gets full access
-- GRANT ALL PRIVILEGES ON auto_service_database.* TO 'admin_user'@'localhost';

-- GRANT: Receptionist gets limited access
-- GRANT SELECT, INSERT, UPDATE ON auto_service_database.customers TO 'receptionist'@'localhost';
-- GRANT SELECT, INSERT, UPDATE ON auto_service_database.appointments TO 'receptionist'@'localhost';
-- GRANT SELECT, INSERT ON auto_service_database.service_orders TO 'receptionist'@'localhost';
-- GRANT SELECT ON auto_service_database.vw_customer_service_history TO 'receptionist'@'localhost';

-- GRANT: Mechanic gets read-only on orders, write on assignments
-- GRANT SELECT ON auto_service_database.service_orders TO 'mechanic_user'@'localhost';
-- GRANT SELECT, UPDATE ON auto_service_database.mechanic_assignments TO 'mechanic_user'@'localhost';

-- REVOKE: Remove mechanic's ability to see payments
-- REVOKE SELECT ON auto_service_database.payments FROM 'mechanic_user'@'localhost';

-- FLUSH PRIVILEGES;
