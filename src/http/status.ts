export enum HttpStatus {
  Ok = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  MethodNotAllowed = 405,
  PayloadTooLarge = 413,
  UnsupportedMediaType = 415,
  InternalServerError = 500,
  ServiceUnavailable = 503,
}

export enum JsonRpcErrorCode {
  ServerError = -32000,
  SessionNotFound = -32001,
  InternalError = -32603,
  ParseError = -32700,
}
