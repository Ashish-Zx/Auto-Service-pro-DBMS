const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const { AppError, asyncHandler, sendSuccess } = require('../utils/http');
const {
    optionalInteger,
    optionalNumber,
    optionalString,
    requiredInteger,
    requiredNumber,
    requiredString,
    validate
} = require('../utils/validation');

const manageRoles = authorize('owner', 'receptionist');

const validatePart = validate((req) => {
    const errors = {};
    const partName = requiredString(req.body.part_name, 'Part name', { max: 100 });
    const partNumber = requiredString(req.body.part_number, 'Part number', { max: 50 });
    const description = optionalString(req.body.description, 'Description', { max: 1000 });
    const unitPrice = requiredNumber(req.body.unit_price, 'Unit price', { min: 0 });
    const stock = requiredInteger(req.body.quantity_in_stock, 'Quantity in stock', { min: 0 });
    const reorderLevel = requiredInteger(req.body.reorder_level, 'Reorder level', { min: 0 });
    const supplierId = optionalInteger(req.body.supplier_id, 'Supplier', { min: 1 });

    if (partName.error) errors.part_name = partName.error;
    if (partNumber.error) errors.part_number = partNumber.error;
    if (description.error) errors.description = description.error;
    if (unitPrice.error) errors.unit_price = unitPrice.error;
    if (stock.error) errors.quantity_in_stock = stock.error;
    if (reorderLevel.error) errors.reorder_level = reorderLevel.error;
    if (supplierId.error) errors.supplier_id = supplierId.error;

    return {
        value: {
            part_name: partName.value,
            part_number: partNumber.value,
            description: description.value,
            unit_price: unitPrice.value,
            quantity_in_stock: stock.value,
            reorder_level: reorderLevel.value,
            supplier_id: supplierId.value
        },
        errors
    };
});

const validateRestock = validate((req) => {
    const errors = {};
    const quantity = requiredInteger(req.body.quantity, 'Quantity', { min: 1 });
    if (quantity.error) errors.quantity = quantity.error;
    return { value: { quantity: quantity.value }, errors };
});

const validateSupplier = validate((req) => {
    const errors = {};
    const companyName = requiredString(req.body.company_name, 'Company name', { max: 100 });
    const contactPerson = optionalString(req.body.contact_person, 'Contact person', { max: 100 });
    const phone = optionalString(req.body.phone, 'Phone', { max: 15 });
    const email = optionalString(req.body.email, 'Email', { max: 100, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ });
    if (companyName.error) errors.company_name = companyName.error;
    if (contactPerson.error) errors.contact_person = contactPerson.error;
    if (phone.error) errors.phone = phone.error;
    if (email.error) errors.email = email.error;
    return {
        value: {
            company_name: companyName.value,
            contact_person: contactPerson.value,
            phone: phone.value,
            email: email.value
        },
        errors
    };
});

// GET inventory with stock status (uses VIEW)
router.get('/', manageRoles, asyncHandler(async (req, res) => {
        const db = req.db;
        const { status = '', search = '', page = 1, limit = 20 } = req.query;
        const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1);
        const currentLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
        const offset = (currentPage - 1) * currentLimit;
        const params = [];
        let where = 'WHERE 1=1';

        if (status) {
            where += ' AND stock_status = ?';
            params.push(status);
        }
        if (search.trim()) {
            where += ' AND (part_name LIKE ? OR part_number LIKE ? OR supplier LIKE ?)';
            const term = `%${search.trim()}%`;
            params.push(term, term, term);
        }

        const [parts] = await db.execute(`
            SELECT * FROM vw_inventory_status
            ${where}
            LIMIT ${currentLimit} OFFSET ${offset}
        `, params);
        const [countResult] = await db.execute(`
            SELECT COUNT(*) AS total FROM vw_inventory_status
            ${where}
        `, params);
        sendSuccess(res, {
            message: 'Inventory loaded.',
            data: parts,
            pagination: {
                total: countResult[0].total,
                page: currentPage,
                limit: currentLimit,
                pages: Math.ceil(countResult[0].total / currentLimit)
            }
        });
}));

