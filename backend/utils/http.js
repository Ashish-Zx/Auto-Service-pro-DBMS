class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

const sendSuccess = (res, { status = 200, message = 'OK', data = null, pagination = null, meta = null } = {}) => {
    const payload = {
        success: true,
        message,
        data
    };

    if (pagination) payload.pagination = pagination;
    if (meta) payload.meta = meta;

    return res.status(status).json(payload);
};

const sendError = (res, err) => {
    const statusCode = err.statusCode || 500;
    const payload = {
        success: false,
        message: err.message || 'Something went wrong.',
        code: err.code || 'INTERNAL_ERROR'
    };

    if (err.details) {
        payload.details = err.details;
    }

    return res.status(statusCode).json(payload);
};

const notFound = (req, res, next) => {
    next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND'));
};

const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    if (err.code === 'ER_DUP_ENTRY' && !err.statusCode) {
        return sendError(res, new AppError('A record with the same unique value already exists.', 409, 'DUPLICATE_ENTRY'));
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2' && !err.statusCode) {
        return sendError(res, new AppError('Related record not found.', 400, 'FOREIGN_KEY_ERROR'));
    }

    if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' && !err.statusCode) {
        return sendError(res, new AppError('One or more values violate database rules.', 400, 'CHECK_CONSTRAINT_ERROR'));
    }

    if (!(err instanceof AppError)) {
        console.error(err);
    }

    return sendError(
        res,
        err instanceof AppError
            ? err
            : new AppError('Something went wrong.', 500, 'INTERNAL_ERROR')
    );
};

module.exports = {
    AppError,
    asyncHandler,
    errorHandler,
    notFound,
    sendSuccess
};
