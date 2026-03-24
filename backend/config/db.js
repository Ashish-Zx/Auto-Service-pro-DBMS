const mysql = require('mysql2/promise');
require('dotenv').config();

const {
    DB_HOST = 'localhost',
    DB_PORT = '3306',
    DB_USER = 'root',
    DB_PASSWORD = '',
    DB_NAME = 'auto_service_database',
    CONTROL_DB_NAME = 'auto_service_control'
} = process.env;

const baseConfig = {
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    port: Number(DB_PORT),
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

const adminPool = mysql.createPool(baseConfig);
let controlPool = null;
const tenantPools = new Map();

function createControlPool() {
    return mysql.createPool({ ...baseConfig, database: CONTROL_DB_NAME });
}

function getControlDb() {
    if (!controlPool) {
        controlPool = createControlPool();
    }
    return controlPool;
}

function createTenantPool(database) {
    return mysql.createPool({ ...baseConfig, database });
}

function getTenantDb(database) {
    if (!tenantPools.has(database)) {
        tenantPools.set(database, createTenantPool(database));
    }
    return tenantPools.get(database);
}

async function testPool(pool, label) {
    try {
        const connection = await pool.getConnection();
        connection.release();
        console.log(`✅ ${label} connected successfully!`);
    } catch (error) {
        console.error(`❌ ${label} connection failed:`, error.message);
    }
}

async function initControlPlane() {
    await adminPool.query(`CREATE DATABASE IF NOT EXISTS \`${CONTROL_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);

    if (controlPool) {
        await controlPool.end();
    }
    controlPool = createControlPool();

    await controlPool.query(`
        CREATE TABLE IF NOT EXISTS companies (
            company_id INT AUTO_INCREMENT PRIMARY KEY,
            company_name VARCHAR(120) NOT NULL,
            owner_name VARCHAR(120) NOT NULL,
            company_code VARCHAR(20) NOT NULL UNIQUE,
            tenant_db_name VARCHAR(120) NOT NULL UNIQUE,
            status ENUM('active','inactive') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await controlPool.query(`
        CREATE TABLE IF NOT EXISTS owners (
            owner_id INT AUTO_INCREMENT PRIMARY KEY,
            company_id INT NOT NULL,
            username VARCHAR(80) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            tenant_user_id INT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            last_login DATETIME,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies(company_id) ON DELETE CASCADE
        )
    `);
}

module.exports = {
    adminDb: adminPool,
    getControlDb,
    defaultTenantDbName: DB_NAME,
    getTenantDb,
    initControlPlane,
    testPool
};
