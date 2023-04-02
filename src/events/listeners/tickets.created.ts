import { JsMsg } from 'nats';
import { Ticket } from '@db/models';
import { sc, TicketSubjects } from '@events/nats-jetstream';
import { log } from '@jym272ticketing/common/dist/utils';
import { getSequelizeClient } from '@db/sequelize';

const sequelize = getSequelizeClient();

export const ticketCreatedListener = async (m: JsMsg) => {
  let ticket: Ticket;
  try {
    const data = JSON.parse(sc.decode(m.data)) as { [TicketSubjects.TicketCreated]: Ticket };
    ticket = data[TicketSubjects.TicketCreated];
  } catch (e) {
    log('Error parsing message data', e);
    return;
  }

  try {
    const newTicket = await sequelize.transaction(async () => {
      return await Ticket.create({
        id: ticket.id,
        title: ticket.title,
        price: ticket.price
      });
    });
    log('NEWTK', newTicket);
  } catch (err) {
    log('Error creating ticket', err);
    return;
  }
  // console.log(`[${m.seq}]: ${sc.decode(m.data)}`);
  // only ack if you want to remove the message from the stream
  // only ack knowing that you have processed the message, the ticket received is
  // save in DB
  // m.ack();
  m.ackAck()
    .then(() => {
      log('Message acknowledged by the server');
      // const pa = await publish(order, subjects.OrderCreated); TODO: publish to the interested
      // seq = pa.seq; // The sequence number of the message as stored in JetStream
    })
    .catch(err => {
      log('Error acknowledging message', err);
    });
};
