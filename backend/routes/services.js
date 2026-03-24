const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const { asyncHandler, sendSuccess } = require('../utils/http');

router.get('/', authorize('owner', 'receptionist'), asyncHandler(async (req, res) => {
        const db = req.db;
        const [services] = await db.execute(`
            SELECT s.*, sc.category_name
            FROM services s
            LEFT JOIN service_categories sc ON s.category_id = sc.category_id
            ORDER BY sc.category_name, s.service_name
        `);
        sendSuccess(res, { message: 'Services loaded.', data: services });
}));

router.get('/categories', authorize('owner', 'receptionist'), asyncHandler(async (req, res) => {
        const db = req.db;
        const [categories] = await db.execute('SELECT * FROM service_categories');
        sendSuccess(res, { message: 'Service categories loaded.', data: categories });
}));

router.get('/popularity', authorize('owner', 'receptionist'), asyncHandler(async (req, res) => {
        const db = req.db;
        const [report] = await db.execute('SELECT * FROM vw_service_popularity');
        sendSuccess(res, { message: 'Service popularity report loaded.', data: report });
}));

module.exports = router;
