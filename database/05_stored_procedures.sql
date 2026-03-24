-- ============================================================
-- STORED PROCEDURES — Demonstrates: Procedural SQL, ACID Transactions
-- Syllabus: 3.7 Embedded SQL, 7.1 ACID Properties
-- ============================================================
USE auto_service_database;

-- ────────────────────────────────────────────────────────────
-- PROCEDURE 1: Create Complete Service Order (ACID Transaction)
-- Demonstrates: START TRANSACTION, COMMIT, ROLLBACK, SAVEPOINT
-- ────────────────────────────────────────────────────────────
DELIMITER //
CREATE PROCEDURE sp_create_service_order(
    IN p_appointment_id INT,
    IN p_vehicle_id INT,
    IN p_customer_id INT,
    IN p_mechanic_id INT,
    IN p_service_id INT,
    IN p_estimated_days INT,
    OUT p_order_id INT,
    OUT p_result VARCHAR(100)
)
BEGIN
    DECLARE v_service_price DECIMAL(10,2);
    DECLARE v_mechanic_status VARCHAR(20);
    
    -- Error handler for ROLLBACK
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result = 'ERROR: Transaction rolled back due to failure';
    END;
    
    -- ★ START TRANSACTION — ACID begins here ★
    START TRANSACTION;
    
    -- Check if mechanic is available
    SELECT status INTO v_mechanic_status 
    FROM mechanics WHERE mechanic_id = p_mechanic_id;
    
    IF v_mechanic_status != 'available' THEN
        ROLLBACK;
        SET p_result = 'ERROR: Mechanic is not available';
        SET p_order_id = NULL;
    ELSE
        -- Get service price
        SELECT base_price INTO v_service_price 
        FROM services WHERE service_id = p_service_id;
        
        -- SAVEPOINT before order creation
        SAVEPOINT before_order;
        
        -- Create the service order
        INSERT INTO service_orders (appointment_id, vehicle_id, customer_id, 
                                     estimated_completion, notes)
        VALUES (p_appointment_id, p_vehicle_id, p_customer_id,
                DATE_ADD(CURDATE(), INTERVAL p_estimated_days DAY),
                'Created via stored procedure');
        
        SET p_order_id = LAST_INSERT_ID();
        
        -- SAVEPOINT before line items
        SAVEPOINT before_line_items;
        
        -- Add service line item
        INSERT INTO service_line_items (order_id, line_number, service_id, 
                                         quantity, unit_price)
        VALUES (p_order_id, 1, p_service_id, 1, v_service_price);
        
        -- Assign mechanic
        INSERT INTO mechanic_assignments (order_id, mechanic_id)
        VALUES (p_order_id, p_mechanic_id);
        
        -- Update appointment status
        IF p_appointment_id IS NOT NULL THEN
            UPDATE appointments SET status = 'in_progress' 
            WHERE appointment_id = p_appointment_id;
        END IF;
        
        -- ★ COMMIT — All or nothing ★
        COMMIT;
        SET p_result = CONCAT('SUCCESS: Order #', p_order_id, ' created');
    END IF;
END //
DELIMITER ;

-- ────────────────────────────────────────────────────────────
-- PROCEDURE 2: Complete Order & Generate Invoice
-- Demonstrates: Complex transaction with multiple table updates
-- ────────────────────────────────────────────────────────────
DELIMITER //
CREATE PROCEDURE sp_complete_order(
    IN p_order_id INT,
    IN p_payment_method VARCHAR(20),
    OUT p_invoice_amount DECIMAL(10,2),
    OUT p_result VARCHAR(200)
)
BEGIN
    DECLARE v_labor_cost DECIMAL(10,2);
    DECLARE v_parts_cost DECIMAL(10,2);
    DECLARE v_tax_rate DECIMAL(4,2);
    DECLARE v_discount DECIMAL(10,2);
    DECLARE v_total DECIMAL(10,2);
    DECLARE v_mechanic_id INT;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_result = 'ERROR: Invoice generation failed, transaction rolled back';
        SET p_invoice_amount = 0;
    END;
    
    START TRANSACTION;
    
    -- Calculate labor cost from line items
    SELECT COALESCE(SUM(line_total), 0) INTO v_labor_cost
    FROM service_line_items WHERE order_id = p_order_id;
    
    -- Calculate parts cost
    SELECT COALESCE(SUM(quantity_used * unit_price), 0) INTO v_parts_cost
    FROM parts_used WHERE order_id = p_order_id;
    
    -- Get order details
    SELECT tax_rate, discount_amount INTO v_tax_rate, v_discount
    FROM service_orders WHERE order_id = p_order_id;
    
    -- Calculate total
    SET v_total = (v_labor_cost + v_parts_cost) * (1 + v_tax_rate / 100) - v_discount;
    
    -- Update service order
    UPDATE service_orders 
    SET status = 'completed',
        actual_completion = NOW(),
        total_labor_cost = v_labor_cost,
        total_parts_cost = v_parts_cost,
        total_amount = v_total
    WHERE order_id = p_order_id;
    
    -- Create payment record
    INSERT INTO payments (order_id, amount, payment_method, 
                          transaction_ref, status)
    VALUES (p_order_id, v_total, p_payment_method,
            CONCAT('TXN-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', p_order_id),
            'completed');
    
    -- Free up assigned mechanics
    UPDATE mechanics m
    JOIN mechanic_assignments ma ON m.mechanic_id = ma.mechanic_id
    SET m.status = 'available'
    WHERE ma.order_id = p_order_id;
    
    COMMIT;
    
    SET p_invoice_amount = v_total;
    SET p_result = CONCAT('SUCCESS: Order #', p_order_id, 
                          ' completed. Invoice: Rs.', FORMAT(v_total, 2));
END //
DELIMITER ;

-- ────────────────────────────────────────────────────────────
-- PROCEDURE 3: Get Customer Report (with cursor)
-- ────────────────────────────────────────────────────────────
DELIMITER //
CREATE PROCEDURE sp_customer_report(IN p_customer_id INT)
BEGIN
    -- Customer info
    SELECT 
        CONCAT(first_name, ' ', last_name) AS customer_name,
        email, phone,
        CONCAT(address_street, ', ', address_city, ', ', address_state) AS address
    FROM customers 
    WHERE customer_id = p_customer_id;
    
    -- All vehicles
    SELECT vehicle_id, license_plate, 
           CONCAT(make, ' ', model) AS vehicle, year, mileage
    FROM vehicles 
    WHERE customer_id = p_customer_id;
    
    -- Service history with totals
    SELECT 
        so.order_id, so.order_date, so.status,
        v.license_plate,
        so.total_amount,
        COALESCE(f.rating, 0) AS rating
    FROM service_orders so
    JOIN vehicles v ON so.vehicle_id = v.vehicle_id
    LEFT JOIN feedback f ON so.order_id = f.order_id
    WHERE so.customer_id = p_customer_id
    ORDER BY so.order_date DESC;
    
    -- Summary
    SELECT 
        COUNT(*) AS total_visits,
        SUM(total_amount) AS total_spent,
        AVG(total_amount) AS avg_order_value,
        MAX(order_date) AS last_visit
    FROM service_orders 
    WHERE customer_id = p_customer_id AND status != 'cancelled';
END //
DELIMITER ;
