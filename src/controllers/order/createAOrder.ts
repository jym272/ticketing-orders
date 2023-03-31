import { Request, Response } from 'express';
import { getSequelizeClient, Order, Ticket } from '@db/index';
import { utils } from '@jym272ticketing/common';
import { parseSequelizeError } from '@utils/parsers';
const { httpStatusCodes, throwError } = utils;
const { CREATED, BAD_REQUEST, INTERNAL_SERVER_ERROR } = httpStatusCodes;
const sequelize = getSequelizeClient();

const EXPIRATION_ORDER_MINUTES = 15;

export const createAOrderController = () => {
  return async (req: Request, res: Response) => {
    const { ticketId } = req.body as { ticketId: string | number };
    if (Number.isNaN(Number(ticketId)) || Number(ticketId) <= 0) {
      throwError('Invalid ticketId.', BAD_REQUEST, new Error(`TicketId is required: ${ticketId}`));
    }

    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return throwError('Ticket not found.', BAD_REQUEST, new Error(`Ticket not found: ${ticketId}`));
    }

    const isReserved = await ticket.isReserved();
    const reservedOrders = await ticket.getReservedOrders();

    if (isReserved || reservedOrders.length > 0) {
      return throwError(
        'Ticket is already reserved.',
        BAD_REQUEST,
        new Error(`Ticket is already reserved: ${ticketId}, reservedOrders: ${JSON.stringify(reservedOrders)}`)
      );
    }
    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPIRATION_ORDER_MINUTES * 60);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- because of requireAuth middleware
    const currentUser = req.currentUser!;
    const userId = currentUser.jti;

    try {
      const newOrder = await sequelize.transaction(async () => {
        const order = await Order.create({
          userId: Number(userId),
          expiresAt: expiration,
          ticketId: ticket.id
        });

        // TODO: if publish fail the tansaction is rollback !! it must have !!!!
        // TODO: publish an event saying this was created TODO: publish event, maybe test this publish too???
        return order;
      });
      return res.status(CREATED).json({ message: 'Order created.', order: newOrder });
    } catch (err) {
      const error = parseSequelizeError(
        err,
        `Creating an Order failed. ticketId ${ticketId}. currentUser ${JSON.stringify(currentUser)}`
      );
      throwError('Creating Order failed.', INTERNAL_SERVER_ERROR, error);
    }
  };
};