import { initializeSetup, startSetup } from './setup';
import { utils } from '@jym272ticketing/common';
const { log, successConnectionMsg } = utils;
import { getEnvOrFail, rocketEmoji } from '@utils/index';
import { nc, startJetStream, subjects } from '@events/nats-jetstream';
import { subscribe } from '@events/subscribers';
import { ticketCreatedCB } from '@events/subscribers/tickets.created';

const { server } = initializeSetup();

const PORT = getEnvOrFail('PORT');

void (async () => {
  try {
    await startJetStream();
    await startSetup(server);
    server.listen(PORT, () => successConnectionMsg(`${rocketEmoji} Server is running on port ${PORT}`));
    void subscribe(subjects.OrderCreated, ticketCreatedCB);
    void subscribe(subjects.OrderCancelled, ticketCreatedCB);
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
