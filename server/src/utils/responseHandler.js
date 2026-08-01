/**
 * Every response from the API has the same envelope, so the client has exactly
 * one shape to unwrap: `{ success, message, data }` or `{ success, message, errors }`.
 */
const sendSuccess = (res, message = 'Success', data = null, statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

const sendError = (res, message = 'Error', errors = null, statusCode = 500, extra = {}) =>
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...Object.fromEntries(Object.entries(extra).filter(([, value]) => value !== undefined)),
  });

export { sendSuccess, sendError };
