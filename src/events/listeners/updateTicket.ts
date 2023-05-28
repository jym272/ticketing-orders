import { JsMsg } from 'nats';
import { Ticket } from '@db/models';
import { log } from '@jym272ticketing/common/dist/utils';
import { getSequelizeClient } from '@db/sequelize';
import { nakTheMsg, sc, subjects, TicketSubjects } from '@jym272ticketing/common/dist/events';

const sequelize = getSequelizeClient();

const updateTicket = async (m: JsMsg, ticket: Ticket) => {
  m.working();

  try {
    await sequelize.transaction(async ticket_t => {
      const tk = await Ticket.findByPk(ticket.id, {
        transaction: ticket_t,
        lock: true
      });
      if (!tk) {
        log("Ticket does not exist, maybe isn't created yet", { ticket });
        return nakTheMsg(m);
      }

      if (tk.version >= ticket.version) {
        log('Ticket version is not greater than the one in the DB', {
          id: ticket.id,
          version: ticket.version,
          version_db: tk.version
        });
        m.term();
        return;
      }
      if (tk.version + 1 !== ticket.version) {
        log('Ticket version is not consecutive, maybe a version was not processed yet', {
          id: ticket.id,
          version: ticket.version,
          version_db: tk.version
        });
        return nakTheMsg(m);
      }
      await tk.set({ title: ticket.title, price: ticket.price, version: ticket.version }).save({
        transaction: ticket_t
      });
      m.ack();
    });
  } catch (err) {
    log('Error updating ticket', err);
    return nakTheMsg(m);
  }
};

export const updateTicketListener = async (m: JsMsg) => {
  if (m.subject !== subjects.TicketUpdated) {
    log('Wrong subject', m.subject);
    m.term();
    return;
  }
  let ticket: Ticket | undefined;
  try {
    const data = JSON.parse(sc.decode(m.data)) as Record<TicketSubjects, Ticket | undefined>;
    ticket = data[subjects.TicketUpdated];
    if (!ticket) throw new Error(`Ticket not found in message data with subject ${m.subject}`);
  } catch (e) {
    log('Error parsing message data', e);
    m.term();
    return;
  }
  await updateTicket(m, ticket);
};
