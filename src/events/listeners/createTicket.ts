import { JsMsg } from 'nats';
import { Ticket } from '@db/models';
import { log } from '@jym272ticketing/common/dist/utils';
import { getSequelizeClient } from '@db/sequelize';
import { nakTheMsg, sc, subjects, TicketSubjects } from '@jym272ticketing/common/dist/events';

const sequelize = getSequelizeClient();

const createTicket = async (m: JsMsg, ticket: Ticket) => {
  m.working();
  if (ticket.version !== 0) {
    log('Ticket version is not 0');
    m.term();
    return;
  }

  try {
    await sequelize.transaction(async ticket_t => {
      const tk = await Ticket.findByPk(ticket.id, {
        attributes: ['id'],
        lock: true,
        transaction: ticket_t
      });
      if (tk) {
        log('Ticket already exists, did you mean to update it?');
        m.term();
        return;
      }
      await Ticket.create(
        {
          id: ticket.id,
          title: ticket.title,
          price: ticket.price,
          version: ticket.version
        },
        {
          transaction: ticket_t,
          lock: true
        }
      );
      m.ack();
    });
  } catch (e) {
    log('Error creating ticket', e);
    return nakTheMsg(m);
  }
};

export const createTicketListener = async (m: JsMsg) => {
  if (m.subject !== subjects.TicketCreated) {
    log('Wrong subject', m.subject);
    m.term();
    return;
  }
  let ticket: Ticket | undefined;
  try {
    const data = JSON.parse(sc.decode(m.data)) as Record<TicketSubjects, Ticket | undefined>;
    ticket = data[subjects.TicketCreated];
    if (!ticket) throw new Error(`Ticket not found in message data with subject ${m.subject}`);
  } catch (e) {
    log('Error parsing message data', e);
    m.term();
    return;
  }
  await createTicket(m, ticket);
};
