import { Request, Response } from 'express';
import { getSequelizeClient, Order, Ticket } from '@db/index';
import { utils } from '@jym272ticketing/common';
import { publish, subjects } from '@jym272ticketing/common/dist/events';
const { httpStatusCodes, throwError, parseSequelizeError, getEnvOrFail } = utils;
const { CREATED, BAD_REQUEST, INTERNAL_SERVER_ERROR } = httpStatusCodes;
const sequelize = getSequelizeClient();

const EXPIRATION_ORDER_MINUTES = Number(getEnvOrFail('EXPIRATION_ORDER_MINUTES'));

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
      //TODO: The order is reserved if is not cancelled -> is cancelled if is was created and the expiration time has passed
      //TODO: also is reserved if the Order is complete (paid) > In the Ticket Api the Ticket modal has a userId
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

    let seq;
    try {
      const newOrder = await sequelize.transaction(async () => {
        const order = await Order.create({
          userId: Number(userId),
          expiresAt: expiration,
          ticketId: ticket.id
        });

        const orderWithTicket = await Order.findByPk(order.id, {
          include: [
            {
              model: Ticket,
              as: 'ticket'
            }
          ]
        });

        const pa = await publish(orderWithTicket, subjects.OrderCreated);
        seq = pa.seq; // The sequence number of the message as stored in JetStream
        return orderWithTicket;
      });
      return res.status(CREATED).json({ message: 'Order created.', order: newOrder, seq });
    } catch (err) {
      const error = parseSequelizeError(
        err,
        `Creating an Order failed. ticketId ${ticketId}. currentUser ${JSON.stringify(currentUser)}`
      );
      throwError('Creating Order failed.', INTERNAL_SERVER_ERROR, error);
    }
  };
};
