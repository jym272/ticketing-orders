import { initializeSetup, startSetup } from './setup';
import { utils } from '@jym272ticketing/common';
const { log, successConnectionMsg } = utils;
import { getEnvOrFail, rocketEmoji } from '@utils/index';
import { ticketListener } from '@events/index';
import { nc, startJetStream, Streams, subjects, subscribe } from '@jym272ticketing/common/dist/events';

const { server } = initializeSetup();

const PORT = getEnvOrFail('PORT');

void (async () => {
  try {
    //all the streams related to this api in subscrip and publish
    await startJetStream({
      streams: [Streams.ORDERS, Streams.TICKETS],
      nats: {
        url: `nats://${getEnvOrFail('NATS_SERVER_HOST')}:${getEnvOrFail('NATS_SERVER_PORT')}`,
        maxReconnectAttempts: 5
      }
    });
    await startSetup(server);
    server.listen(PORT, () => successConnectionMsg(`${rocketEmoji} Server is running on port ${PORT}`));
    //TODO: test wit nats the subscriber, simplemente pushear con nats a los subscribers
    // luego rebbiciar que en efecto el msg sez fue procesado -> ack
    // logs red and green and yellow with chalk
    void subscribe(subjects.TicketCreated, ticketListener);
    void subscribe(subjects.TicketUpdated, ticketListener);
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
