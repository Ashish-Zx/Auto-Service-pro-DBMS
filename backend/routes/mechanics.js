const express = require('express');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const { asyncHandler, sendSuccess } = require('../utils/http');
const { optionalString, requiredDate, requiredNumber, requiredString, validate } = require('../utils/validation');

const validateMechanic = validate((req) => {
    const errors = {};
    const firstName = requiredString(req.body.first_name, 'First name', { max: 50 });
    const lastName = requiredString(req.body.last_name, 'Last name', { max: 50 });
    const email = optionalString(req.body.email, 'Email', { max: 100, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ });
    const phone = optionalString(req.body.phone, 'Phone', { max: 15 });
    const specialization = optionalString(req.body.specialization, 'Specialization', { max: 100 });
    const hireDate = requiredDate(req.body.hire_date, 'Hire date');
    const hourlyRate = requiredNumber(req.body.hourly_rate, 'Hourly rate', { min: 0.01 });

    if (firstName.error) errors.first_name = firstName.error;
    if (lastName.error) errors.last_name = lastName.error;
    if (email.error) errors.email = email.error;
    if (phone.error) errors.phone = phone.error;
    if (specialization.error) errors.specialization = specialization.error;
    if (hireDate.error) errors.hire_date = hireDate.error;
    if (hourlyRate.error) errors.hourly_rate = hourlyRate.error;

    return {
        value: {
            first_name: firstName.value,
            last_name: lastName.value,
            email: email.value,
            phone: phone.value,
            specialization: specialization.value,
            hire_date: hireDate.value,
            hourly_rate: hourlyRate.value
        },
        errors
    };
});

router.get('/', authorize('owner', 'receptionist'), asyncHandler(async (req, res) => {
        const db = req.db;
        const [mechanics] = await db.execute('SELECT * FROM vw_mechanic_workload');
        sendSuccess(res, { message: 'Mechanics loaded.', data: mechanics });
}));

router.get('/available', authorize('owner', 'receptionist'), asyncHandler(async (req, res) => {
        const db = req.db;
        const [mechanics] = await db.execute(
            "SELECT * FROM mechanics WHERE status = 'available' ORDER BY hourly_rate ASC"
        );
        sendSuccess(res, { message: 'Available mechanics loaded.', data: mechanics });
}));

router.post('/', authorize('owner', 'receptionist'), validateMechanic, asyncHandler(async (req, res) => {
        const db = req.db;
        const { first_name, last_name, email, phone, specialization, hire_date, hourly_rate } = req.validated;
        const [result] = await db.execute(
            `INSERT INTO mechanics (first_name, last_name, email, phone, specialization, hire_date, hourly_rate)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [first_name, last_name, email, phone, specialization, hire_date, hourly_rate]
        );
        sendSuccess(res, {
            status: 201,
            message: 'Mechanic added successfully.',
            data: { mechanicId: result.insertId }
        });
}));

module.exports = router;
