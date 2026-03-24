const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const { AppError, asyncHandler, sendSuccess } = require('../utils/http');
const { optionalString, requiredInteger, validate } = require('../utils/validation');

const dashboardAccess = authorize('owner', 'receptionist');
const manageRoles = authorize('owner', 'receptionist');
const ownerOnly = authorize('owner');

const validateFeedback = validate((req) => {
    const errors = {};
    const orderId = requiredInteger(req.body.order_id, 'Order', { min: 1 });
    const rating = requiredInteger(req.body.rating, 'Rating', { min: 1, max: 5 });
    const comments = optionalString(req.body.comments, 'Comments', { max: 1000 });

    if (orderId.error) errors.order_id = orderId.error;
    if (rating.error) errors.rating = rating.error;
    if (comments.error) errors.comments = comments.error;

    return {
        value: {
            order_id: orderId.value,
            rating: rating.value,
            comments: comments.value
        },
        errors
    };
});

// GET /api/reports/dashboard — Dashboard stats
router.get('/dashboard', dashboardAccess, asyncHandler(async (req, res) => {
        const db = req.db;
        // Total customers
        const [customers] = await db.execute('SELECT COUNT(*) AS total FROM customers');
        
        // Active orders
        const [activeOrders] = await db.execute(
            "SELECT COUNT(*) AS total FROM service_orders WHERE status IN ('pending','in_progress')"
        );
        
        // Today's revenue
        const [todayRevenue] = await db.execute(`
            SELECT COALESCE(SUM(amount), 0) AS total 
            FROM payments 
            WHERE DATE(payment_date) = CURDATE() AND status = 'completed'
        `);
        
        // Available mechanics
        const [availMechanics] = await db.execute(
            "SELECT COUNT(*) AS total FROM mechanics WHERE status = 'available'"
        );
        
        // Low stock items
        const [lowStock] = await db.execute(
            "SELECT COUNT(*) AS total FROM vw_inventory_status WHERE stock_status != 'IN STOCK'"
        );
        
        // Avg rating
        const [avgRating] = await db.execute(
            'SELECT COALESCE(ROUND(AVG(rating), 1), 0) AS avg_rating FROM feedback'
        );

        sendSuccess(res, {
            message: 'Dashboard metrics loaded.',
            data: {
                totalCustomers: customers[0].total,
                activeOrders: activeOrders[0].total,
                todayRevenue: todayRevenue[0].total,
                availableMechanics: availMechanics[0].total,
                lowStockItems: lowStock[0].total,
                avgRating: avgRating[0].avg_rating
            }
        });
}));

// GET /api/reports/revenue — Daily revenue (uses VIEW)
router.get('/revenue', dashboardAccess, asyncHandler(async (req, res) => {
        const db = req.db;
        const [revenue] = await db.execute('SELECT * FROM vw_daily_revenue LIMIT 30');
        sendSuccess(res, { message: 'Revenue report loaded.', data: revenue });
}));

// GET /api/reports/owner-summary — Owner business insights
router.get('/owner-summary', ownerOnly, asyncHandler(async (req, res) => {
        const db = req.db;

        const [[monthlyRevenue]] = await db.execute(`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM payments
            WHERE status = 'completed'
              AND YEAR(payment_date) = YEAR(CURDATE())
              AND MONTH(payment_date) = MONTH(CURDATE())
        `);

        const [[monthlyOrders]] = await db.execute(`
            SELECT COUNT(*) AS total
            FROM service_orders
            WHERE YEAR(order_date) = YEAR(CURDATE())
              AND MONTH(order_date) = MONTH(CURDATE())
        `);

        const [[pendingCollections]] = await db.execute(`
            SELECT COALESCE(SUM(total_amount), 0) AS total
            FROM service_orders
            WHERE status IN ('completed', 'delivered')
              AND order_id NOT IN (
                SELECT DISTINCT order_id
                FROM payments
                WHERE status = 'completed'
              )
        `);

        const [[monthlyPartsCost]] = await db.execute(`
            SELECT COALESCE(SUM(total_parts_cost), 0) AS total
            FROM service_orders
            WHERE YEAR(order_date) = YEAR(CURDATE())
              AND MONTH(order_date) = MONTH(CURDATE())
        `);

        const [[monthlyLaborRevenue]] = await db.execute(`
            SELECT COALESCE(SUM(total_labor_cost), 0) AS total
            FROM service_orders
            WHERE YEAR(order_date) = YEAR(CURDATE())
              AND MONTH(order_date) = MONTH(CURDATE())
        `);

        const [[repeatCustomers]] = await db.execute(`
            SELECT COUNT(*) AS total
            FROM (
              SELECT customer_id
              FROM service_orders
              GROUP BY customer_id
              HAVING COUNT(*) > 1
            ) repeated
        `);

        const [[totalCustomers]] = await db.execute('SELECT COUNT(*) AS total FROM customers');

        const [[paymentMix]] = await db.execute(`
            SELECT payment_method, COUNT(*) AS tx_count, COALESCE(SUM(amount), 0) AS total
            FROM payments
            WHERE status = 'completed'
              AND YEAR(payment_date) = YEAR(CURDATE())
              AND MONTH(payment_date) = MONTH(CURDATE())
            GROUP BY payment_method
            ORDER BY total DESC
            LIMIT 1
        `);

        const monthlyRevenueValue = Number(monthlyRevenue.total || 0);
        const monthlyOrdersValue = Number(monthlyOrders.total || 0);
        const avgOrderValue = monthlyOrdersValue > 0 ? monthlyRevenueValue / monthlyOrdersValue : 0;
        const retentionRate = Number(totalCustomers.total || 0) > 0
            ? (Number(repeatCustomers.total || 0) / Number(totalCustomers.total || 0)) * 100
            : 0;

        sendSuccess(res, {
            message: 'Owner summary loaded.',
            data: {
                monthlyRevenue: monthlyRevenueValue,
                monthlyOrders: monthlyOrdersValue,
                avgOrderValue,
                pendingCollections: Number(pendingCollections.total || 0),
                monthlyPartsCost: Number(monthlyPartsCost.total || 0),
                estimatedGrossMargin: monthlyRevenueValue - Number(monthlyPartsCost.total || 0),
                laborRevenue: Number(monthlyLaborRevenue.total || 0),
                repeatCustomers: Number(repeatCustomers.total || 0),
                retentionRate: Number(retentionRate.toFixed(1)),
                topPaymentMethod: paymentMix?.payment_method || 'n/a',
                topPaymentMethodTotal: Number(paymentMix?.total || 0)
            }
        });
}));

