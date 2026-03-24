const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { authenticate } = require('./middleware/auth');
const { attachTenantFromToken } = require('./middleware/tenant');
const { initControlPlane, testPool, getControlDb } = require('./config/db');
const { errorHandler, notFound, sendSuccess } = require('./utils/http');

const app = express();

// CORS Configuration (Updated for Local Only)
const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
    sendSuccess(res, {
        message: 'API is healthy.',
        data: {
            status: 'ok',
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        }
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', authenticate, attachTenantFromToken, require('./routes/customers'));
app.use('/api/vehicles', authenticate, attachTenantFromToken, require('./routes/vehicles'));
app.use('/api/services', authenticate, attachTenantFromToken, require('./routes/services'));
app.use('/api/orders', authenticate, attachTenantFromToken, require('./routes/serviceOrders'));
app.use('/api/appointments', authenticate, attachTenantFromToken, require('./routes/appointments'));
app.use('/api/mechanics', authenticate, attachTenantFromToken, require('./routes/mechanics'));
app.use('/api/inventory', authenticate, attachTenantFromToken, require('./routes/inventory'));
app.use('/api/reports', authenticate, attachTenantFromToken, require('./routes/reports'));

// Root route
app.get('/', (req, res) => {
    sendSuccess(res, {
        message: 'Garage Pilot API is running.',
        data: { name: 'Garage Pilot API' }
    });
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
initControlPlane()
    .then(async () => {
        await testPool(getControlDb(), 'Control database');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Failed to initialize control plane:', error);
        process.exit(1);
    });
