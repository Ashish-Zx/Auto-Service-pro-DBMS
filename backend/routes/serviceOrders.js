const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const { AppError, asyncHandler, sendSuccess } = require('../utils/http');
const {
    optionalInteger,
    requiredArray,
    requiredEnum,
    requiredInteger,
    validate
} = require('../utils/validation');

const manageRoles = authorize('owner', 'receptionist');
const paymentMethods = ['cash', 'card', 'upi', 'bank_transfer'];
const orderStatuses = ['pending', 'in_progress', 'completed', 'delivered', 'cancelled'];

const validateOrderCreate = validate((req) => {
    const errors = {};
    const appointmentId = optionalInteger(req.body.appointment_id, 'Appointment', { min: 1 });
    const vehicleId = requiredInteger(req.body.vehicle_id, 'Vehicle', { min: 1 });
    const customerId = requiredInteger(req.body.customer_id, 'Customer', { min: 1 });
    const mechanicId = optionalInteger(req.body.mechanic_id, 'Mechanic', { min: 1 });
    const estimatedDays = optionalInteger(req.body.estimated_days, 'Estimated days', { min: 1, max: 30 });
    const services = requiredArray(req.body.services, 'Services');
    const parts = Array.isArray(req.body.parts) ? { value: req.body.parts } : { value: [] };

    if (appointmentId.error) errors.appointment_id = appointmentId.error;
    if (vehicleId.error) errors.vehicle_id = vehicleId.error;
    if (customerId.error) errors.customer_id = customerId.error;
    if (mechanicId.error) errors.mechanic_id = mechanicId.error;
    if (estimatedDays.error) errors.estimated_days = estimatedDays.error;
    if (services.error) errors.services = services.error;

    if (services.value) {
        services.value.forEach((item, index) => {
            if (!item.service_id) errors[`services.${index}.service_id`] = 'Service is required.';
            if (item.unit_price === undefined || Number(item.unit_price) < 0) errors[`services.${index}.unit_price`] = 'Unit price must be zero or greater.';
            if (item.quantity !== undefined && Number(item.quantity) < 1) errors[`services.${index}.quantity`] = 'Quantity must be at least 1.';
        });
    }

    if (parts.value) {
        parts.value.forEach((item, index) => {
            if (!item.part_id) errors[`parts.${index}.part_id`] = 'Part is required.';
            if (item.unit_price === undefined || Number(item.unit_price) < 0) errors[`parts.${index}.unit_price`] = 'Unit price must be zero or greater.';
            if (item.quantity_used === undefined || Number(item.quantity_used) < 1) errors[`parts.${index}.quantity_used`] = 'Quantity used must be at least 1.';
        });
    }

    return {
        value: {
            appointment_id: appointmentId.value,
            vehicle_id: vehicleId.value,
            customer_id: customerId.value,
            mechanic_id: mechanicId.value,
            estimated_days: estimatedDays.value || 1,
            services: services.value || [],
            parts: parts.value || []
        },
        errors
    };
});

const validateComplete = validate((req) => {
    const errors = {};
    const paymentMethod = requiredEnum(req.body.payment_method, 'Payment method', paymentMethods);
    if (paymentMethod.error) errors.payment_method = paymentMethod.error;
    return { value: { payment_method: paymentMethod.value }, errors };
});

// GET /api/orders — All orders with details
router.get('/', asyncHandler(async (req, res) => {
        const db = req.db;
        const { status, from_date, to_date, page = 1, limit = 20 } = req.query;
        const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1);
        const currentLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
        const offset = (currentPage - 1) * currentLimit;
        let query = `
            SELECT so.*, 
                   CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                   c.phone AS customer_phone,
                   CONCAT(v.make, ' ', v.model) AS vehicle,
                   v.license_plate
            FROM service_orders so
            JOIN customers c ON so.customer_id = c.customer_id
            JOIN vehicles v ON so.vehicle_id = v.vehicle_id
            WHERE 1=1
        `;
        let params = [];

        if (status) {
            if (!orderStatuses.includes(status)) {
                throw new AppError('Invalid order status filter.', 400, 'INVALID_STATUS_FILTER');
            }
            query += ' AND so.status = ?';
            params.push(status);
        }
        if (from_date) {
            query += ' AND DATE(so.order_date) >= ?';
            params.push(from_date);
        }
        if (to_date) {
            query += ' AND DATE(so.order_date) <= ?';
            params.push(to_date);
        }

        query += ` ORDER BY so.order_date DESC LIMIT ${currentLimit} OFFSET ${offset}`;
        const [orders] = await db.execute(query, params);

        let countQuery = `
            SELECT COUNT(*) AS total
            FROM service_orders so
            WHERE 1=1
        `;
        const countParams = [];
        if (status) {
            countQuery += ' AND so.status = ?';
            countParams.push(status);
        }
        if (from_date) {
            countQuery += ' AND DATE(so.order_date) >= ?';
            countParams.push(from_date);
        }
        if (to_date) {
            countQuery += ' AND DATE(so.order_date) <= ?';
            countParams.push(to_date);
        }

        const [countResult] = await db.execute(countQuery, countParams);
        sendSuccess(res, {
            message: 'Orders loaded.',
            data: orders,
            pagination: {
                total: countResult[0].total,
                page: currentPage,
                limit: currentLimit,
                pages: Math.ceil(countResult[0].total / currentLimit)
            }
        });
}));