// GET /api/reports/top-customers — Top customers by spend
router.get('/top-customers', ownerOnly, asyncHandler(async (req, res) => {
        const db = req.db;
        const [customers] = await db.execute(`
            SELECT
                c.customer_id,
                CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                c.phone,
                COUNT(so.order_id) AS total_orders,
                COALESCE(SUM(so.total_amount), 0) AS total_spent,
                MAX(so.order_date) AS last_order_date
            FROM customers c
            LEFT JOIN service_orders so ON so.customer_id = c.customer_id
            GROUP BY c.customer_id, c.first_name, c.last_name, c.phone
            HAVING total_orders > 0
            ORDER BY total_spent DESC, total_orders DESC
            LIMIT 5
        `);

        sendSuccess(res, {
            message: 'Top customers loaded.',
            data: customers
        });
}));

// GET /api/reports/service-popularity
router.get('/service-popularity', dashboardAccess, asyncHandler(async (req, res) => {
        const db = req.db;
        const [data] = await db.execute('SELECT * FROM vw_service_popularity');
        sendSuccess(res, { message: 'Service popularity loaded.', data });
}));

// GET /api/reports/mechanic-performance
router.get('/mechanic-performance', dashboardAccess, asyncHandler(async (req, res) => {
        const db = req.db;
        const [data] = await db.execute('SELECT * FROM vw_mechanic_workload');
        sendSuccess(res, { message: 'Mechanic performance loaded.', data });
}));

// GET /api/reports/audit-log — For Activity Feed
router.get('/audit-log', manageRoles, asyncHandler(async (req, res) => {
        const db = req.db;
        const [logs] = await db.execute(
            'SELECT * FROM audit_log ORDER BY changed_at DESC LIMIT 20'
        );
        sendSuccess(res, { message: 'Audit log loaded.', data: logs });
}));

// POST /api/reports/feedback — Submit order feedback (DBMS Feature: Feedback table)
router.post('/feedback', authorize('owner', 'receptionist'), validateFeedback, asyncHandler(async (req, res) => {
        const db = req.db;
        const { order_id, rating, comments } = req.validated;
        
        // 1. Get customer_id from service_order
        const [[order_res]] = await db.execute('SELECT customer_id FROM service_orders WHERE order_id = ?', [order_id]);
        
        if (!order_res) {
            throw new AppError('Order not found.', 404, 'ORDER_NOT_FOUND');
        }

        const customer_id = order_res.customer_id;

        // 2. Insert feedback
        await db.execute(
            'INSERT INTO feedback (order_id, customer_id, rating, comments) VALUES (?, ?, ?, ?)',
            [order_id, customer_id, rating, comments]
        );

        // 2. Audit Log
        await db.execute(
            'INSERT INTO audit_log (table_name, operation, record_id, user_id, changed_by, new_values) VALUES (?, ?, ?, ?, ?, ?)',
            ['feedback', 'INSERT', order_id, req.user.tenantUserId || null, req.user.username, JSON.stringify({ rating, comments: (comments || '').substring(0, 50) })]
        );

        sendSuccess(res, {
            status: 201,
            message: 'Feedback submitted successfully.',
            data: { order_id }
        });
}));

module.exports = router;
