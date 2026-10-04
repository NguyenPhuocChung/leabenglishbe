export function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    return next(error);
  }

  if (error.name === "ValidationError") {
    return response.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: Object.values(error.errors).map((item) => item.message),
    });
  }

  if (error.name === "CastError") {
    return response.status(400).json({ success: false, message: "Invalid resource id." });
  }

  if (error.code === 11000) {
    return response.status(409).json({
      success: false,
      message: "A record with this value already exists.",
    });
  }

  const status = error.statusCode || 500;
  response.status(status).json({
    success: false,
    message: status >= 500 ? "Internal server error." : error.message,
  });
}