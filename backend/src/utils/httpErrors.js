// src/utils/httpErrors.js
export class BadRequest extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
    this.name = 'BadRequest';
  }
}

export class NotFound extends Error {
  constructor(message) {
    super(message);
    this.status = 404;
    this.name = 'NotFound';
  }
}

export class Forbidden extends Error {
  constructor(message) {
    super(message);
    this.status = 403;
    this.name = 'Forbidden';
  }
}

export class Unauthorized extends Error {
  constructor(message) {
    super(message);
    this.status = 401;
    this.name = 'Unauthorized';
  }
}

