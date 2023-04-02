import { JsMsg } from 'nats';
import { Ticket } from '@db/models';
import { sc, subjects, TicketSubjects } from '@events/nats-jetstream';
import { log } from '@jym272ticketing/common/dist/utils';
import { getSequelizeClient } from '@db/sequelize';

const sequelize = getSequelizeClient();

const upsertTicket = async (m: JsMsg, ticket: Ticket) => {
  try {
    m.working();
    const upsertTk = await sequelize.transaction(async () => {
      return await Ticket.upsert({
        id: ticket.id,
        title: ticket.title,
        price: ticket.price
      });
    });
    log('NEWTK', upsertTk[0]);
    //https://sequelize.org/docs/v6/other-topics/upgrade/
    log('CREATED OR UPDATED:', upsertTk[1]);
  } catch (err) {
    log('Error creating ticket', err);
    m.nak(2000);
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

export const ticketListener = async (m: JsMsg) => {
  if (m.subject !== subjects.TicketCreated && m.subject !== subjects.TicketUpdated) {
    log('Wrong subject', m.subject); // TODO: this must be for every listeners
    m.term();
    return;
  }
  let ticket: Ticket | undefined;
  const subject = m.subject as TicketSubjects;
  try {
    const data = JSON.parse(sc.decode(m.data)) as Record<TicketSubjects, Ticket | undefined>;
    ticket = data[subject];
    if (!ticket) throw new Error(`Ticket not found in message data with subject ${subject}`);
  } catch (e) {
    log('Error parsing message data', e);
    m.term();
    return;
  }
  await upsertTicket(m, ticket);
};
