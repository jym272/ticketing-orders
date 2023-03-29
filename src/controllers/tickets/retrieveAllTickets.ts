import { Request, Response } from 'express';
import { Ticket } from '@db/models';
import { publish } from '@events/publishers';
import { Subjects } from '@events/nats-jetstream';
import { httpStatusCodes, log } from '@jym272ticketing/common/dist/utils';
const { OK } = httpStatusCodes;

export const retrieveAllTicketsController = () => {
  return async (req: Request, res: Response) => {
    try {
      await publish(Subjects.TicketUpdated, 'se ha realizao un update un ticket');
    } catch (err) {
      //TODO: handle error
      log('ARR', err);
    }

    const tickets = await Ticket.findAll();
    res.status(OK).json(tickets);
  };
};