// GET /api/orders/:id — Full order detail
router.get('/:id', asyncHandler(async (req, res) => {
        const db = req.db;
        const orderId = req.params.id;

        const [order] = await db.execute(`
            SELECT so.*, CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                   c.email, c.phone, v.license_plate, CONCAT(v.make, ' ', v.model) AS vehicle
            FROM service_orders so
            JOIN customers c ON so.customer_id = c.customer_id
            JOIN vehicles v ON so.vehicle_id = v.vehicle_id
            WHERE so.order_id = ?
        `, [orderId]);

        if (order.length === 0) throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');

        const [lineItems] = await db.execute(`
            SELECT sli.*, s.service_name, sc.category_name
            FROM service_line_items sli
            JOIN services s ON sli.service_id = s.service_id
            LEFT JOIN service_categories sc ON s.category_id = sc.category_id
            WHERE sli.order_id = ?
        `, [orderId]);

        const [partsUsed] = await db.execute(`
            SELECT pu.*, p.part_name, p.part_number
            FROM parts_used pu
            JOIN parts p ON pu.part_id = p.part_id
            WHERE pu.order_id = ?
        `, [orderId]);

        const [mechanics] = await db.execute(`
            SELECT ma.*, CONCAT(m.first_name, ' ', m.last_name) AS mechanic_name,
                   m.specialization
            FROM mechanic_assignments ma
            JOIN mechanics m ON ma.mechanic_id = m.mechanic_id
            WHERE ma.order_id = ?
        `, [orderId]);

        const [payments] = await db.execute(
            'SELECT * FROM payments WHERE order_id = ?', [orderId]
        );

        const [feedback] = await db.execute(
            'SELECT * FROM feedback WHERE order_id = ?', [orderId]
        );

        sendSuccess(res, {
            message: 'Order detail loaded.',
            data: {
                order: order[0],
                lineItems,
                partsUsed,
                mechanics,
                payments,
                feedback: feedback[0] || null
            }
        });
}));

