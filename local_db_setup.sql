CREATE DATABASE IF NOT EXISTS auto_service_database;
USE auto_service_database;

-- ============================================================
-- Garage Pilot - Complete Database Schema
-- Covers: DDL, Constraints, Keys, Weak Entity, Normalization
-- ============================================================

CREATE DATABASE IF NOT EXISTS auto_service_database CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE auto_service_database;

-- ============================================================
-- 1. CUSTOMERS TABLE
-- Demonstrates: Primary Key, UNIQUE, NOT NULL, Composite Attribute (address)
-- ============================================================
CREATE TABLE customers (
    customer_id    INT AUTO_INCREMENT PRIMARY KEY,
    first_name     VARCHAR(50) NOT NULL,
    last_name      VARCHAR(50) NOT NULL,
    email          VARCHAR(100) UNIQUE NOT NULL,
    phone          VARCHAR(15) NOT NULL,
    address_street VARCHAR(100),
    address_city   VARCHAR(50),
    address_state  VARCHAR(50),
    address_zip    VARCHAR(10),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. VEHICLES TABLE
-- Demonstrates: Foreign Key, ON DELETE CASCADE, UNIQUE, Candidate Key (VIN)
-- ============================================================
CREATE TABLE vehicles (
    vehicle_id    INT AUTO_INCREMENT PRIMARY KEY,
    customer_id   INT NOT NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    make          VARCHAR(50) NOT NULL,
    model         VARCHAR(50) NOT NULL,
    year          INT NOT NULL,
    color         VARCHAR(30),
    vin           VARCHAR(17) UNIQUE,                    -- Candidate Key
    mileage       INT DEFAULT 0,
    fuel_type     ENUM('petrol','diesel','electric','hybrid') DEFAULT 'petrol',
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) 
        ON DELETE CASCADE
);

