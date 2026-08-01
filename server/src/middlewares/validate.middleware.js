import ApiError from '../core/ApiError.js';

/**
 * Parses the request body against a zod schema and hands the *parsed* result to
 * the controller via `req.validated`, so defaults and coercions actually apply.
 */
const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || source,
      message: issue.message,
    }));
    return next(ApiError.badRequest('Validation failed', errors));
  }

  req.validated = result.data;
  return next();
};

export default validate;
