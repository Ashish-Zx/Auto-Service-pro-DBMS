-- ============================================================
-- TRANSACTIONS & CONCURRENCY — Unit 7 Complete Demo
-- Demonstrates: ACID, Isolation Levels, Locks, Savepoints
-- ============================================================
USE auto_service_database;

-- ────────────────────────────────────────────────────────────
-- DEMO 1: ACID Transaction — Service Order Billing
-- ────────────────────────────────────────────────────────────
-- Atomicity: All operations succeed or all fail
-- Consistency: Inventory & totals stay correct
-- Isolation: Other transactions see consistent state
-- Durability: Once committed, changes persist

START TRANSACTION;

    -- Step 1: Create order
    INSERT INTO service_orders (vehicle_id, customer_id, estimated_completion)
    VALUES (2, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY));
    SET @new_order = LAST_INSERT_ID();
    
    SAVEPOINT after_order_creation;
    
    -- Step 2: Add service line items
    INSERT INTO service_line_items (order_id, line_number, service_id, quantity, unit_price)
    VALUES (@new_order, 1, 1, 1, 1500.00);
    
    INSERT INTO service_line_items (order_id, line_number, service_id, quantity, unit_price)
    VALUES (@new_order, 2, 10, 1, 1200.00);
    
    SAVEPOINT after_services;
    
    -- Step 3: Record parts used (triggers auto-deduct inventory)
    INSERT INTO parts_used (order_id, part_id, quantity_used, unit_price)
    VALUES (@new_order, 1, 1, 2500.00);
    
    INSERT INTO parts_used (order_id, part_id, quantity_used, unit_price)
    VALUES (@new_order, 2, 1, 350.00);
    
    -- Step 4: Assign mechanic
    INSERT INTO mechanic_assignments (order_id, mechanic_id)
    VALUES (@new_order, 1);

-- If anything goes wrong above, we can:
-- ROLLBACK TO after_services;  -- undo just parts
-- ROLLBACK TO after_order_creation;  -- undo services + parts
-- ROLLBACK;  -- undo everything

COMMIT;  -- ★ DURABILITY: Changes are now permanent ★

-- ────────────────────────────────────────────────────────────
-- DEMO 2: Isolation Levels
-- Syllabus: 7.3 Serializability
-- ────────────────────────────────────────────────────────────

-- Check current isolation level
SELECT @@transaction_isolation;

-- Set different levels (for demonstration)
-- SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;  -- Dirty reads possible
-- SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;    -- No dirty reads
-- SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ;   -- MySQL default
-- SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE;      -- Strictest

-- ────────────────────────────────────────────────────────────
-- DEMO 3: Lock Demonstration
-- Syllabus: 7.4 Lock Based Protocols
-- ────────────────────────────────────────────────────────────

-- Session 1: Lock a specific row (Exclusive Lock)
-- START TRANSACTION;
-- SELECT * FROM parts WHERE part_id = 1 FOR UPDATE;  -- ★ X-Lock ★
-- -- ... make changes ...
-- UPDATE parts SET quantity_in_stock = quantity_in_stock - 1 WHERE part_id = 1;
-- COMMIT;  -- Lock released

-- Session 2: Shared lock for reading
-- START TRANSACTION;
-- SELECT * FROM parts WHERE part_id = 1 LOCK IN SHARE MODE;  -- ★ S-Lock ★
-- COMMIT;

-- ────────────────────────────────────────────────────────────
-- DEMO 4: Deadlock Scenario (for explanation in viva)
-- Syllabus: 7.5 Deadlock Handling and Prevention
-- ────────────────────────────────────────────────────────────

-- Session A:                              Session B:
-- START TRANSACTION;                      START TRANSACTION;
-- UPDATE parts SET qty=qty-1              UPDATE parts SET qty=qty-1
--   WHERE part_id=1; (locks row 1)          WHERE part_id=2; (locks row 2)
-- UPDATE parts SET qty=qty-1              UPDATE parts SET qty=qty-1
--   WHERE part_id=2; (WAITS for B)          WHERE part_id=1; (WAITS for A)
-- ★ DEADLOCK! MySQL detects and rolls back one transaction ★

-- ────────────────────────────────────────────────────────────
-- DEMO 5: Crash Recovery Concepts
-- Syllabus: 8.2, 8.3 Log-based Recovery
-- ────────────────────────────────────────────────────────────

-- The audit_log table simulates a write-ahead log (WAL)
-- Every change is logged BEFORE being applied (via triggers)

-- View the audit log
SELECT * FROM audit_log ORDER BY changed_at DESC;

-- Simulate recovery: check what operations happened
SELECT log_id, table_name, operation, record_id, 
       old_values, new_values, changed_at
FROM audit_log 
WHERE table_name = 'service_orders'
ORDER BY changed_at DESC;
