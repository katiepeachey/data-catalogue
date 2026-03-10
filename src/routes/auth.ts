import { Router, Request, Response } from 'express';
import { loginView } from '../views/loginView';

const router = Router();

router.get('/login', (req: Request, res: Response) => {
  if (req.session.authenticated) {
    res.redirect('/admin/queue');
    return;
  }
  res.send(loginView());
});

router.post('/login', (req: Request, res: Response) => {
  const { password } = req.body as { password: string };
  const adminPassword = process.env.ADMIN_PASSWORD || 'changeme';

  if (password === adminPassword) {
    req.session.authenticated = true;
    res.redirect('/admin/queue');
  } else {
    res.send(loginView('Incorrect password. Please try again.'));
  }
});

router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

export default router;
