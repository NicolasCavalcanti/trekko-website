import type { AuthenticatedUser } from '../middlewares/auth';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    user?: AuthenticatedUser;
  }

  interface Response {
    locals: {
      requestId?: string;
      [key: string]: unknown;
    };
  }
}

export {};
