import { Request, Response } from 'express';
import { Ticket, getSequelizeClient } from '@db/index';
import { TicketAttributes } from '@custom-types/index';
import { utils } from '@jym272ticketing/common';
import { Subjects } from '@events/nats-jetstream';
import { publish } from '@events/publishers';
const { httpStatusCodes, throwError } = utils;
const { CREATED, INTERNAL_SERVER_ERROR } = httpStatusCodes;
const sequelize = getSequelizeClient();

export const createATicketController = () => {
  return async (req: Request, res: Response) => {
    const { title, price } = res.locals as TicketAttributes;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- because of requireAuth middleware
    const currentUser = req.currentUser!;
    const userId = currentUser.jti;

    try {
      const newTicket = await sequelize.transaction(async () => {
        return await Ticket.create({
          title,
          price: Number(price),
          userId: Number(userId)
        });
      });
      await publish(Subjects.TicketCreated, 'se ha crado un ticket');
      // tk created, publish event to nats
      // await new TicketCreatedPublisher(natsWrapper.client).publish({
      //   id: newTicket.id,
      //   title: newTicket.title,
      //   price: newTicket.price,
      //   userId: newTicket.userId,
      //   version: newTicket.version
      // });

      return res.status(CREATED).json({ message: 'Ticket created.', ticket: newTicket });
    } catch (err) {
      let error = new Error(
        `Creating Ticket failed. title ${title}. price ${price}. currentUser ${JSON.stringify(currentUser)}`
      );
      if (err instanceof Error) {
        error = err;
      }
      throwError('Creating Ticket failed.', INTERNAL_SERVER_ERROR, error);
    }
  };
};
