import { Request, Response } from 'express';
import { Ticket } from '@db/models';
import { utils } from '@jym272ticketing/common';
const { throwError, httpStatusCodes } = utils;
const { NOT_FOUND, INTERNAL_SERVER_ERROR } = httpStatusCodes;

export const retrieveATicketController = () => {
  return async (req: Request, res: Response) => {
    const { id } = req.params;
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
    res.json(ticket);
  };
};
