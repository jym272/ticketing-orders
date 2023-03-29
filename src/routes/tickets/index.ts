import { Router } from 'express';
import { ticketsController } from '@controllers/tickets';
import { commonController } from '@jym272ticketing/common';
import { getEnvOrFail } from '@utils/env';
import { nc } from '@events/nats-jetstream';
import { httpStatusCodes } from '@jym272ticketing/common/dist/utils';
const { verifyCurrentUser, requireAuth } = commonController;
const { retrieveAllTickets, retrieveATicket, createATicket, checkAttributes, updateATicket } = ticketsController;
const { BAD_REQUEST, OK } = httpStatusCodes;

const secret = getEnvOrFail('JWT_SECRET');

const authMiddleware = Router();
authMiddleware.use(verifyCurrentUser(secret), requireAuth, checkAttributes);

export const tickets = Router();

tickets.get('/api/tickets', retrieveAllTickets);
tickets.get('/api/tickets/:id', retrieveATicket);
tickets.post('/api/tickets', authMiddleware, createATicket);
tickets.put('/api/tickets/:id', authMiddleware, updateATicket);
//TODO: refactor, maybe common api later
tickets.get('/api/healthz', (req, res) => {
  const ncIsClosed = nc ? nc.isClosed() : true;
  if (ncIsClosed) {
    return res.status(BAD_REQUEST).send({ status: 'error' });
  }
  return res.status(OK).send({ status: 'ok' });
});
