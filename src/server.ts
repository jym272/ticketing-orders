import { initializeSetup, startSetup } from './setup';
import { utils } from '@jym272ticketing/common';
const { log, successConnectionMsg } = utils;
import { getEnvOrFail, rocketEmoji } from '@utils/index';
import {
  createTicketListener,
  paymentCreatedListener,
  updateTicketListener,
  expirationCompleteListener
} from '@events/index';
import { nc, startJetStream, Streams, subjects, subscribe } from '@jym272ticketing/common/dist/events';

const { server } = initializeSetup();

const PORT = getEnvOrFail('PORT');

void (async () => {
  const queueGroupName = 'orders-service';
  try {
    await startJetStream({
      queueGroupName,
      // ->All streams in the list are created with subj: stream.*
      // ->To publish to orders.* it must exist the stream orders -> the consumer for this stream are not necceary
      // this api doesnt subscribe to itlsef ??? but those conmusers are created nonetheless
      // ->To subscribe to the subjects tickets.create ........ The consumers are created with a binding durable name
      streams: [Streams.ORDERS, Streams.TICKETS, Streams.EXPIRATION, Streams.PAYMENTS],
      nats: {
        url: `nats://${getEnvOrFail('NATS_SERVER_HOST')}:${getEnvOrFail('NATS_SERVER_PORT')}`
      }
    });
    await startSetup(server);
    server.listen(PORT, () => successConnectionMsg(`${rocketEmoji} Server is running on port ${PORT}`));
    // TODO: logs red and green and yellow with chalk
    void subscribe(subjects.TicketCreated, queueGroupName, createTicketListener);
    void subscribe(subjects.TicketUpdated, queueGroupName, updateTicketListener);
    void subscribe(subjects.ExpirationComplete, queueGroupName, expirationCompleteListener);
    void subscribe(subjects.PaymentCreated, queueGroupName, paymentCreatedListener);
  } catch (error) {
    log(error);
    process.exitCode = 1;
  }
})();

const listener = async () => {
  if (nc) {
    await nc.drain();
    log('NATS connection drained');
  }
  process.exit();
};

process.on('SIGINT', listener);
process.on('SIGTERM', listener);
