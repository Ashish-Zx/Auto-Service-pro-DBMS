const { adminDb, getTenantDb } = require('../config/db');

const TENANT_TABLES = [
    `CREATE TABLE IF NOT EXISTS customers (
        customer_id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        phone VARCHAR(15) NOT NULL,
        address_street VARCHAR(100),
        address_city VARCHAR(50),
        address_state VARCHAR(50),
        address_zip VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS vehicles (
        vehicle_id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        license_plate VARCHAR(20) UNIQUE NOT NULL,
        make VARCHAR(50) NOT NULL,
        model VARCHAR(50) NOT NULL,
        year INT NOT NULL,
        color VARCHAR(30),
        vin VARCHAR(17) UNIQUE,
        mileage INT DEFAULT 0,
        fuel_type ENUM('petrol','diesel','electric','hybrid') DEFAULT 'petrol',
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS mechanics (
        mechanic_id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE,
        phone VARCHAR(15),
        specialization VARCHAR(100),
        hire_date DATE NOT NULL,
        hourly_rate DECIMAL(8,2) NOT NULL,
        status ENUM('available','busy','on_leave') DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS service_categories (
        category_id INT AUTO_INCREMENT PRIMARY KEY,
        category_name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS services (
        service_id INT AUTO_INCREMENT PRIMARY KEY,
        category_id INT,
        service_name VARCHAR(100) NOT NULL,
        description TEXT,
        base_price DECIMAL(10,2) NOT NULL,
        estimated_hours DECIMAL(4,2) DEFAULT 1.00,
        FOREIGN KEY (category_id) REFERENCES service_categories(category_id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS suppliers (
        supplier_id INT AUTO_INCREMENT PRIMARY KEY,
        company_name VARCHAR(100) NOT NULL,
        contact_person VARCHAR(100),
        email VARCHAR(100) UNIQUE,
        phone VARCHAR(15),
        address TEXT,
        rating DECIMAL(2,1) DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS parts (
        part_id INT AUTO_INCREMENT PRIMARY KEY,
        part_name VARCHAR(100) NOT NULL,
        part_number VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        unit_price DECIMAL(10,2) NOT NULL,
        quantity_in_stock INT DEFAULT 0,
        reorder_level INT DEFAULT 10,
        supplier_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS appointments (
        appointment_id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        vehicle_id INT NOT NULL,
        appointment_date DATE NOT NULL,
        appointment_time TIME NOT NULL,
        status ENUM('scheduled','confirmed','in_progress','completed','cancelled') DEFAULT 'scheduled',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
    )`,
    `CREATE TABLE IF NOT EXISTS service_orders (
        order_id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT,
        vehicle_id INT NOT NULL,
        customer_id INT NOT NULL,
        order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status ENUM('pending','in_progress','completed','delivered','cancelled') DEFAULT 'pending',
        estimated_completion DATE,
        actual_completion DATETIME,
        total_labor_cost DECIMAL(10,2) DEFAULT 0.00,
        total_parts_cost DECIMAL(10,2) DEFAULT 0.00,
        tax_rate DECIMAL(4,2) DEFAULT 13.00,
        discount_amount DECIMAL(10,2) DEFAULT 0.00,
        total_amount DECIMAL(10,2) DEFAULT 0.00,
        notes TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id),
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id),
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    )`,
    `CREATE TABLE IF NOT EXISTS service_line_items (
        order_id INT NOT NULL,
        line_number INT NOT NULL,
        service_id INT NOT NULL,
        quantity INT DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        discount_percent DECIMAL(4,2) DEFAULT 0.00,
        line_total DECIMAL(10,2),
        PRIMARY KEY (order_id, line_number),
        FOREIGN KEY (order_id) REFERENCES service_orders(order_id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services(service_id)
    )`,
    `CREATE TABLE IF NOT EXISTS mechanic_assignments (
        order_id INT NOT NULL,
        mechanic_id INT NOT NULL,
        assigned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        hours_worked DECIMAL(5,2) DEFAULT 0.00,
        task_notes TEXT,
        PRIMARY KEY (order_id, mechanic_id),
        FOREIGN KEY (order_id) REFERENCES service_orders(order_id) ON DELETE CASCADE,
        FOREIGN KEY (mechanic_id) REFERENCES mechanics(mechanic_id)
    )`,
    `CREATE TABLE IF NOT EXISTS parts_used (
        usage_id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        part_id INT NOT NULL,
        quantity_used INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (order_id) REFERENCES service_orders(order_id) ON DELETE CASCADE,
        FOREIGN KEY (part_id) REFERENCES parts(part_id)
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
        payment_id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        amount DECIMAL(10,2) NOT NULL,
        payment_method ENUM('cash','card','upi','bank_transfer') NOT NULL,
        transaction_ref VARCHAR(100),
        status ENUM('pending','completed','refunded','failed') DEFAULT 'pending',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES service_orders(order_id)
    )`,
    `CREATE TABLE IF NOT EXISTS feedback (
        feedback_id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL UNIQUE,
        customer_id INT NOT NULL,
        rating INT NOT NULL,
        comments TEXT,
        feedback_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES service_orders(order_id),
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    )`,
    `CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('owner','receptionist') NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        last_login DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS audit_log (
        log_id INT AUTO_INCREMENT PRIMARY KEY,
        table_name VARCHAR(50) NOT NULL,
        operation ENUM('INSERT','UPDATE','DELETE') NOT NULL,
        record_id INT,
        user_id INT,
        old_values JSON,
        new_values JSON,
        changed_by VARCHAR(50) DEFAULT 'system',
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
    )`
];

