"use strict";

const { sendResponse } = require("../utils/apiResponse");

/**
 * Validate request body against a Joi schema
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message.replace(/['"]/g, ""),
      }));

      return sendResponse(res).validationError({
        message: "Validation failed",
        errors,
      });
    }

    req.body = value;
    next();
  };
};

/**
 * Validate query parameters against a Joi schema
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message.replace(/['"]/g, ""),
      }));

      return sendResponse(res).validationError({
        message: "Query validation failed",
        errors,
      });
    }

    req.query = value;
    next();
  };
};

/**
 * Validate URL parameters
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message.replace(/['"]/g, ""),
      }));

      return sendResponse(res).validationError({
        message: "Parameter validation failed",
        errors,
      });
    }

    req.params = value;
    next();
  };
};

module.exports = { validateBody, validateQuery, validateParams };
