import { Request, Response } from 'express';
import { Ticket } from '@db/models';
import { throwError, httpStatusCodes } from '@jym272ticketing/common/dist/utils';
import { TicketAttributes } from '@custom-types/index';
import { publish } from '@events/publishers';
import { Subjects } from '@events/nats-jetstream';
const { NOT_FOUND, INTERNAL_SERVER_ERROR, UNAUTHORIZED } = httpStatusCodes;

export const updateATicketController = () => {
  return async (req: Request, res: Response) => {
    const { id } = req.params;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- because of requireAuth middleware
    const currentUser = req.currentUser!;
    const userId = currentUser.jti;

    let ticket;
    try {
      ticket = await Ticket.findByPk(id);
    } catch (err) {
      let error = new Error(`Finding ticket failed. id ${id}.`);
      if (err instanceof Error) {
        error = err;
      }
      return throwError('Finding ticket failed.', INTERNAL_SERVER_ERROR, error);
    }
    if (!ticket) {
      return throwError('Ticket not found.', NOT_FOUND);
    }
    if (ticket.userId !== Number(userId)) {
      return throwError(
        'Not authorized.',
        UNAUTHORIZED,
        new Error(
          `userId in cookie payload: ${userId} is not the same as the userId found in the ticket: ${ticket.userId}`
        )
      );
    }
    const { title, price } = res.locals as TicketAttributes;
    // refactor with transaction TODO
    ticket.set({ title, price: Number(price) });
    await ticket.save();
    await publish(Subjects.TicketUpdated, 'se ha realizao un update un ticket');
    res.json(ticket);
  };
};
