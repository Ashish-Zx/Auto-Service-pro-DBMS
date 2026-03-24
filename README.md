# 🏎️ Garage Pilot: Advanced DBMS Workshop Management System

[![Database](https://img.shields.io/badge/Database-MySQL%20Local-blue?style=for-the-badge&logo=mysql)](https://www.mysql.com/)
[![Backend](https://img.shields.io/badge/Backend-Node.js-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20v18-informational?style=for-the-badge&logo=react)](https://reactjs.org/)

**Garage Pilot** is a high-performance, local-first Workshop Management System designed to handle complex automotive service lifecycles offline. Built as a specialized **DBMS Project**, it demonstrates advanced database concepts including Transaction Management, Multi-table Joins, View Materialization, and Audit Logging.

---

## 🏛️ System Architecture

### 📊 Advanced DBMS Features Implemented:
*   **Transaction Management**: ACID-compliant service order creation involving multiple table updates (Orders, Line Items, Payments, Stock deduction).
*   **Logical Views**: 5 complex SQL views for real-time Business Intelligence (`vw_daily_revenue`, `vw_service_popularity`, `vw_inventory_status`).
*   **Audit Logging**: Automated system-wide logging of sensitive operations (Inserts, Updates, Deletions) for security and recovery.
*   **Relational Integrity**: Strict Foreign Key constraints and Cascading Deletes across 16+ relational tables.
*   **Composite Primary Keys**: Specialized weak entities (e.g., `service_line_items`) using composite keys for hierarchical data storage.

---

## 📸 Visual Showcase

### 🚀 Command Center (Dashboard)
Experience real-time analytics with custom views for Revenue, Stock Alerts, and Customer Ratings.
![Dashboard](docs/screenshots/dashboard.png)

### 📋 Order Management
A strictly ordered, transactional view of all workshop jobs, linked directly to the `service_orders` and `payments` tables.
![Orders](docs/screenshots/orders.png)

### 📦 Intelligent Inventory
Monitors `min_stock_level` via the `vw_inventory_status` view to trigger automated stock alerts.
![Inventory](docs/screenshots/inventory.png)

### 👤 Customer Analytics
Detailed historical tracking of every service ever performed for a client, powered by the `vw_customer_service_history` master join.
![Customer Profile](docs/screenshots/customer_profile.png)

---

## 🛠️ Tech Stack & Implementation

-   **Database**: Local MySQL / MariaDB (Supports ACID Transactions)
-   **Backend**: Node.js & Express with `mysql2/promise` for asynchronous IO.
-   **Frontend**: React.js with Vite, styled with modern Vanilla CSS for premium aesthetics.
-   **State Management**: React Hooks & Context for real-time UI updates.
-   **Charts**: Recharts for visualizing complex SQL revenue trends.

---

## 🚀 Installation & Local Setup

### 1. Database Setup
Ensure you have a local instance of MySQL or MariaDB running. 
1. Open your MySQL terminal or GUI (like MySQL Workbench).
2. Execute the `local_db_setup.sql` script located in the root directory:
   ```sql
   source ./local_db_setup.sql;
   ```
   *This script automatically creates the database, tables, views, triggers, and populates sample data.*

### 2. Backend Setup
```bash
cd backend
npm install
node server.js
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🎓 Academic Contribution
This project was developed as a comprehensive demonstration of **Database Management System (DBMS)** principles, focusing on the practical application of SQL optimization, relational modeling, and secure data handling in a modern web environment.

Developed with ❤️ for the DBMS Final Project.
