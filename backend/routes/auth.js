const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../middleware/auth');
const { attachTenantFromToken, resolveCompanyByCode } = require('../middleware/tenant');
const { controlDb, getTenantDb } = require('../config/db');
const { createReceptionist, provisionCompany } = require('../services/companyService');
const { AppError, asyncHandler, sendSuccess } = require('../utils/http');
const { optionalString, requiredString, validate } = require('../utils/validation');

const router = express.Router();

function signToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
}

const validateOwnerSignup = validate((req) => {
    const errors = {};
    const companyName = requiredString(req.body.company_name, 'Service center name', { min: 2, max: 120 });
    const ownerName = requiredString(req.body.owner_name, 'Owner name', { min: 2, max: 120 });
    const username = requiredString(req.body.username, 'Owner username', { min: 3, max: 80 });
    const password = requiredString(req.body.password, 'Password', { min: 8, max: 100 });

    if (companyName.error) errors.company_name = companyName.error;
    if (ownerName.error) errors.owner_name = ownerName.error;
    if (username.error) errors.username = username.error;
    if (password.error) errors.password = password.error;

    return {
        value: {
            company_name: companyName.value,
            owner_name: ownerName.value,
            username: username.value,
            password: password.value
        },
        errors
    };
});

const validateOwnerLogin = validate((req) => {
    const errors = {};
    const username = requiredString(req.body.username, 'Owner username', { min: 3, max: 80 });
    const password = requiredString(req.body.password, 'Password', { min: 8, max: 100 });
    if (username.error) errors.username = username.error;
    if (password.error) errors.password = password.error;
    return { value: { username: username.value, password: password.value }, errors };
});

const validateReceptionistLogin = validate((req) => {
    const errors = {};
    const companyCode = requiredString(req.body.company_code, 'Company code', { min: 4, max: 20 });
    const username = requiredString(req.body.username, 'Receptionist username', { min: 3, max: 80 });
    const password = requiredString(req.body.password, 'Password', { min: 8, max: 100 });
    if (companyCode.error) errors.company_code = companyCode.error;
    if (username.error) errors.username = username.error;
    if (password.error) errors.password = password.error;
    return {
        value: {
            company_code: companyCode.value.toUpperCase(),
            username: username.value,
            password: password.value
        },
        errors
    };
});

const validateReceptionistCreate = validate((req) => {
    const errors = {};
    const username = requiredString(req.body.username, 'Receptionist username', { min: 3, max: 80 });
    const password = requiredString(req.body.password, 'Password', { min: 8, max: 100 });
    if (username.error) errors.username = username.error;
    if (password.error) errors.password = password.error;
    return { value: { username: username.value, password: password.value }, errors };
});

