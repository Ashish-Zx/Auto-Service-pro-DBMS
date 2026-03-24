const { getControlDb, getTenantDb } = require('../config/db');
const { AppError } = require('../utils/http');

async function attachTenantFromToken(req, res, next) {
    const tenantDbName = req.user?.tenantDbName;
    if (!tenantDbName) {
        return next(new AppError('Tenant context missing.', 401, 'TENANT_CONTEXT_REQUIRED'));
    }

    try {
        req.db = getTenantDb(tenantDbName);
        req.company = {
            companyId: req.user.companyId,
            companyCode: req.user.companyCode,
            companyName: req.user.companyName,
            tenantDbName
        };
        next();
    } catch (error) {
        next(error);
    }
}

async function resolveCompanyByCode(companyCode) {
    const [rows] = await getControlDb().execute(
        'SELECT * FROM companies WHERE company_code = ? AND status = ?',
        [companyCode, 'active']
    );
    return rows[0] || null;
}

module.exports = {
    attachTenantFromToken,
    resolveCompanyByCode
};
