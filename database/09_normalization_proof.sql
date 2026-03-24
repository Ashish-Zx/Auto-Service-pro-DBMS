-- ============================================================
-- NORMALIZATION PROOF — Syllabus Unit 4
-- ============================================================

/*
 ★ BEFORE NORMALIZATION (Unnormalized Form) ★
 
 If we stored everything in ONE table:
 
 ServiceRecord(
     order_id, order_date, status,
     customer_name, customer_email, customer_phone, customer_address,
     vehicle_plate, vehicle_make, vehicle_model, vehicle_year,
     service1_name, service1_price, service2_name, service2_price,  -- Repeating groups!
     mechanic1_name, mechanic2_name,                                -- Repeating groups!
     part1_name, part1_qty, part2_name, part2_qty,                  -- Repeating groups!
     total_amount, payment_method, payment_status
 )
 
 PROBLEMS:
 - Repeating groups (violates 1NF)
 - Insertion anomaly: Can't add a customer without an order
 - Update anomaly: Customer changes phone → update in every row
 - Deletion anomaly: Delete last order → lose customer info
 
 ─────────────────────────────────────────────────────────────
 
 ★ 1NF: Eliminate repeating groups ★
 - Separate services, parts, mechanics into individual rows
 - Each cell contains atomic values
 - Our schema: ✅ All attributes are atomic
 
 ★ 2NF: Eliminate partial dependencies ★
 - In service_line_items(order_id, line_number, service_id, ...)
   All non-key attributes depend on the FULL composite key (order_id, line_number)
   not just part of it.
 - Our schema: ✅ No partial dependencies
 
 ★ 3NF: Eliminate transitive dependencies ★
 - customer_address doesn't depend on order_id through customer_id
   Solution: Keep address in customers table, not in service_orders
 - Our schema: ✅ No transitive dependencies
 
 ★ BCNF: Every determinant is a candidate key ★
 - In our schema, all functional dependencies have a superkey on the left side
 - Our schema: ✅ In BCNF
 
 ─────────────────────────────────────────────────────────────
 
 FUNCTIONAL DEPENDENCIES:
 
 customers:
   customer_id → first_name, last_name, email, phone, address_*
   email → customer_id (candidate key)
 
 vehicles:
   vehicle_id → customer_id, license_plate, make, model, year, ...
   license_plate → vehicle_id (candidate key)
   vin → vehicle_id (candidate key)
 
 service_orders:
   order_id → vehicle_id, customer_id, order_date, status, total_amount, ...
 
 service_line_items:
   {order_id, line_number} → service_id, quantity, unit_price, line_total
 
 mechanic_assignments:
   {order_id, mechanic_id} → assigned_date, hours_worked
 
 feedback:
   feedback_id → order_id, customer_id, rating, comments
   order_id → feedback_id (1:1 relationship, candidate key)
*/