router.post('/owner/signup', validateOwnerSignup, asyncHandler(async (req, res) => {
    const { company_name, owner_name, username, password } = req.validated;

    const [existingOwners] = await controlDb.execute(
        'SELECT owner_id FROM owners WHERE username = ?',
        [username]
    );
    if (existingOwners.length > 0) {
        throw new AppError('Owner username already exists.', 409, 'DUPLICATE_OWNER_USERNAME');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const provisioned = await provisionCompany({
        companyName: company_name,
        ownerName: owner_name,
        username,
        passwordHash
    });

    const token = signToken({
        ownerId: provisioned.ownerId,
        companyId: provisioned.companyId,
        companyCode: provisioned.companyCode,
        companyName: company_name,
        tenantDbName: provisioned.tenantDbName,
        tenantUserId: provisioned.tenantUserId,
        username,
        role: 'owner'
    });

    sendSuccess(res, {
        status: 201,
        message: 'Service center created successfully.',
        data: {
            token,
            companyCode: provisioned.companyCode,
            user: {
                id: provisioned.ownerId,
                username,
                role: 'owner',
                company_id: provisioned.companyId,
                company_name,
                company_code: provisioned.companyCode
            }
        }
    });
}));

router.post('/owner/login', validateOwnerLogin, asyncHandler(async (req, res) => {
    const { username, password } = req.validated;

    const [owners] = await controlDb.execute(
        `SELECT o.*, c.company_name, c.company_code, c.tenant_db_name
         FROM owners o
         JOIN companies c ON c.company_id = o.company_id
         WHERE o.username = ? AND o.is_active = TRUE AND c.status = 'active'`,
        [username]
    );

    if (owners.length === 0) throw new AppError('Invalid owner credentials.', 401, 'INVALID_CREDENTIALS');

    const owner = owners[0];
    const valid = await bcrypt.compare(password, owner.password_hash);
    if (!valid) throw new AppError('Invalid owner credentials.', 401, 'INVALID_CREDENTIALS');

    await controlDb.execute('UPDATE owners SET last_login = NOW() WHERE owner_id = ?', [owner.owner_id]);

    const token = signToken({
        ownerId: owner.owner_id,
        companyId: owner.company_id,
        companyCode: owner.company_code,
        companyName: owner.company_name,
        tenantDbName: owner.tenant_db_name,
        tenantUserId: owner.tenant_user_id,
        username: owner.username,
        role: 'owner'
    });

    sendSuccess(res, {
        message: 'Owner login successful.',
        data: {
            token,
            user: {
                id: owner.owner_id,
                username: owner.username,
                role: 'owner',
                company_id: owner.company_id,
                company_name: owner.company_name,
                company_code: owner.company_code
            }
        }
    });
}));

router.post('/receptionist/login', validateReceptionistLogin, asyncHandler(async (req, res) => {
    const { company_code, username, password } = req.validated;
    const company = await resolveCompanyByCode(company_code);
    if (!company) throw new AppError('Invalid company code or inactive company.', 401, 'INVALID_COMPANY_CODE');

    const tenantDb = getTenantDb(company.tenant_db_name);
    const [users] = await tenantDb.execute(
        'SELECT * FROM users WHERE username = ? AND role = ? AND is_active = TRUE',
        [username, 'receptionist']
    );
    if (users.length === 0) throw new AppError('Invalid receptionist credentials.', 401, 'INVALID_CREDENTIALS');

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError('Invalid receptionist credentials.', 401, 'INVALID_CREDENTIALS');

    await tenantDb.execute('UPDATE users SET last_login = NOW() WHERE user_id = ?', [user.user_id]);

    const token = signToken({
        companyId: company.company_id,
        companyCode: company.company_code,
        companyName: company.company_name,
        tenantDbName: company.tenant_db_name,
        tenantUserId: user.user_id,
        username: user.username,
        role: 'receptionist'
    });

    sendSuccess(res, {
        message: 'Receptionist login successful.',
        data: {
            token,
            user: {
                id: user.user_id,
                username: user.username,
                role: 'receptionist',
                company_id: company.company_id,
                company_name: company.company_name,
                company_code: company.company_code
            }
        }
    });
}));

router.get('/me', authenticate, attachTenantFromToken, asyncHandler(async (req, res) => {
    if (req.user.role === 'owner') {
        const [owners] = await controlDb.execute(
            `SELECT o.owner_id, o.username, c.company_id, c.company_name, c.company_code
             FROM owners o
             JOIN companies c ON c.company_id = o.company_id
             WHERE o.owner_id = ? AND o.is_active = TRUE`,
            [req.user.ownerId]
        );
        if (owners.length === 0) throw new AppError('Owner not found.', 404, 'USER_NOT_FOUND');

        sendSuccess(res, {
            message: 'Current user loaded.',
            data: {
                user: {
                    id: owners[0].owner_id,
                    username: owners[0].username,
                    role: 'owner',
                    company_id: owners[0].company_id,
                    company_name: owners[0].company_name,
                    company_code: owners[0].company_code
                }
            }
        });
        return;
    }

    const [users] = await req.db.execute(
        'SELECT user_id, username, role FROM users WHERE user_id = ? AND is_active = TRUE',
        [req.user.tenantUserId]
    );
    if (users.length === 0) throw new AppError('User not found.', 404, 'USER_NOT_FOUND');

    sendSuccess(res, {
        message: 'Current user loaded.',
        data: {
            user: {
                id: users[0].user_id,
                username: users[0].username,
                role: users[0].role,
                company_id: req.user.companyId,
                company_name: req.user.companyName,
                company_code: req.user.companyCode
            }
        }
    });
}));

router.get('/company', authenticate, authorize('owner'), asyncHandler(async (req, res) => {
    const [companies] = await controlDb.execute(
        'SELECT company_id, company_name, owner_name, company_code, status, created_at FROM companies WHERE company_id = ?',
        [req.user.companyId]
    );
    if (companies.length === 0) throw new AppError('Company not found.', 404, 'COMPANY_NOT_FOUND');
    sendSuccess(res, { message: 'Company loaded.', data: companies[0] });
}));

router.get('/receptionists', authenticate, attachTenantFromToken, authorize('owner'), asyncHandler(async (req, res) => {
    const [users] = await req.db.execute(
        `SELECT user_id, username, role, is_active, last_login, created_at
         FROM users
         WHERE role = 'receptionist'
         ORDER BY created_at DESC`
    );
    sendSuccess(res, { message: 'Receptionists loaded.', data: users });
}));

router.post('/receptionists', authenticate, attachTenantFromToken, authorize('owner'), validateReceptionistCreate, asyncHandler(async (req, res) => {
    const { username, password } = req.validated;
    const receptionistId = await createReceptionist({
        tenantDbName: req.user.tenantDbName,
        username,
        password,
        createdBy: req.user
    });
    sendSuccess(res, {
        status: 201,
        message: 'Receptionist account created successfully.',
        data: { userId: receptionistId }
    });
}));

router.put('/receptionists/:id/status', authenticate, attachTenantFromToken, authorize('owner'), asyncHandler(async (req, res) => {
    const isActive = req.body.is_active === false ? false : true;
    const [result] = await req.db.execute(
        `UPDATE users
         SET is_active = ?
         WHERE user_id = ? AND role = 'receptionist'`,
        [isActive, req.params.id]
    );
    if (result.affectedRows === 0) throw new AppError('Receptionist not found.', 404, 'USER_NOT_FOUND');
    sendSuccess(res, { message: `Receptionist ${isActive ? 'activated' : 'deactivated'} successfully.` });
}));

module.exports = router;
