const { AppError } = require('./http');

const isEmpty = (value) => value === undefined || value === null || `${value}`.trim() === '';

const requiredString = (value, label, { min = 1, max = 255, pattern } = {}) => {
    if (isEmpty(value)) return { error: `${label} is required.` };
    const normalized = `${value}`.trim();
    if (normalized.length < min) return { error: `${label} must be at least ${min} characters.` };
    if (normalized.length > max) return { error: `${label} must be at most ${max} characters.` };
    if (pattern && !pattern.test(normalized)) return { error: `${label} has an invalid format.` };
    return { value: normalized };
};

const optionalString = (value, label, { max = 255, pattern } = {}) => {
    if (isEmpty(value)) return { value: null };
    const normalized = `${value}`.trim();
    if (normalized.length > max) return { error: `${label} must be at most ${max} characters.` };
    if (pattern && !pattern.test(normalized)) return { error: `${label} has an invalid format.` };
    return { value: normalized };
};

const requiredInteger = (value, label, { min, max } = {}) => {
    if (isEmpty(value)) return { error: `${label} is required.` };
    const parsed = Number.parseInt(value, 10);
    if (!Number.isInteger(parsed)) return { error: `${label} must be a whole number.` };
    if (min !== undefined && parsed < min) return { error: `${label} must be at least ${min}.` };
    if (max !== undefined && parsed > max) return { error: `${label} must be at most ${max}.` };
    return { value: parsed };
};

const optionalInteger = (value, label, { min, max } = {}) => {
    if (isEmpty(value)) return { value: null };
    return requiredInteger(value, label, { min, max });
};

const requiredNumber = (value, label, { min, max } = {}) => {
    if (isEmpty(value)) return { error: `${label} is required.` };
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return { error: `${label} must be a valid number.` };
    if (min !== undefined && parsed < min) return { error: `${label} must be at least ${min}.` };
    if (max !== undefined && parsed > max) return { error: `${label} must be at most ${max}.` };
    return { value: parsed };
};

const optionalNumber = (value, label, { min, max } = {}) => {
    if (isEmpty(value)) return { value: null };
    return requiredNumber(value, label, { min, max });
};

const requiredEnum = (value, label, allowedValues) => {
    if (isEmpty(value)) return { error: `${label} is required.` };
    if (!allowedValues.includes(value)) return { error: `${label} must be one of: ${allowedValues.join(', ')}.` };
    return { value };
};

const optionalEnum = (value, label, allowedValues) => {
    if (isEmpty(value)) return { value: null };
    return requiredEnum(value, label, allowedValues);
};

const requiredDate = (value, label) => {
    if (isEmpty(value)) return { error: `${label} is required.` };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(`${value}`)) return { error: `${label} must be in YYYY-MM-DD format.` };
    return { value };
};

const requiredTime = (value, label) => {
    if (isEmpty(value)) return { error: `${label} is required.` };
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(`${value}`)) return { error: `${label} must be in HH:MM or HH:MM:SS format.` };
    return { value: `${value}`.length === 5 ? `${value}:00` : value };
};

const requiredArray = (value, label, { min = 1 } = {}) => {
    if (!Array.isArray(value)) return { error: `${label} must be an array.` };
    if (value.length < min) return { error: `${label} must include at least ${min} item${min > 1 ? 's' : ''}.` };
    return { value };
};

const validate = (parser) => (req, res, next) => {
    const { value, errors } = parser(req);
    if (errors && Object.keys(errors).length > 0) {
        return next(new AppError('Validation failed.', 400, 'VALIDATION_ERROR', { fields: errors }));
    }
    req.validated = value;
    return next();
};

module.exports = {
    optionalEnum,
    optionalInteger,
    optionalNumber,
    optionalString,
    requiredArray,
    requiredDate,
    requiredEnum,
    requiredInteger,
    requiredNumber,
    requiredString,
    requiredTime,
    validate
};
