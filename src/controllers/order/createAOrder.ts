import { Request, Response } from 'express';
import { getSequelizeClient, Order, Ticket } from '@db/index';
import { utils } from '@jym272ticketing/common';
import { subjects } from '@events/nats-jetstream';
import { publish } from '@events/publishers';
const { httpStatusCodes, throwError, parseSequelizeError } = utils;
const { CREATED, BAD_REQUEST, INTERNAL_SERVER_ERROR } = httpStatusCodes;
const sequelize = getSequelizeClient();

const EXPIRATION_ORDER_MINUTES = 15;

export const createAOrderController = () => {
  return async (req: Request, res: Response) => {
    const { ticketId } = req.body as { ticketId: string | number };
    if (Number.isNaN(Number(ticketId)) || Number(ticketId) <= 0) {
      throwError('Invalid ticketId.', BAD_REQUEST, new Error(`TicketId is required: ${ticketId}`));
    }

    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return throwError('Ticket not found.', BAD_REQUEST, new Error(`Ticket not found: ${ticketId}`));
    }

    const isReserved = await ticket.isReserved();
    const reservedOrders = await ticket.getReservedOrders();

    if (isReserved || reservedOrders.length > 0) {
      return throwError(
        'Ticket is already reserved.',
        BAD_REQUEST,
        new Error(`Ticket is already reserved: ${ticketId}, reservedOrders: ${JSON.stringify(reservedOrders)}`)
      );
    }
    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPIRATION_ORDER_MINUTES * 60);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- because of requireAuth middleware
    const currentUser = req.currentUser!;
    const userId = currentUser.jti;

    let seq;
    try {
      const newOrder = await sequelize.transaction(async () => {
        const order = await Order.create({
          userId: Number(userId),
          expiresAt: expiration,
          ticketId: ticket.id
        });
        const pa = await publish(order, subjects.OrderCreated);
        seq = pa.seq; // The sequence number of the message as stored in JetStream
        return order;
      });
      return res.status(CREATED).json({ message: 'Order created.', order: newOrder, seq });
    } catch (err) {
      const error = parseSequelizeError(
        err,
        `Creating an Order failed. ticketId ${ticketId}. currentUser ${JSON.stringify(currentUser)}`
      );
      throwError('Creating Order failed.', INTERNAL_SERVER_ERROR, error);
    }
  };
};

// export const ticketCreatedCB = async (m: JsMsg) => {
//   let ticket: Ticket;
//   try {
//     const data = JSON.parse(sc.decode(m.data)) as { [TicketSubjects.TicketCreated]: Ticket };
//     ticket = data[TicketSubjects.TicketCreated];
//   } catch (e) {
//     log('Error parsing message data', e);
//     return;
//   }
//
//   try {
//     // const newTicket = await sequelize.transaction(async () => {
//     const newTicket = Ticket.build({
//       id: ticket.id,
//       title: ticket.title,
//       price: ticket.price
//     });
//     console.log('NEWTK', newTicket);
//   } catch (err) {
//     log('Error creating ticket', err);
//     return;
//   }
//   // console.log(`[${m.seq}]: ${sc.decode(m.data)}`);
//   // only ack if you want to remove the message from the stream
//   // only ack knowing that you have processed the message, the ticket received is
//   // save in DB
//   // m.ack();
//   m.ackAck()
//     .then(() => {
//       console.log('Message acknowledged by the server');
//       // const pa = await publish(order, subjects.OrderCreated); TODO: publish to the interested
//       // seq = pa.seq; // The sequence number of the message as stored in JetStream
//     })
//     .catch(err => {
//       console.log('Error acknowledging message', err);
//     });
// };
//
// const getOptsBuilderConfigured = (subj: Subjects): ConsumerOptsBuilder => {
//   const opts = consumerOpts();
//   opts.queue(subj);
//   opts.manualAck();
//   opts.bind(extractStreamName(subj), getDurableName(subj));
//   return opts;
// };
//
// export const subscribe = async (subj: Subjects, cb: (m: JsMsg) => Promise<void>) => {
//   if (!js) {
//     throw new Error('Jetstream is not defined');
//   }
//   let sub: JetStreamSubscription;
//   try {
//     sub = await js.subscribe(subj, getOptsBuilderConfigured(subj));
//   } catch (e) {
//     log(`Error subscribing to ${subj}`, e);
//     throw e;
//   }
//   for await (const m of sub) {
//     console.log(`[${m.seq}]: [${sub.getProcessed()}]: ${sc.decode(m.data)}`);
//     // igual no puedo esperar nada
//     void cb(m);
//   }
//   log(`[${subj}] subscription closed`);
// };
