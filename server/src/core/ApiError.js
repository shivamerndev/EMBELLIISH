/**
 * Typed application error. Anything thrown with a statusCode is treated as a
 * client-facing error by the global error middleware; everything else becomes a 500.
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors = null) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }

  /**
   * A business rule blocked the action (e.g. advance payment not received).
   * 422 keeps these distinguishable from plain validation failures on the client.
   */
  static workflow(message, errors = null) {
    return new ApiError(422, message, errors);
  }
}

export default ApiError;
