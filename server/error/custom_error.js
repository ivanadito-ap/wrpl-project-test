"use strict";
const ErrorMessage = {
    DB_CALL_ERROR: {
        message: "An error occured during the database call.",
        code: "500",
    },
};
class ServerError extends Error {
    constructor(errorType) {
        super(ErrorMessage[errorType]['message']);
        this.statusCode = ErrorMessage[errorType]['code'];
        this.message = ErrorMessage[errorType]['message'];
        Error.captureStackTrace(this, this.constructor);
    }
}