-- ============================================================
-- 3. MECHANICS TABLE
-- Demonstrates: ENUM, CHECK constraint, DEFAULT
-- ============================================================
CREATE TABLE mechanics (
    mechanic_id    INT AUTO_INCREMENT PRIMARY KEY,
    first_name     VARCHAR(50) NOT NULL,
    last_name      VARCHAR(50) NOT NULL,
    email          VARCHAR(100) UNIQUE,
    phone          VARCHAR(15),
    specialization VARCHAR(100),
    hire_date      DATE NOT NULL,
    hourly_rate    DECIMAL(8,2) NOT NULL CHECK (hourly_rate > 0),
    status         ENUM('available','busy','on_leave') DEFAULT 'available',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. SERVICE_CATEGORIES TABLE
-- ============================================================
CREATE TABLE service_categories (
    category_id   INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description   TEXT
);

-- ============================================================
-- 5. SERVICES TABLE
-- Demonstrates: Foreign Key to category (1:N)
-- ============================================================
CREATE TABLE services (
    service_id      INT AUTO_INCREMENT PRIMARY KEY,
    category_id     INT,
    service_name    VARCHAR(100) NOT NULL,
    description     TEXT,
    base_price      DECIMAL(10,2) NOT NULL CHECK (base_price >= 0),
    estimated_hours DECIMAL(4,2) DEFAULT 1.00,
    FOREIGN KEY (category_id) REFERENCES service_categories(category_id)
        ON DELETE SET NULL
);

-- ============================================================
-- 6. SUPPLIERS TABLE
-- Demonstrates: CHECK constraint on rating
-- ============================================================
CREATE TABLE suppliers (
    supplier_id    INT AUTO_INCREMENT PRIMARY KEY,
    company_name   VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email          VARCHAR(100) UNIQUE,
    phone          VARCHAR(15),
    address        TEXT,
    rating         DECIMAL(2,1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. PARTS (Inventory) TABLE
-- Demonstrates: CHECK constraint, reorder_level for trigger
-- ============================================================
CREATE TABLE parts (
    part_id           INT AUTO_INCREMENT PRIMARY KEY,
    part_name         VARCHAR(100) NOT NULL,
    part_number       VARCHAR(50) UNIQUE NOT NULL,
    description       TEXT,
    unit_price        DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    quantity_in_stock INT DEFAULT 0 CHECK (quantity_in_stock >= 0),
    reorder_level     INT DEFAULT 10,
    supplier_id       INT,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
        ON DELETE SET NULL
);

-- ============================================================
-- 8. APPOINTMENTS TABLE
-- Demonstrates: Multiple Foreign Keys, ENUM status
-- ============================================================
CREATE TABLE appointments (
    appointment_id   INT AUTO_INCREMENT PRIMARY KEY,
    customer_id      INT NOT NULL,
    vehicle_id       INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status           ENUM('scheduled','confirmed','in_progress','completed','cancelled') 
                     DEFAULT 'scheduled',
    notes            TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
);

-- ============================================================
-- 9. SERVICE_ORDERS TABLE (Central Entity)
-- Demonstrates: Multiple FKs, Derived attribute (total_amount), ENUM
-- ============================================================
CREATE TABLE service_orders (
    order_id              INT AUTO_INCREMENT PRIMARY KEY,
    appointment_id        INT,
    vehicle_id            INT NOT NULL,
    customer_id           INT NOT NULL,                      -- Denormalized for query performance (avoids JOIN through vehicles)
    order_date            DATETIME DEFAULT CURRENT_TIMESTAMP,
    status                ENUM('pending','in_progress','completed','delivered','cancelled') 
                          DEFAULT 'pending',
    estimated_completion  DATE,
    actual_completion     DATETIME,
    total_labor_cost      DECIMAL(10,2) DEFAULT 0.00,
    total_parts_cost      DECIMAL(10,2) DEFAULT 0.00,
    tax_rate              DECIMAL(4,2) DEFAULT 13.00,
    discount_amount       DECIMAL(10,2) DEFAULT 0.00,
    total_amount          DECIMAL(10,2) DEFAULT 0.00,       -- Derived Attribute
    notes                 TEXT,
    updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id),
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- ============================================================
-- 10. SERVICE_LINE_ITEMS TABLE — ★ WEAK ENTITY ★
-- Demonstrates: Composite Primary Key, Weak entity depends on ServiceOrder
-- ============================================================
CREATE TABLE service_line_items (
    order_id         INT NOT NULL,
    line_number      INT NOT NULL,                        -- Partial key
    service_id       INT NOT NULL,
    quantity         INT DEFAULT 1 CHECK (quantity > 0),
    unit_price       DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(4,2) DEFAULT 0.00,
    line_total       DECIMAL(10,2),                        -- Derived
    PRIMARY KEY (order_id, line_number),                   -- ★ Composite PK ★
    FOREIGN KEY (order_id) REFERENCES service_orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(service_id)
);

-- ============================================================
-- 11. MECHANIC_ASSIGNMENTS — ★ M:N Junction Table ★
-- Demonstrates: Composite Primary Key for M:N relationship
-- ============================================================
CREATE TABLE mechanic_assignments (
    order_id      INT NOT NULL,
    mechanic_id   INT NOT NULL,
    assigned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    hours_worked  DECIMAL(5,2) DEFAULT 0.00,
    task_notes    TEXT,
    PRIMARY KEY (order_id, mechanic_id),                   -- ★ Composite PK ★
    FOREIGN KEY (order_id) REFERENCES service_orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (mechanic_id) REFERENCES mechanics(mechanic_id)
);

-- ============================================================
-- 12. PARTS_USED — ★ M:N Junction Table ★
-- Demonstrates: M:N between ServiceOrder and Parts
-- ============================================================
CREATE TABLE parts_used (
    usage_id      INT AUTO_INCREMENT PRIMARY KEY,
    order_id      INT NOT NULL,
    part_id       INT NOT NULL,
    quantity_used INT NOT NULL CHECK (quantity_used > 0),
    unit_price    DECIMAL(10,2) NOT NULL,         -- Price snapshot at time of service (intentional — differs from parts.unit_price)
    FOREIGN KEY (order_id) REFERENCES service_orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (part_id) REFERENCES parts(part_id)
);

-- ============================================================
-- 13. PAYMENTS TABLE
-- Demonstrates: Payment tracking, ENUM for method
-- ============================================================
CREATE TABLE payments (
    payment_id     INT AUTO_INCREMENT PRIMARY KEY,
    order_id       INT NOT NULL,
    payment_date   DATETIME DEFAULT CURRENT_TIMESTAMP,
    amount         DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method ENUM('cash','card','upi','bank_transfer') NOT NULL,
    transaction_ref VARCHAR(100),
    status         ENUM('pending','completed','refunded','failed') DEFAULT 'pending',
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES service_orders(order_id)
);

-- ============================================================
-- 14. FEEDBACK TABLE
-- Demonstrates: 1:1 relationship (one feedback per order), CHECK
-- ============================================================
CREATE TABLE feedback (
    feedback_id   INT AUTO_INCREMENT PRIMARY KEY,
    order_id      INT NOT NULL UNIQUE,                     -- ★ 1:1 with service_order ★
    customer_id   INT NOT NULL,
    rating        INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comments      TEXT,
    feedback_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES service_orders(order_id),
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- ============================================================
-- 15. USERS TABLE (Authentication & Authorization)
-- Demonstrates: Role-based access (DCL concepts)
-- ============================================================
CREATE TABLE users (
    user_id       INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('admin','receptionist','mechanic') NOT NULL,
    mechanic_id   INT,
    is_active     BOOLEAN DEFAULT TRUE,
    last_login    DATETIME,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mechanic_id) REFERENCES mechanics(mechanic_id)
);

-- ============================================================
-- 16. AUDIT_LOG TABLE (Crash Recovery & Logging)
-- Demonstrates: Transaction logging for recovery concepts
-- ============================================================
CREATE TABLE audit_log (
    log_id      INT AUTO_INCREMENT PRIMARY KEY,
    table_name  VARCHAR(50) NOT NULL,
    operation   ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    record_id   INT,
    user_id     INT,                                     -- ★ Connected to Users (New Relation) ★
    old_values  JSON,
    new_values  JSON,
    changed_by  VARCHAR(50) DEFAULT 'system',
    changed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);
-- ============================================================
-- SAMPLE DATA — Demonstrates DML (INSERT)
-- ============================================================
USE auto_service_database;

-- Customers
INSERT INTO customers (first_name, last_name, email, phone, address_street, address_city, address_state, address_zip) VALUES
('Rahul',    'Sharma',   'rahul.sharma@email.com',   '9801234567', '123 MG Road',        'Kathmandu',  'Bagmati',    '44600'),
('Priya',    'Patel',    'priya.patel@email.com',    '9807654321', '456 Lake Road',      'Pokhara',    'Gandaki',    '33700'),
('Amit',     'Singh',    'amit.singh@email.com',     '9812345678', '789 Ring Road',      'Lalitpur',   'Bagmati',    '44700'),
('Sneha',    'Gupta',    'sneha.gupta@email.com',    '9823456789', '321 Durbar Marg',    'Kathmandu',  'Bagmati',    '44600'),
('Vikram',   'Thapa',    'vikram.thapa@email.com',   '9834567890', '654 New Road',       'Bhaktapur',  'Bagmati',    '44800'),
('Anita',    'Rai',      'anita.rai@email.com',      '9845678901', '987 Thamel',         'Kathmandu',  'Bagmati',    '44600'),
('Deepak',   'KC',       'deepak.kc@email.com',      '9856789012', '147 Baneshwor',      'Kathmandu',  'Bagmati',    '44600'),
('Sita',     'Adhikari', 'sita.adhikari@email.com',  '9867890123', '258 Kupondole',      'Lalitpur',   'Bagmati',    '44700');

-- Vehicles
INSERT INTO vehicles (customer_id, license_plate, make, model, year, color, vin, mileage, fuel_type) VALUES
(1, 'BA-1-JA-1234',  'Toyota',    'Corolla',   2020, 'White',  '1HGBH41JXMN109186', 35000, 'petrol'),
(1, 'BA-1-JA-5678',  'Honda',     'City',      2022, 'Silver', '2HGBH41JXMN109187', 15000, 'petrol'),
(2, 'GA-1-KA-2345',  'Hyundai',   'Creta',     2021, 'Blue',   '3HGBH41JXMN109188', 28000, 'diesel'),
(3, 'BA-2-PA-3456',  'Suzuki',    'Swift',     2019, 'Red',    '4HGBH41JXMN109189', 52000, 'petrol'),
(4, 'BA-1-JA-7890',  'Kia',       'Seltos',    2023, 'Black',  '5HGBH41JXMN109190', 8000,  'diesel'),
(5, 'BA-3-CHA-1111', 'Tata',      'Nexon EV',  2023, 'Green',  '6HGBH41JXMN109191', 12000, 'electric'),
(6, 'BA-1-JA-2222',  'Mahindra',  'XUV700',    2022, 'White',  '7HGBH41JXMN109192', 20000, 'diesel'),
(7, 'BA-1-JA-3333',  'Toyota',    'Fortuner',  2021, 'Grey',   '8HGBH41JXMN109193', 45000, 'diesel'),
(8, 'BA-2-PA-4444',  'Honda',     'WR-V',      2020, 'Brown',  '9HGBH41JXMN109194', 38000, 'petrol');

-- Mechanics
INSERT INTO mechanics (first_name, last_name, email, phone, specialization, hire_date, hourly_rate, status) VALUES
('Bijay',   'Tamang',   'bijay.t@autoservice.com',   '9871111111', 'Engine Specialist',     '2020-03-15', 500.00,  'available'),
('Ram',     'Maharjan',  'ram.m@autoservice.com',    '9872222222', 'Electrical Systems',    '2019-07-20', 450.00,  'available'),
('Krishna', 'Shrestha', 'krishna.s@autoservice.com', '9873333333', 'Body & Paint',          '2021-01-10', 400.00,  'available'),
('Sunil',   'Gurung',   'sunil.g@autoservice.com',   '9874444444', 'Transmission & Brakes', '2018-11-05', 550.00,  'busy'),
('Prakash', 'Lama',     'prakash.l@autoservice.com',  '9875555555', 'General Mechanic',     '2022-06-01', 350.00,  'available');

-- Service Categories
INSERT INTO service_categories (category_name, description) VALUES
('Routine Maintenance', 'Regular scheduled maintenance services'),
('Engine Repair',       'Engine-related repair and diagnostics'),
('Electrical',          'Electrical system repairs and diagnostics'),
('Body & Paint',        'Body work, dent repair, and painting'),
('Tires & Alignment',   'Tire services and wheel alignment'),
('AC & Cooling',        'Air conditioning and cooling system services');

-- Services
INSERT INTO services (category_id, service_name, description, base_price, estimated_hours) VALUES
(1, 'Oil Change',              'Engine oil and filter replacement',        1500.00,  0.50),
(1, 'Full Service',            'Complete vehicle checkup and maintenance',  5000.00,  3.00),
(1, 'Brake Pad Replacement',   'Front and rear brake pad replacement',     3000.00,  1.50),
(2, 'Engine Diagnostics',      'Complete engine diagnostic scan',          2000.00,  1.00),
(2, 'Engine Overhaul',         'Full engine rebuild',                      50000.00, 24.00),
(3, 'Battery Replacement',     'Car battery testing and replacement',      1500.00,  0.50),
(3, 'Alternator Repair',       'Alternator testing and repair',            3500.00,  2.00),
(4, 'Dent Removal',            'Paintless dent removal',                   2500.00,  2.00),
(4, 'Full Body Paint',         'Complete vehicle repainting',              35000.00, 48.00),
(5, 'Wheel Alignment',         '4-wheel alignment',                        1200.00,  1.00),
(5, 'Tire Rotation',           'Rotate all 4 tires',                       800.00,   0.50),
(6, 'AC Gas Refill',           'AC refrigerant recharge',                  2500.00,  1.00),
(6, 'AC Compressor Repair',    'AC compressor repair/replacement',         8000.00,  4.00);

-- Suppliers
INSERT INTO suppliers (company_name, contact_person, email, phone, address, rating) VALUES
('Nepal Auto Parts Co.',   'Ramesh Basnet',   'ramesh@nepalparts.com',   '0141234567', 'Teku, Kathmandu',   4.5),
('Himalayan Motors Supply','Sanjay Joshi',    'sanjay@himalayanms.com',  '0142345678', 'Balaju, Kathmandu', 4.2),
('Eastern Auto Traders',   'Bikash Tamang',   'bikash@easternaut.com',   '0213456789', 'Biratnagar',        3.8),
('Quality Spares Nepal',   'Pradeep Shrestha','pradeep@qualityspares.com','0144567890','Tripureshwor, KTM', 4.7);

-- Parts
INSERT INTO parts (part_name, part_number, description, unit_price, quantity_in_stock, reorder_level, supplier_id) VALUES
('Engine Oil 5W-30 (4L)',   'OIL-5W30-4L',   'Synthetic engine oil 4 liters',    2500.00,  50, 10, 1),
('Oil Filter - Universal',  'FLT-OIL-UNI',   'Universal fit oil filter',          350.00,  100, 20, 1),
('Brake Pad Set (Front)',   'BRK-PAD-FRT',   'Front brake pads - ceramic',        2200.00,  30, 8,  2),
('Brake Pad Set (Rear)',    'BRK-PAD-RR',    'Rear brake pads - ceramic',         1800.00,  25, 8,  2),
('Car Battery 60Ah',        'BAT-60AH',      '12V 60Ah car battery',             7500.00,  15, 5,  3),
('Air Filter',              'FLT-AIR-UNI',   'Universal air filter',              600.00,   80, 15, 1),
('Spark Plug Set (4)',      'SPK-PLG-4',     'Iridium spark plugs set of 4',      1200.00,  40, 10, 4),
('AC Refrigerant R134a',    'AC-R134A',      'AC gas refrigerant can',            1500.00,  20, 5,  3),
('Alternator Assembly',     'ALT-ASSY',      'Alternator assembly unit',          8000.00,  8,  3,  2),
('Timing Belt Kit',         'TMG-BELT-KIT',  'Timing belt with tensioner kit',    3500.00,  12, 4,  4),
('Coolant 2L',              'COOL-2L',       'Radiator coolant 2 liters',         800.00,   35, 10, 1),
('Wiper Blade Pair',        'WPR-BLD-PR',    'Front wiper blade pair',            700.00,   45, 10, 4);

-- Appointments
INSERT INTO appointments (customer_id, vehicle_id, appointment_date, appointment_time, status, notes) VALUES
(1, 1, '2024-12-20', '09:00:00', 'completed',  'Regular oil change'),
(2, 3, '2024-12-21', '10:30:00', 'completed',  'AC not cooling properly'),
(3, 4, '2024-12-22', '11:00:00', 'completed',  'Brakes making noise'),
(1, 2, '2025-01-05', '09:30:00', 'confirmed',  'Full service due'),
(4, 5, '2025-01-06', '14:00:00', 'scheduled',  'First service'),
(5, 6, '2025-01-07', '10:00:00', 'scheduled',  'Battery check for EV'),
(6, 7, '2025-01-08', '11:30:00', 'scheduled',  'Engine light on');

-- Service Orders
INSERT INTO service_orders (appointment_id, vehicle_id, customer_id, order_date, status, 
    estimated_completion, actual_completion, total_labor_cost, total_parts_cost, 
    tax_rate, discount_amount, total_amount, notes) VALUES
(1, 1, 1, '2024-12-20 09:15:00', 'delivered', '2024-12-20', '2024-12-20 10:00:00',
    500.00, 2850.00, 13.00, 0.00, 3785.50, 'Oil change completed'),
(2, 3, 2, '2024-12-21 10:45:00', 'delivered', '2024-12-21', '2024-12-21 12:30:00',
    1000.00, 1500.00, 13.00, 200.00, 2599.00, 'AC gas refilled'),
(3, 4, 3, '2024-12-22 11:15:00', 'completed', '2024-12-22', '2024-12-22 13:00:00',
    750.00, 2200.00, 13.00, 0.00, 3333.50, 'Front brake pads replaced');

-- Service Line Items (weak entity with composite PK)
INSERT INTO service_line_items (order_id, line_number, service_id, quantity, unit_price, discount_percent, line_total) VALUES
(1, 1, 1, 1, 1500.00, 0.00, 1500.00),    -- Oil Change for Order 1
(2, 1, 12, 1, 2500.00, 0.00, 2500.00),   -- AC Gas Refill for Order 2
(3, 1, 3, 1, 3000.00, 0.00, 3000.00),    -- Brake Pad Replacement for Order 3
(3, 2, 10, 1, 1200.00, 0.00, 1200.00);   -- Wheel Alignment added to Order 3

-- Mechanic Assignments (M:N with composite PK)
INSERT INTO mechanic_assignments (order_id, mechanic_id, hours_worked, task_notes) VALUES
(1, 1, 0.75, 'Oil change completed smoothly'),
(2, 2, 1.50, 'AC system recharged'),
(3, 4, 1.50, 'Brake pads replaced'),
(3, 1, 1.00, 'Wheel alignment done');

-- Parts Used
INSERT INTO parts_used (order_id, part_id, quantity_used, unit_price) VALUES
(1, 1, 1, 2500.00),   -- Oil for Order 1
(1, 2, 1, 350.00),    -- Oil Filter for Order 1
(2, 8, 1, 1500.00),   -- AC Refrigerant for Order 2
(3, 3, 1, 2200.00);   -- Brake Pads for Order 3

-- Payments
INSERT INTO payments (order_id, payment_date, amount, payment_method, transaction_ref, status) VALUES
(1, '2024-12-20 10:15:00', 3785.50, 'card',  'TXN-20241220-001', 'completed'),
(2, '2024-12-21 12:45:00', 2599.00, 'upi',   'TXN-20241221-001', 'completed'),
(3, '2024-12-22 13:30:00', 3333.50, 'cash',   NULL,               'completed');

-- Feedback
INSERT INTO feedback (order_id, customer_id, rating, comments) VALUES
(1, 1, 5, 'Excellent service! Quick and professional.'),
(2, 2, 4, 'Good work on AC. Slightly delayed but satisfactory.'),
(3, 3, 5, 'Brakes feel brand new. Very happy with the service.');

-- Users
INSERT INTO users (username, password_hash, role, mechanic_id) VALUES
('admin',       '$2a$10$xNLOLTrIL.fDr6B7RTlLHe2XOmXUKGq48KyPDuWimdxsVbJgk4E8u', 'admin',        NULL),
('reception1',  '$2a$10$xNLOLTrIL.fDr6B7RTlLHe2XOmXUKGq48KyPDuWimdxsVbJgk4E8u', 'receptionist', NULL),
('bijay_mech',  '$2a$10$xNLOLTrIL.fDr6B7RTlLHe2XOmXUKGq48KyPDuWimdxsVbJgk4E8u', 'mechanic',     1),
('ram_mech',    '$2a$10$xNLOLTrIL.fDr6B7RTlLHe2XOmXUKGq48KyPDuWimdxsVbJgk4E8u', 'mechanic',     2);
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
