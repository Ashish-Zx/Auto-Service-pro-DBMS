const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const { AppError, asyncHandler, sendSuccess } = require('../utils/http');
const {
    optionalString,
    requiredDate,
    requiredEnum,
    requiredInteger,
    requiredTime,
    validate
} = require('../utils/validation');

const manageRoles = authorize('owner', 'receptionist');
const appointmentStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'];

const validateCreateAppointment = validate((req) => {
    const errors = {};
    const customerId = requiredInteger(req.body.customer_id, 'Customer', { min: 1 });
    const vehicleId = requiredInteger(req.body.vehicle_id, 'Vehicle', { min: 1 });
    const appointmentDate = requiredDate(req.body.appointment_date, 'Appointment date');
    const appointmentTime = requiredTime(req.body.appointment_time, 'Appointment time');
    const notes = optionalString(req.body.notes, 'Notes', { max: 1000 });

    if (customerId.error) errors.customer_id = customerId.error;
    if (vehicleId.error) errors.vehicle_id = vehicleId.error;
    if (appointmentDate.error) errors.appointment_date = appointmentDate.error;
    if (appointmentTime.error) errors.appointment_time = appointmentTime.error;
    if (notes.error) errors.notes = notes.error;

    return {
        value: {
            customer_id: customerId.value,
            vehicle_id: vehicleId.value,
            appointment_date: appointmentDate.value,
            appointment_time: appointmentTime.value,
            notes: notes.value
        },
        errors
    };
});

const validateUpdateAppointment = validate((req) => {
    const errors = {};
    const status = requiredEnum(req.body.status, 'Status', appointmentStatuses);
    const notes = optionalString(req.body.notes, 'Notes', { max: 1000 });

    if (status.error) errors.status = status.error;
    if (notes.error) errors.notes = notes.error;

    return {
        value: {
            status: status.value,
            notes: notes.value
        },
        errors
    };
});

// GET all appointments
router.get('/', manageRoles, asyncHandler(async (req, res) => {
        const db = req.db;
        const { status = '', from_date = '', to_date = '', page = 1, limit = 20 } = req.query;
        const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1);
        const currentLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
        const offset = (currentPage - 1) * currentLimit;
        const params = [];
        let where = 'WHERE 1=1';

        if (status && appointmentStatuses.includes(status)) {
            where += ' AND a.status = ?';
            params.push(status);
        }
        if (from_date) {
            where += ' AND a.appointment_date >= ?';
            params.push(from_date);
        }
        if (to_date) {
            where += ' AND a.appointment_date <= ?';
            params.push(to_date);
        }

        const [appointments] = await db.execute(`
            SELECT a.*, 
                   CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
                   c.phone,
                   CONCAT(v.make, ' ', v.model) AS vehicle,
                   v.license_plate
            FROM appointments a
            JOIN customers c ON a.customer_id = c.customer_id
            JOIN vehicles v ON a.vehicle_id = v.vehicle_id
            ${where}
            ORDER BY a.appointment_date DESC, a.appointment_time ASC
            LIMIT ${currentLimit} OFFSET ${offset}
        `, params);

        const [countResult] = await db.execute(`
            SELECT COUNT(*) AS total
            FROM appointments a
            ${where}
        `, params);

        sendSuccess(res, {
            message: 'Appointments loaded.',
            data: appointments,
            pagination: {
                total: countResult[0].total,
                page: currentPage,
                limit: currentLimit,
                pages: Math.ceil(countResult[0].total / currentLimit)
            }
        });
}));

// POST - book appointment (with concurrency check)
router.post('/', manageRoles, validateCreateAppointment, asyncHandler(async (req, res) => {
    const connection = await req.db.getConnection();
    try {
        const { customer_id, vehicle_id, appointment_date, appointment_time, notes } = req.validated;

        await connection.beginTransaction();

        // Check for time slot conflict (Concurrency Control)
        const [conflicts] = await connection.execute(`
            SELECT COUNT(*) AS cnt FROM appointments 
            WHERE appointment_date = ? 
              AND appointment_time = ? 
              AND status NOT IN ('cancelled', 'completed')
            FOR UPDATE
        `, [appointment_date, appointment_time]);

        if (conflicts[0].cnt >= 3) { // Max 3 appointments per slot
            await connection.rollback();
            throw new AppError('Time slot is fully booked.', 409, 'TIME_SLOT_FULL');
        }

        const [result] = await connection.execute(
            `INSERT INTO appointments (customer_id, vehicle_id, appointment_date, appointment_time, notes)
             VALUES (?, ?, ?, ?, ?)`,
            [customer_id, vehicle_id, appointment_date, appointment_time, notes]
        );

        await connection.commit();
        sendSuccess(res, {
            status: 201,
            message: 'Appointment booked successfully.',
            data: { appointmentId: result.insertId }
        });
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}));

// PUT - update status
router.put('/:id', manageRoles, validateUpdateAppointment, asyncHandler(async (req, res) => {
        const db = req.db;
        const { status, notes } = req.validated;
        const [result] = await db.execute(
            'UPDATE appointments SET status = ?, notes = ? WHERE appointment_id = ?',
            [status, notes, req.params.id]
        );
        if (result.affectedRows === 0) throw new AppError('Appointment not found.', 404, 'APPOINTMENT_NOT_FOUND');
        await db.execute(
            'INSERT INTO audit_log (table_name, operation, record_id, user_id, changed_by, new_values) VALUES (?, ?, ?, ?, ?, ?)',
            ['appointments', 'UPDATE', req.params.id, req.user.tenantUserId || null, req.user.username, JSON.stringify({ status })]
        );
        sendSuccess(res, { message: 'Appointment updated successfully.' });
}));

module.exports = router;
