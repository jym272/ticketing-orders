import { initializeSetup, startSetup } from './setup';
import { utils } from '@jym272ticketing/common';
const { log, successConnectionMsg } = utils;
import { getEnvOrFail, rocketEmoji } from '@utils/index';
import { subscribe, nc, startJetStream, subjects, ticketListener } from '@events/index';

const { server } = initializeSetup();

const PORT = getEnvOrFail('PORT');

void (async () => {
  try {
    await startJetStream();
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