// GET low stock alerts
router.get('/low-stock', manageRoles, asyncHandler(async (req, res) => {
        const db = req.db;
        const [parts] = await db.execute(`
            SELECT * FROM vw_inventory_status 
            WHERE stock_status IN ('LOW STOCK', 'OUT OF STOCK')
        `);
        sendSuccess(res, { message: 'Low stock items loaded.', data: parts });
}));

// POST - add new part
router.post('/', manageRoles, validatePart, asyncHandler(async (req, res) => {
        const db = req.db;
        const { part_name, part_number, description, unit_price, 
                quantity_in_stock, reorder_level, supplier_id } = req.validated;
        const [result] = await db.execute(
            `INSERT INTO parts (part_name, part_number, description, unit_price, 
                                quantity_in_stock, reorder_level, supplier_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [part_name, part_number, description, unit_price, quantity_in_stock, reorder_level, supplier_id]
        );
        sendSuccess(res, {
            status: 201,
            message: 'Inventory item created successfully.',
            data: { partId: result.insertId }
        });
}));

// PUT - restock
router.put('/:id/restock', manageRoles, validateRestock, asyncHandler(async (req, res) => {
        const db = req.db;
        const { quantity } = req.validated;
        const [result] = await db.execute(
            'UPDATE parts SET quantity_in_stock = quantity_in_stock + ? WHERE part_id = ?',
            [quantity, req.params.id]
        );
        if (result.affectedRows === 0) throw new AppError('Part not found.', 404, 'PART_NOT_FOUND');

        // Audit Log
        await db.execute(
            'INSERT INTO audit_log (table_name, operation, record_id, user_id, changed_by, new_values) VALUES (?, ?, ?, ?, ?, ?)',
            ['parts', 'UPDATE', req.params.id, req.user.tenantUserId || null, req.user.username, JSON.stringify({ action: 'restock', added_quantity: quantity })]
        );

        sendSuccess(res, { message: `Restocked ${quantity} units successfully.` });
}));
// PUT - edit part
router.put('/:id', manageRoles, validatePart, asyncHandler(async (req, res) => {
        const db = req.db;
        const { part_name, part_number, description, unit_price, 
                quantity_in_stock, reorder_level, supplier_id } = req.validated;
        const [result] = await db.execute(
            `UPDATE parts SET part_name = ?, part_number = ?, description = ?, unit_price = ?, 
                              quantity_in_stock = ?, reorder_level = ?, supplier_id = ?
             WHERE part_id = ?`,
            [part_name, part_number, description, unit_price, quantity_in_stock, reorder_level, supplier_id, req.params.id]
        );
        if (result.affectedRows === 0) throw new AppError('Part not found.', 404, 'PART_NOT_FOUND');
        sendSuccess(res, { message: 'Inventory item updated successfully.' });
}));

// GET suppliers
router.get('/suppliers', manageRoles, asyncHandler(async (req, res) => {
        const db = req.db;
        const [suppliers] = await db.execute('SELECT supplier_id, company_name as supplier_name FROM suppliers');
        sendSuccess(res, { message: 'Suppliers loaded.', data: suppliers });
}));

// POST new supplier
router.post('/suppliers', manageRoles, validateSupplier, asyncHandler(async (req, res) => {
        const db = req.db;
        const { company_name, contact_person, phone, email } = req.validated;
        const [result] = await db.execute(
            'INSERT INTO suppliers (company_name, contact_person, phone, email) VALUES (?, ?, ?, ?)',
            [company_name, contact_person || null, phone || null, email || null]
        );
        sendSuccess(res, {
            status: 201,
            message: 'Supplier created successfully.',
            data: { supplier_id: result.insertId }
        });
}));

module.exports = router;
