const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const { AppError, asyncHandler, sendSuccess } = require('../utils/http');
const {
    optionalString,
    requiredString,
    validate
} = require('../utils/validation');

const writeRoles = authorize('owner', 'receptionist');

const validateCustomer = validate((req) => {
    const errors = {};
    const firstName = requiredString(req.body.first_name, 'First name', { max: 50 });
    const lastName = requiredString(req.body.last_name, 'Last name', { max: 50 });
    const email = requiredString(req.body.email, 'Email', {
        max: 100,
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    });
    const phone = requiredString(req.body.phone, 'Phone', {
        max: 15,
        pattern: /^[+\d\s()-]{7,15}$/
    });
    const addressStreet = optionalString(req.body.address_street, 'Street', { max: 100 });
    const addressCity = optionalString(req.body.address_city, 'City', { max: 50 });
    const addressState = optionalString(req.body.address_state, 'State', { max: 50 });
    const addressZip = optionalString(req.body.address_zip, 'ZIP', { max: 10 });

    if (firstName.error) errors.first_name = firstName.error;
    if (lastName.error) errors.last_name = lastName.error;
    if (email.error) errors.email = email.error;
    if (phone.error) errors.phone = phone.error;
    if (addressStreet.error) errors.address_street = addressStreet.error;
    if (addressCity.error) errors.address_city = addressCity.error;
    if (addressState.error) errors.address_state = addressState.error;
    if (addressZip.error) errors.address_zip = addressZip.error;

    return {
        value: {
            first_name: firstName.value,
            last_name: lastName.value,
            email: email.value,
            phone: phone.value,
            address_street: addressStreet.value,
            address_city: addressCity.value,
            address_state: addressState.value,
            address_zip: addressZip.value
        },
        errors
    };
});

// GET /api/customers — List all customers with vehicle count
router.get('/', authorize('owner', 'receptionist'), asyncHandler(async (req, res) => {
        const db = req.db;
        const { search, page = 1, limit = 10 } = req.query;
        const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1);
        const currentLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 100);
        const offset = (currentPage - 1) * currentLimit;

        let query = `
            SELECT c.*, COUNT(v.vehicle_id) AS vehicle_count
            FROM customers c
            LEFT JOIN vehicles v ON c.customer_id = v.customer_id
        `;
        let params = [];

        if (search && search.trim() !== '') {
            query += ` WHERE c.first_name LIKE ? OR c.last_name LIKE ? 
                        OR c.email LIKE ? OR c.phone LIKE ?`;
            const searchTerm = `%${search}%`;
            params = [searchTerm, searchTerm, searchTerm, searchTerm];
        }

        query += ` GROUP BY c.customer_id ORDER BY c.created_at DESC LIMIT ${currentLimit} OFFSET ${offset}`;

        const [customers] = await db.query(query, params);

        // Total count for pagination
        const countQuery = search && search.trim() !== ''
            ? `SELECT COUNT(*) AS total FROM customers c
               WHERE c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?`
            : 'SELECT COUNT(*) AS total FROM customers';
        const [countResult] = await db.query(countQuery, params);
        const totalCount = countResult && countResult[0] ? countResult[0].total : 0;

        sendSuccess(res, {
            message: 'Customers loaded.',
            data: customers,
            pagination: {
                total: totalCount,
                page: currentPage,
                limit: currentLimit,
                pages: Math.ceil(totalCount / currentLimit)
            }
        });
}));

// GET /api/customers/:id — Detailed Profile (Demonstrates SQL VIEWS)
router.get('/:id', authorize('owner', 'receptionist'), asyncHandler(async (req, res) => {
        const db = req.db;
        // Basic customer info
        const [customer] = await db.query(
            'SELECT * FROM customers WHERE customer_id = ?', [req.params.id]
        );

        if (customer.length === 0) {
            throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
        }

        // Use the VIEW for rich service history (DBMS Feature: VIEW)
        const [history] = await db.query(
            'SELECT * FROM vw_customer_service_history WHERE customer_id = ?', 
            [req.params.id]
        );

        // Current vehicles
        const [vehicles] = await db.query(
            'SELECT * FROM vehicles WHERE customer_id = ?', [req.params.id]
        );

        sendSuccess(res, {
            message: 'Customer profile loaded.',
            data: {
                customer: customer[0],
                vehicles,
                serviceHistory: history
            }
        });
}));

// POST /api/customers — Create new customer
router.post('/', writeRoles, validateCustomer, asyncHandler(async (req, res) => {
        const db = req.db;
        const { first_name, last_name, email, phone,
                address_street, address_city, address_state, address_zip } = req.validated;

        const [result] = await db.query(
            `INSERT INTO customers 
             (first_name, last_name, email, phone, address_street, address_city, address_state, address_zip)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, email, phone, address_street, address_city, address_state, address_zip]
        );

        await db.execute(
            'INSERT INTO audit_log (table_name, operation, record_id, user_id, changed_by, new_values) VALUES (?, ?, ?, ?, ?, ?)',
            ['customers', 'INSERT', result.insertId, req.user.tenantUserId || null, req.user.username, JSON.stringify({ email, phone })]
        );

        sendSuccess(res, {
            status: 201,
            message: 'Customer created successfully.',
            data: { customerId: result.insertId }
        });
}));

// PUT /api/customers/:id — Update customer
router.put('/:id', writeRoles, validateCustomer, asyncHandler(async (req, res) => {
        const db = req.db;
        const { first_name, last_name, email, phone,
                address_street, address_city, address_state, address_zip } = req.validated;

        const [result] = await db.query(
            `UPDATE customers SET first_name=?, last_name=?, email=?, phone=?,
             address_street=?, address_city=?, address_state=?, address_zip=?
             WHERE customer_id=?`,
            [first_name, last_name, email, phone, 
             address_street, address_city, address_state, address_zip, req.params.id]
        );

        if (result.affectedRows === 0) {
            throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
        }
        await db.execute(
            'INSERT INTO audit_log (table_name, operation, record_id, user_id, changed_by, new_values) VALUES (?, ?, ?, ?, ?, ?)',
            ['customers', 'UPDATE', req.params.id, req.user.tenantUserId || null, req.user.username, JSON.stringify({ email, phone })]
        );
        sendSuccess(res, { message: 'Customer updated successfully.' });
}));

// DELETE /api/customers/:id — Delete customer (CASCADE deletes vehicles too)
router.delete('/:id', writeRoles, asyncHandler(async (req, res) => {
        const db = req.db;
        // Audit BEFORE delete (to capture id)
        await db.execute(
            'INSERT INTO audit_log (table_name, operation, record_id, user_id, changed_by, old_values) VALUES (?, ?, ?, ?, ?, ?)',
            ['customers', 'DELETE', req.params.id, req.user.tenantUserId || null, req.user.username, JSON.stringify({ note: 'Permanent deletion' })]
        );

        const [result] = await db.query(
            'DELETE FROM customers WHERE customer_id = ?', [req.params.id]
        );
        if (result.affectedRows === 0) {
            throw new AppError('Customer not found.', 404, 'CUSTOMER_NOT_FOUND');
        }
        sendSuccess(res, { message: 'Customer deleted successfully.' });
}));

module.exports = router;
