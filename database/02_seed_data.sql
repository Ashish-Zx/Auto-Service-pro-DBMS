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
