/**
 * Global Express error handler — returns structured JSON, never exposes stack traces.
 */
function errorHandler(err, req, res, _next) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR ${req.method} ${req.path}:`, err.message);

  // Multer file-size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      message: 'File exceeds 5MB limit. Split into smaller files.',
      error: { code: 'FILE_TOO_LARGE' }
    });
  }

  // Multer unsupported type
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(415).json({
      success: false,
      message: err.message || 'Only .csv and .xlsx files are supported.',
      error: { code: 'INVALID_FILE_TYPE' }
    });
  }

  const status = err.statusCode || err.status || 500;

  res.status(status).json({
    success: false,
    message: err.message || 'An unexpected error occurred.',
    error: {
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { details: err.toString() })
    }
  });
}

module.exports = { errorHandler };
