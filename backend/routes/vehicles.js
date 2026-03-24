const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const { AppError, asyncHandler, sendSuccess } = require('../utils/http');
const {
    optionalInteger,
    optionalString,
    requiredEnum,
    requiredInteger,
    requiredString,
    validate
} = require('../utils/validation');

const writeRoles = authorize('owner', 'receptionist');
const fuelTypes = ['petrol', 'diesel', 'electric', 'hybrid'];

const validateVehicle = validate((req) => {
    const errors = {};
    const customerId = requiredInteger(req.body.customer_id, 'Customer', { min: 1 });
    const licensePlate = requiredString(req.body.license_plate, 'License plate', { max: 20 });
    const make = requiredString(req.body.make, 'Make', { max: 50 });
    const model = requiredString(req.body.model, 'Model', { max: 50 });
    const year = requiredInteger(req.body.year, 'Year', { min: 1900, max: 2100 });
    const color = optionalString(req.body.color, 'Color', { max: 30 });
    const vin = optionalString(req.body.vin, 'VIN', { max: 17 });
    const mileage = optionalInteger(req.body.mileage, 'Mileage', { min: 0 });
    const fuelType = requiredEnum(req.body.fuel_type || 'petrol', 'Fuel type', fuelTypes);

    if (customerId.error) errors.customer_id = customerId.error;
    if (licensePlate.error) errors.license_plate = licensePlate.error;
    if (make.error) errors.make = make.error;
    if (model.error) errors.model = model.error;
    if (year.error) errors.year = year.error;
    if (color.error) errors.color = color.error;
    if (vin.error) errors.vin = vin.error;
    if (mileage.error) errors.mileage = mileage.error;
    if (fuelType.error) errors.fuel_type = fuelType.error;

    return {
        value: {
            customer_id: customerId.value,
            license_plate: licensePlate.value,
            make: make.value,
            model: model.value,
            year: year.value,
            color: color.value,
            vin: vin.value,
            mileage: mileage.value ?? 0,
            fuel_type: fuelType.value
        },
        errors
    };
});

// GET /api/vehicles
router.get('/', authorize('owner', 'receptionist'), asyncHandler(async (req, res) => {
        const db = req.db;
        const { search = '', page = 1, limit = 12, fuel_type = '' } = req.query;
        const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1);
        const currentLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 12, 1), 100);
        const offset = (currentPage - 1) * currentLimit;
        const params = [];
        let where = 'WHERE 1=1';

        if (search.trim()) {
            where += ' AND (v.license_plate LIKE ? OR v.make LIKE ? OR v.model LIKE ? OR CONCAT(c.first_name, " ", c.last_name) LIKE ?)';
            const term = `%${search.trim()}%`;
            params.push(term, term, term, term);
        }

        if (fuel_type && fuelTypes.includes(fuel_type)) {
            where += ' AND v.fuel_type = ?';
            params.push(fuel_type);
        }

        const [vehicles] = await db.execute(`
            SELECT v.*, CONCAT(c.first_name, ' ', c.last_name) AS owner_name, c.phone AS owner_phone
            FROM vehicles v
            JOIN customers c ON v.customer_id = c.customer_id
            ${where}
            ORDER BY v.vehicle_id DESC
            LIMIT ${currentLimit} OFFSET ${offset}
        `, params);

        const [countResult] = await db.execute(`
            SELECT COUNT(*) AS total
            FROM vehicles v
            JOIN customers c ON v.customer_id = c.customer_id
            ${where}
        `, params);

        sendSuccess(res, {
            message: 'Vehicles loaded.',
            data: vehicles,
            pagination: {
                total: countResult[0].total,
                page: currentPage,
                limit: currentLimit,
                pages: Math.ceil(countResult[0].total / currentLimit)
            }
        });
}));

