export function getApiError(error, fallbackMessage = 'Something went wrong.') {
  const payload = error?.response?.data || {};

  return {
    message: payload.message || error?.message || fallbackMessage,
    code: payload.code || null,
    fields: payload?.details?.fields || {},
  };
}