const TENANT_VIEWS = [
    `CREATE OR REPLACE VIEW vw_customer_service_history AS
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
     ORDER BY so.order_date DESC`,
    `CREATE OR REPLACE VIEW vw_mechanic_workload AS
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
     GROUP BY m.mechanic_id, m.first_name, m.last_name, m.specialization, m.status`,
    `CREATE OR REPLACE VIEW vw_inventory_status AS
     SELECT
        p.part_id,
        p.part_name,
        p.part_number,
        p.description,
        p.quantity_in_stock,
        p.reorder_level,
        p.unit_price,
        p.supplier_id,
        s.company_name AS supplier,
        s.phone AS supplier_phone,
        CASE
            WHEN p.quantity_in_stock = 0 THEN 'OUT OF STOCK'
            WHEN p.quantity_in_stock <= p.reorder_level THEN 'LOW STOCK'
            ELSE 'IN STOCK'
        END AS stock_status
     FROM parts p
     LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id
     ORDER BY p.quantity_in_stock ASC`,
    `CREATE OR REPLACE VIEW vw_daily_revenue AS
     SELECT
        DATE(p.payment_date) AS payment_date,
        COUNT(DISTINCT p.order_id) AS total_orders,
        SUM(p.amount) AS total_revenue,
        AVG(p.amount) AS avg_order_value,
        GROUP_CONCAT(DISTINCT p.payment_method) AS payment_methods_used
     FROM payments p
     WHERE p.status = 'completed'
     GROUP BY DATE(p.payment_date)
     ORDER BY payment_date DESC`,
    `CREATE OR REPLACE VIEW vw_service_popularity AS
     SELECT
        s.service_id,
        s.service_name,
        sc.category_name,
        s.base_price,
        COUNT(sli.order_id) AS times_ordered,
        COALESCE(SUM(sli.line_total), 0) AS total_revenue
     FROM services s
     LEFT JOIN service_categories sc ON s.category_id = sc.category_id
     LEFT JOIN service_line_items sli ON s.service_id = sli.service_id
     GROUP BY s.service_id, s.service_name, sc.category_name, s.base_price
     ORDER BY total_revenue DESC`
];

const TENANT_INDEXES = [
    'CREATE INDEX idx_customer_name ON customers(last_name, first_name)',
    'CREATE INDEX idx_vehicle_customer ON vehicles(customer_id)',
    'CREATE INDEX idx_vehicle_plate ON vehicles(license_plate)',
    'CREATE INDEX idx_appointment_date_status ON appointments(appointment_date, status)',
    'CREATE INDEX idx_order_status ON service_orders(status)',
    'CREATE INDEX idx_order_customer ON service_orders(customer_id)',
    'CREATE INDEX idx_payment_date ON payments(payment_date)',
    'CREATE INDEX idx_part_number ON parts(part_number)'
];

const DEFAULT_CATEGORIES = [
    ['General Maintenance', 'Routine maintenance and regular service work'],
    ['Diagnostics', 'Inspection and fault diagnosis'],
    ['Repair', 'Mechanical and electrical repairs']
];

const DEFAULT_SERVICES = [
    ['Oil Change', 'Engine oil and filter replacement', 2500, 1.0, 'General Maintenance'],
    ['Brake Inspection', 'Brake pad and fluid inspection', 1800, 1.0, 'Diagnostics'],
    ['Engine Tune-Up', 'Engine performance tune-up', 4500, 2.5, 'Repair'],
    ['Wheel Alignment', 'Alignment and balancing', 2200, 1.5, 'General Maintenance']
];

const DEFAULT_SUPPLIER = ['Default Supplier', 'Main supplier', 'supplier@example.com', '+9779800000000'];

async function bootstrapTenantDatabase(databaseName) {
    await adminDb.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    const tenantDb = getTenantDb(databaseName);

    for (const statement of TENANT_TABLES) {
        await tenantDb.query(statement);
    }

    for (const category of DEFAULT_CATEGORIES) {
        await tenantDb.query(
            'INSERT IGNORE INTO service_categories (category_name, description) VALUES (?, ?)',
            category
        );
    }

    await tenantDb.query(
        'INSERT IGNORE INTO suppliers (company_name, contact_person, email, phone) VALUES (?, ?, ?, ?)',
        DEFAULT_SUPPLIER
    );

    for (const [name, description, price, hours, categoryName] of DEFAULT_SERVICES) {
        const [[category]] = await tenantDb.query(
            'SELECT category_id FROM service_categories WHERE category_name = ?',
            [categoryName]
        );
        await tenantDb.query(
            `INSERT IGNORE INTO services (category_id, service_name, description, base_price, estimated_hours)
             VALUES (?, ?, ?, ?, ?)`,
            [category?.category_id || null, name, description, price, hours]
        );
    }

    for (const statement of TENANT_VIEWS) {
        await tenantDb.query(statement);
    }

    for (const statement of TENANT_INDEXES) {
        try {
            await tenantDb.query(statement);
        } catch (error) {
            if (!String(error.message).includes('Duplicate key name')) {
                throw error;
            }
        }
    }
}

module.exports = {
    bootstrapTenantDatabase
};
