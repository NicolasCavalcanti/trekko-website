import type { AuthenticatedUser } from '../middlewares/auth';

declare module 'express-serve-static-core' {
  interface Request {
    requestId?: string;
    user?: AuthenticatedUser;
    csrfToken?: string;
  }

  interface Response {
    locals: {
      requestId?: string;
      csrfToken?: string;
      [key: string]: unknown;
    };
  }
}

export {};
