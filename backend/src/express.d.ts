import { User } from './types';

declare global {
  namespace Express {
    interface User extends User {}
    interface Request {
      user?: User;
      logout(options: { keepSessionInfo?: boolean }, callback: (err?: any) => void): void;
    }
  }
}