import { Router } from 'express';
import { registerUser, userLogin, getCurrentUser } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register', registerUser);
router.post('/login', userLogin);
router.get('/me', authMiddleware, getCurrentUser);

export default router;
