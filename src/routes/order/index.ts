import { Router } from 'express';
import { orderController } from '@controllers/order';
import { commonController } from '@jym272ticketing/common';
import { getEnvOrFail } from '@jym272ticketing/common/dist/utils';
const { verifyCurrentUser, requireAuth } = commonController;
const { createAOrder, getOrders, getOrder, cancelOrder } = orderController;

const secret = getEnvOrFail('JWT_SECRET');
const authMiddleware = Router();
authMiddleware.use(verifyCurrentUser(secret), requireAuth);

export const order = Router();

order.post('/api/orders', authMiddleware, createAOrder);
order.get('/api/orders', authMiddleware, getOrders);
order.get('/api/orders/:id', authMiddleware, getOrder);
order.patch('/api/orders/:id', authMiddleware, cancelOrder);
