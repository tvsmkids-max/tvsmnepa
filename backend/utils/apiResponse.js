"use strict";

class ApiResponse {
  constructor(res) {
    this.res = res;
  }

  success({
    statusCode = 200,
    message = "Success",
    data = null,
    pagination = null,
  }) {
    const response = {
      success: true,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
    };

    if (data !== null) response.data = data;
    if (pagination !== null) response.pagination = pagination;

    return this.res.status(statusCode).json(response);
  }

  created({ message = "Created successfully", data = null }) {
    return this.success({ statusCode: 201, message, data });
  }

  noContent({ message = "Deleted successfully" }) {
    return this.res.status(200).json({
      success: true,
      statusCode: 200,
      message,
      timestamp: new Date().toISOString(),
    });
  }

  error({
    statusCode = 500,
    message = "Internal Server Error",
    errors = null,
  }) {
    const response = {
      success: false,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
    };

    if (errors !== null) response.errors = errors;

    return this.res.status(statusCode).json(response);
  }

  badRequest({ message = "Bad Request", errors = null }) {
    return this.error({ statusCode: 400, message, errors });
  }

  unauthorized({ message = "Unauthorized. Please login." }) {
    return this.error({ statusCode: 401, message });
  }

  forbidden({ message = "Access denied. Insufficient permissions." }) {
    return this.error({ statusCode: 403, message });
  }

  notFound({ message = "Resource not found." }) {
    return this.error({ statusCode: 404, message });
  }

  conflict({ message = "Resource already exists.", errors = null }) {
    return this.error({ statusCode: 409, message, errors });
  }

  validationError({ message = "Validation failed", errors = [] }) {
    return this.error({ statusCode: 422, message, errors });
  }

  tooManyRequests({ message = "Too many requests. Please try again later." }) {
    return this.error({ statusCode: 429, message });
  }
}

const sendResponse = (res) => new ApiResponse(res);

module.exports = { sendResponse, ApiResponse };
