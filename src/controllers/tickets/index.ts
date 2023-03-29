import { retrieveAllTicketsController } from '@controllers/tickets/retrieveAllTickets';
import { retrieveATicketController } from '@controllers/tickets/retrieveATicket';
import { createATicketController } from '@controllers/tickets/createATicket';
import { updateATicketController } from '@controllers/tickets/updateATicket';
import { checkAttributesController } from '@controllers/tickets/checkAttributes';

export const ticketsController = {
  retrieveAllTickets: retrieveAllTicketsController(),
  retrieveATicket: retrieveATicketController(),
  createATicket: createATicketController(),
  updateATicket: updateATicketController(),
  checkAttributes: checkAttributesController()
};
