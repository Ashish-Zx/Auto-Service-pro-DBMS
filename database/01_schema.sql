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
