const bcrypt = require('bcryptjs');
const { getControlDb, getTenantDb } = require('../config/db');
const { bootstrapTenantDatabase } = require('./tenantBootstrap');

function slugifyDatabaseName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'garage';
}

function generateCompanyCode() {
    return `GAR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function ensureUniqueCompanyCode() {
    while (true) {
        const companyCode = generateCompanyCode();
        const [rows] = await getControlDb().query('SELECT company_id FROM companies WHERE company_code = ?', [companyCode]);
        if (rows.length === 0) return companyCode;
    }
}

async function provisionCompany({ companyName, ownerName, username, passwordHash }) {
    const companyCode = await ensureUniqueCompanyCode();
    const tenantDbName = `tenant_${slugifyDatabaseName(companyName)}_${companyCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    await bootstrapTenantDatabase(tenantDbName);
    const tenantDb = getTenantDb(tenantDbName);

    const [tenantOwnerResult] = await tenantDb.execute(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, passwordHash, 'owner']
    );

    const connection = await getControlDb().getConnection();
    try {
        await connection.beginTransaction();
        const [companyResult] = await connection.execute(
            `INSERT INTO companies (company_name, owner_name, company_code, tenant_db_name, status)
             VALUES (?, ?, ?, ?, 'active')`,
            [companyName, ownerName, companyCode, tenantDbName]
        );

        const [ownerResult] = await connection.execute(
            `INSERT INTO owners (company_id, username, password_hash, tenant_user_id)
             VALUES (?, ?, ?, ?)`,
            [companyResult.insertId, username, passwordHash, tenantOwnerResult.insertId]
        );

        await connection.commit();
        return {
            companyId: companyResult.insertId,
            ownerId: ownerResult.insertId,
            companyCode,
            tenantDbName,
            tenantUserId: tenantOwnerResult.insertId
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function createReceptionist({ tenantDbName, username, password, createdBy }) {
    const tenantDb = getTenantDb(tenantDbName);
    const passwordHash = await bcrypt.hash(password, 10);

    const [result] = await tenantDb.execute(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, passwordHash, 'receptionist']
    );

    await tenantDb.execute(
        'INSERT INTO audit_log (table_name, operation, record_id, user_id, changed_by, new_values) VALUES (?, ?, ?, ?, ?, ?)',
        ['users', 'INSERT', result.insertId, createdBy.tenantUserId || null, createdBy.username, JSON.stringify({ username, role: 'receptionist' })]
    );

    return result.insertId;
}

module.exports = {
    createReceptionist,
    provisionCompany
};
