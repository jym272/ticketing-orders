import { Request, Response } from 'express';
import { getSequelizeClient, Order, Ticket } from '@db/index';
import { utils } from '@jym272ticketing/common';
import { OrderStatus } from '@custom-types/index';
const { httpStatusCodes, throwError, parseSequelizeError } = utils;
const { NOT_FOUND, UNAUTHORIZED, OK, INTERNAL_SERVER_ERROR } = httpStatusCodes;
const sequelize = getSequelizeClient();

export const cancelOrderController = () => {
  return async (req: Request, res: Response) => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- because of requireAuth middleware
    const currentUser = req.currentUser!;
    const userId = currentUser.jti;
    const { id } = req.params;

    let order: Order | null;
    try {
      order = await sequelize.transaction(async () => {
        return await Order.findByPk(id, {
          include: [
            {
              model: Ticket,
              as: 'ticket'
            }
          ]
        });
      });
    } catch (err) {
      const error = parseSequelizeError(err, `Cancel Order failed. currentUser ${JSON.stringify(currentUser)}`);
      return throwError('Cancel Order failed.', INTERNAL_SERVER_ERROR, error);
    }
    if (!order) {
      return throwError('Order not found.', NOT_FOUND);
    }
    if (order.userId !== Number(userId)) {
      return throwError(
        'You are not authorized to cancel this order.',
        UNAUTHORIZED,
        new Error(`Order userId ${order.userId} does not match currentUser ${userId}`)
      );
    }
    try {
      order.set({ status: OrderStatus.Cancelled });
      await order.save();
      // TODO: if publish fail the tansaction is rollback !! it must have !!!!!
      // publish an event saying this was cancelled TODO: publish event, maybe test this publish too???
      return res.status(OK).json(order);
    } catch (err) {
      const error = parseSequelizeError(
        err,
        `Updating Order status failed. currentUser ${JSON.stringify(currentUser)}, order ${JSON.stringify(order)}`
      );
      return throwError('Updating Order status failed.', INTERNAL_SERVER_ERROR, error);
    }
  };
};
