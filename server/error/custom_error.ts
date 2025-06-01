const ErrorMessage : Record<string, Record<string, string>> = {
    DB_CALL_ERROR : {
      message:"An error occured during the database call.",
       code: "500",
      },
};
class ServerError extends Error {
    statusCode: string;
    message: string;
    constructor(errorType:string) {
      super(ErrorMessage[errorType]['message']);
      this.statusCode = ErrorMessage[errorType]['code'];
      this.message = ErrorMessage[errorType]['message'] 
      Error.captureStackTrace(this, this.constructor);
    }
  }