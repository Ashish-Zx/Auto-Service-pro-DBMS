const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/http');

const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return next(new AppError('Access denied. No token provided.', 401, 'AUTH_REQUIRED'));

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        next(new AppError('Invalid or expired token.', 401, 'INVALID_TOKEN'));
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return next(new AppError('Insufficient permissions.', 403, 'FORBIDDEN'));
        }
        next();
    };
};

module.exports = { authenticate, authorize };
