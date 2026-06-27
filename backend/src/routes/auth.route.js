import express from 'express';
import { signup } from '../controllers/auth.controller.js';
import { login } from '../controllers/auth.controller.js';
import { logout } from '../controllers/auth.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import {arcjetProtection} from '../middleware/arcjet.middleware.js';

const router = express.Router();


//router.get("/test",  (req, res) => {
//     res.status(200).json({ message: "Test route"});
// });

router.use(arcjetProtection);

router.post('/signup', signup);

router.post('/login', login);

router.post('/logout', logout);

router.get('/verify', protectRoute, ( req, res) => res.status(200).json(req.user));


export default router;