// ★★★ POST /api/orders — Create order using STORED PROCEDURE (ACID) ★★★
router.post('/', manageRoles, validateOrderCreate, asyncHandler(async (req, res) => {
    const connection = await req.db.getConnection();
    try {
        const { appointment_id, vehicle_id, customer_id, mechanic_id,
                services: serviceItems, parts: partItems, estimated_days } = req.validated;

        // ★ BEGIN TRANSACTION ★
        await connection.beginTransaction();

        // 1. Create service order
        const [orderResult] = await connection.execute(
            `INSERT INTO service_orders (appointment_id, vehicle_id, customer_id, estimated_completion)
             VALUES (?, ?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY))`,
            [appointment_id || null, vehicle_id, customer_id, estimated_days || 1]
        );
        const orderId = orderResult.insertId;

        // 2. Add service line items
        if (serviceItems && serviceItems.length > 0) {
            for (let i = 0; i < serviceItems.length; i++) {
                const item = serviceItems[i];
                await connection.execute(
                    `INSERT INTO service_line_items (order_id, line_number, service_id, quantity, unit_price, discount_percent, line_total)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [orderId, i + 1, item.service_id, item.quantity || 1, 
                     item.unit_price, item.discount_percent || 0,
                     (item.quantity || 1) * Number(item.unit_price) * (1 - Number(item.discount_percent || 0) / 100)]
                );
            }
        }

        // 3. Add parts used and deduct inventory directly
        if (partItems && partItems.length > 0) {
            for (const part of partItems) {
                // Check stock availability
                const [stock] = await connection.execute(
                    'SELECT quantity_in_stock FROM parts WHERE part_id = ? FOR UPDATE',  // ★ Row Lock ★
                    [part.part_id]
                );

                if (stock[0].quantity_in_stock < part.quantity_used) {
                    await connection.rollback();
                    throw new AppError(`Insufficient stock for part ID ${part.part_id}.`, 400, 'INSUFFICIENT_STOCK');
                }

                await connection.execute(
                    `INSERT INTO parts_used (order_id, part_id, quantity_used, unit_price)
                     VALUES (?, ?, ?, ?)`,
                    [orderId, part.part_id, part.quantity_used, part.unit_price]
                );
                await connection.execute(
                    'UPDATE parts SET quantity_in_stock = quantity_in_stock - ? WHERE part_id = ?',
                    [part.quantity_used, part.part_id]
                );
            }
        }

        // 4. Assign mechanic
        if (mechanic_id) {
            await connection.execute(
                'INSERT INTO mechanic_assignments (order_id, mechanic_id) VALUES (?, ?)',
                [orderId, mechanic_id]
            );
            await connection.execute(
                "UPDATE mechanics SET status = 'busy' WHERE mechanic_id = ?",
                [mechanic_id]
            );
        }

        // 5. Update appointment status
        if (appointment_id) {
            await connection.execute(
                "UPDATE appointments SET status = 'in_progress' WHERE appointment_id = ?",
                [appointment_id]
            );
        }

        // 6. Recalculate totals
        const [laborCost] = await connection.execute(
            'SELECT COALESCE(SUM(line_total), 0) AS total FROM service_line_items WHERE order_id = ?',
            [orderId]
        );
        const [partsCost] = await connection.execute(
            'SELECT COALESCE(SUM(quantity_used * unit_price), 0) AS total FROM parts_used WHERE order_id = ?',
            [orderId]
        );

        const totalLabor = laborCost[0].total;
        const totalParts = partsCost[0].total;
        const totalAmount = Math.round(((parseFloat(totalLabor) + parseFloat(totalParts)) * 1.13) * 100) / 100; // 13% tax

        console.log(`ORDER ${orderId} CALC: Labor=${totalLabor}, Parts=${totalParts}, Total=${totalAmount}`);

        await connection.execute(
            `UPDATE service_orders 
             SET total_labor_cost = ?, total_parts_cost = ?, total_amount = ?, status = 'in_progress'
             WHERE order_id = ?`,
            [totalLabor, totalParts, totalAmount, orderId]
        );

        // ★ AUDIT LOG — Manual Trigger Simulation (DBMS Feature: Audit Trail) ★
        await connection.execute(
            `INSERT INTO audit_log (table_name, operation, record_id, user_id, changed_by, new_values) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            ['service_orders', 'INSERT', orderId, req.user.tenantUserId || null, req.user.username, JSON.stringify({
                totalAmount: totalAmount.toFixed(2),
                customer_id,
                vehicle_id
            })]
        );

        // ★ COMMIT — All changes become permanent ★
        await connection.commit();

        sendSuccess(res, {
            status: 201,
            message: 'Service order created successfully.',
            data: {
                orderId,
                totalAmount: totalAmount.toFixed(2)
            }
        });

    } catch (err) {
        // ★ ROLLBACK — Undo all changes on error ★
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}));

// PUT /api/orders/:id/complete — Complete order & process payment
router.put('/:id/complete', manageRoles, validateComplete, asyncHandler(async (req, res) => {
    const connection = await req.db.getConnection();
    try {
        const { payment_method } = req.validated;
        const orderId = req.params.id;

        await connection.beginTransaction();

        // Get order total
        const [order] = await connection.execute(
            'SELECT total_amount, customer_id FROM service_orders WHERE order_id = ?',
            [orderId]
        );

        if (order.length === 0) {
            await connection.rollback();
            throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
        }

        // Update order status
        await connection.execute(
            `UPDATE service_orders 
             SET status = 'completed', actual_completion = NOW()
             WHERE order_id = ?`,
            [orderId]
        );

        // Create payment
        await connection.execute(
            `INSERT INTO payments (order_id, amount, payment_method, transaction_ref, status)
             VALUES (?, ?, ?, CONCAT('TXN-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', ?), 'completed')`,
            [orderId, order[0].total_amount, payment_method, orderId]
        );

        // Free mechanics
        const [assignments] = await connection.execute(
            'SELECT mechanic_id FROM mechanic_assignments WHERE order_id = ?', [orderId]
        );
        for (const a of assignments) {
            await connection.execute(
                "UPDATE mechanics SET status = 'available' WHERE mechanic_id = ?",
                [a.mechanic_id]
            );
        }

        await connection.commit();
        sendSuccess(res, {
            message: 'Order completed successfully.',
            data: { amount: order[0].total_amount }
        });

    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}));

// PUT /api/orders/:id/deliver — Mark as delivered
router.put('/:id/deliver', manageRoles, asyncHandler(async (req, res) => {
        const db = req.db;
        const [result] = await db.query(
            "UPDATE service_orders SET status = 'delivered' WHERE order_id = ? AND status = 'completed'",
            [req.params.id]
        );
        if (result.affectedRows === 0) {
            throw new AppError('Order must be completed before delivery or was not found.', 400, 'INVALID_DELIVERY_STATE');
        }
        sendSuccess(res, { message: 'Vehicle marked as delivered.' });
}));

module.exports = router;
