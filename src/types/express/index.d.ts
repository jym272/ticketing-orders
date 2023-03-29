import { JwtPayloadCustom } from '../index';

export {};

declare global {
  namespace Express {
    interface Request {
      currentUser?: JwtPayloadCustom;
    }
  }
}