// GET /api/vehicles/:id
router.get('/:id', authorize('owner', 'receptionist'), asyncHandler(async (req, res) => {
        const db = req.db;
        const [vehicle] = await db.execute(`
            SELECT v.*, CONCAT(c.first_name, ' ', c.last_name) AS owner_name
            FROM vehicles v
            JOIN customers c ON v.customer_id = c.customer_id
            WHERE v.vehicle_id = ?
        `, [req.params.id]);

        if (vehicle.length === 0) throw new AppError('Vehicle not found.', 404, 'VEHICLE_NOT_FOUND');

        // Service history for this vehicle
        const [history] = await db.execute(`
            SELECT so.order_id, so.order_date, so.status, so.total_amount,
                   GROUP_CONCAT(s.service_name SEPARATOR ', ') AS services_done
            FROM service_orders so
            LEFT JOIN service_line_items sli ON so.order_id = sli.order_id
            LEFT JOIN services s ON sli.service_id = s.service_id
            WHERE so.vehicle_id = ?
            GROUP BY so.order_id
            ORDER BY so.order_date DESC
        `, [req.params.id]);

        sendSuccess(res, {
            message: 'Vehicle loaded.',
            data: { vehicle: vehicle[0], serviceHistory: history }
        });
}));

// POST /api/vehicles
router.post('/', writeRoles, validateVehicle, asyncHandler(async (req, res) => {
        const db = req.db;
        const { customer_id, license_plate, make, model, year, color, vin, mileage, fuel_type } = req.validated;
        const [result] = await db.execute(
            `INSERT INTO vehicles (customer_id, license_plate, make, model, year, color, vin, mileage, fuel_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [customer_id, license_plate, make, model, year, color, vin, mileage || 0, fuel_type || 'petrol']
        );
        await db.execute(
            'INSERT INTO audit_log (table_name, operation, record_id, user_id, changed_by, new_values) VALUES (?, ?, ?, ?, ?, ?)',
            ['vehicles', 'INSERT', result.insertId, req.user.tenantUserId || null, req.user.username, JSON.stringify({ customer_id, license_plate })]
        );
        sendSuccess(res, {
            status: 201,
            message: 'Vehicle added successfully.',
            data: { vehicleId: result.insertId }
        });
}));

// PUT /api/vehicles/:id
router.put('/:id', writeRoles, validateVehicle, asyncHandler(async (req, res) => {
        const db = req.db;
        const { customer_id, license_plate, make, model, year, color, vin, mileage, fuel_type } = req.validated;
        const [result] = await db.execute(
            `UPDATE vehicles SET customer_id=?, license_plate=?, make=?, model=?, year=?, color=?, vin=?, mileage=?, fuel_type=?
             WHERE vehicle_id=?`,
            [customer_id, license_plate, make, model, year, color, vin, mileage, fuel_type, req.params.id]
        );
        if (result.affectedRows === 0) throw new AppError('Vehicle not found.', 404, 'VEHICLE_NOT_FOUND');
        await db.execute(
            'INSERT INTO audit_log (table_name, operation, record_id, user_id, changed_by, new_values) VALUES (?, ?, ?, ?, ?, ?)',
            ['vehicles', 'UPDATE', req.params.id, req.user.tenantUserId || null, req.user.username, JSON.stringify({ license_plate, mileage })]
        );
        sendSuccess(res, { message: 'Vehicle updated successfully.' });
}));

// DELETE /api/vehicles/:id
router.delete('/:id', writeRoles, asyncHandler(async (req, res) => {
        const db = req.db;
        const [result] = await db.execute('DELETE FROM vehicles WHERE vehicle_id = ?', [req.params.id]);
        if (result.affectedRows === 0) throw new AppError('Vehicle not found.', 404, 'VEHICLE_NOT_FOUND');
        await db.execute(
            'INSERT INTO audit_log (table_name, operation, record_id, user_id, changed_by, old_values) VALUES (?, ?, ?, ?, ?, ?)',
            ['vehicles', 'DELETE', req.params.id, req.user.tenantUserId || null, req.user.username, JSON.stringify({ deleted: true })]
        );
        sendSuccess(res, { message: 'Vehicle deleted successfully.' });
}));

module.exports = router;
