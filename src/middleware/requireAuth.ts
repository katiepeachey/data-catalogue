import { Request, Response, NextFunction } from 'express';

export default function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.session.authenticated) {
    return next();
  }
  res.redirect('/admin/login');
}
