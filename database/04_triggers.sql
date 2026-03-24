-- ============================================================
-- TRIGGERS — Demonstrates: Assertions, Auto-computation, Audit
-- Syllabus: 4.2 Assertions and Triggering
-- ============================================================
USE auto_service_database;

-- ────────────────────────────────────────────────────────────
-- TRIGGER 1: Auto-calculate line_total in service_line_items
-- ────────────────────────────────────────────────────────────
DELIMITER //
CREATE TRIGGER trg_calc_line_total
BEFORE INSERT ON service_line_items
FOR EACH ROW
BEGIN
    SET NEW.line_total = NEW.quantity * NEW.unit_price * (1 - NEW.discount_percent / 100);
END //
DELIMITER ;

-- Also on UPDATE
DELIMITER //
CREATE TRIGGER trg_calc_line_total_update
BEFORE UPDATE ON service_line_items
FOR EACH ROW
BEGIN
    SET NEW.line_total = NEW.quantity * NEW.unit_price * (1 - NEW.discount_percent / 100);
END //
DELIMITER ;

-- ────────────────────────────────────────────────────────────
-- TRIGGER 2: Auto-update total_amount in service_orders
--            when a service_line_item is inserted
-- ────────────────────────────────────────────────────────────
DELIMITER //
CREATE TRIGGER trg_update_order_total_after_line_insert
AFTER INSERT ON service_line_items
FOR EACH ROW
BEGIN
    UPDATE service_orders 
    SET total_labor_cost = (
            SELECT COALESCE(SUM(line_total), 0) 
            FROM service_line_items 
            WHERE order_id = NEW.order_id
        ),
        total_amount = (
            (SELECT COALESCE(SUM(line_total), 0) FROM service_line_items WHERE order_id = NEW.order_id)
            + total_parts_cost
        ) * (1 + tax_rate / 100) - discount_amount
    WHERE order_id = NEW.order_id;
END //
DELIMITER ;

-- ────────────────────────────────────────────────────────────
-- TRIGGER 3: Auto-deduct inventory when parts are used
-- ────────────────────────────────────────────────────────────
DELIMITER //
CREATE TRIGGER trg_deduct_inventory
AFTER INSERT ON parts_used
FOR EACH ROW
BEGIN
    UPDATE parts 
    SET quantity_in_stock = quantity_in_stock - NEW.quantity_used
    WHERE part_id = NEW.part_id;
    
    -- Log low stock warning to audit_log
    IF (SELECT quantity_in_stock FROM parts WHERE part_id = NEW.part_id) <= 
       (SELECT reorder_level FROM parts WHERE part_id = NEW.part_id) THEN
        INSERT INTO audit_log (table_name, operation, record_id, new_values)
        VALUES ('parts', 'UPDATE', NEW.part_id, 
                JSON_OBJECT('warning', 'LOW STOCK ALERT', 
                            'part_id', NEW.part_id,
                            'remaining_stock', 
                            (SELECT quantity_in_stock FROM parts WHERE part_id = NEW.part_id)));
    END IF;
END //
DELIMITER ;

-- ────────────────────────────────────────────────────────────
-- TRIGGER 4: Restore inventory when parts_used is deleted (refund)
-- ────────────────────────────────────────────────────────────
DELIMITER //
CREATE TRIGGER trg_restore_inventory
AFTER DELETE ON parts_used
FOR EACH ROW
BEGIN
    UPDATE parts 
    SET quantity_in_stock = quantity_in_stock + OLD.quantity_used
    WHERE part_id = OLD.part_id;
END //
DELIMITER ;

-- ────────────────────────────────────────────────────────────
-- TRIGGER 5: Update mechanic status when assigned to order
-- ────────────────────────────────────────────────────────────
DELIMITER //
CREATE TRIGGER trg_mechanic_busy_on_assign
AFTER INSERT ON mechanic_assignments
FOR EACH ROW
BEGIN
    UPDATE mechanics SET status = 'busy' WHERE mechanic_id = NEW.mechanic_id;
END //
DELIMITER ;

-- ────────────────────────────────────────────────────────────
-- TRIGGER 6: Audit log for service_order status changes
-- ────────────────────────────────────────────────────────────
DELIMITER //
CREATE TRIGGER trg_audit_order_status
AFTER UPDATE ON service_orders
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO audit_log (table_name, operation, record_id, old_values, new_values)
        VALUES ('service_orders', 'UPDATE', NEW.order_id,
                JSON_OBJECT('status', OLD.status, 'total_amount', OLD.total_amount),
                JSON_OBJECT('status', NEW.status, 'total_amount', NEW.total_amount));
    END IF;
END //
DELIMITER ;
