const mongoose = require("mongoose");

const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

 if (err instanceof mongoose.Error.ValidationError) {
    const errors = {};

    Object.keys(err.errors).forEach((field) => {
      errors[field] = err.errors[field].message;
    });

    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors,
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({
      success: false,
      message: "Invalid task ID",
      errors: {
        [err.path]: "The provided ID is not a valid MongoDB ObjectId",
      },
    });
  }

  if (err.code === 11000) {
    const duplicateField = Object.keys(err.keyValue || {})[0];

    return res.status(400).json({
      success: false,
      message: "Duplicate value",
      errors: {
        [duplicateField || "field"]: "This value already exists",
      },
    });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format",
      errors: {
        body: "Request body contains invalid JSON",
      },
    });
  }

  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message || "Request failed",
    });
  }

 return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

module.exports = errorHandler;