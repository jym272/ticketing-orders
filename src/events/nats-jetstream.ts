import {
  AckPolicy,
  connect,
  consumerOpts,
  createInbox,
  DeliverPolicy,
  JetStreamClient,
  JetStreamManager,
  NatsConnection,
  StringCodec
} from 'nats';
import { ConsumerOptsBuilder } from 'nats/lib/nats-base-client/types';
import { STREAM_NOT_FOUND } from '@utils/constants';
import { log } from '@jym272ticketing/common/dist/utils';
import { getEnvOrFail } from '@utils/env';

export let nc: NatsConnection | undefined;
export let js: JetStreamClient | undefined;

export enum OrderSubjects {
  OrderCreated = 'orders.created',
  OrderCancelled = 'orders.cancelled'
}
enum TicketSubjects { //TODO: one enum per service instead of one global enum, in that case arg for createConsumerProps
  TicketCreated = 'tickets.created',
  TicketUpdated = 'tickets.updated'
}
export const subjects = {
  ...OrderSubjects,
  ...TicketSubjects
};

// export type Subjects = typeof subjects[keyof typeof subjects];
export type Subjects = TicketSubjects | OrderSubjects;

const getDurableName = (subject: Subjects) => {
  const parts = subject.split('.');
  if (!parts.length) {
    throw new Error('Subject is empty');
  }
  const upperCaseParts = parts.map(part => part.toUpperCase());
  return upperCaseParts.join('_');
};

export let opts: ConsumerOptsBuilder; // for the subscription

// API Streams
export enum Streams {
  TICKETS = 'tickets',
  ORDERS = 'orders'
}

/* this defined ALL*/
export const stream = Streams.ORDERS; //TODO: stream and streamSubj must be generated, doing this can allowd check if the enum is correct!"
export const streamSubj = `${Streams.ORDERS}.*`;
const serviceSubj = OrderSubjects;
/**/

interface UniqueConsumerProps {
  durableName: string;
  queueGroupName: Subjects;
  filterSubject: Subjects;
}

const createConsumerProps = () =>
  Object.values(serviceSubj).map(subject => {
    return {
      durableName: getDurableName(subject),
      queueGroupName: subject,
      filterSubject: subject
    };
  });

const natsServerUrl = `nats://${getEnvOrFail('NATS_SERVER_HOST')}:${getEnvOrFail('NATS_SERVER_PORT')}`;

const getNatsConnection = async () => {
  if (nc) {
    return nc;
  }
  nc = await connect({ servers: natsServerUrl, maxReconnectAttempts: 5 });
  return nc;
};

const verifyStream = async (jsm: JetStreamManager) => {
  try {
    await jsm.streams.find(streamSubj);
  } catch (e) {
    if (e instanceof Error && e.message === STREAM_NOT_FOUND) {
      log(`Stream ${stream} not found, creating...`);
      await jsm.streams.add({ name: stream, subjects: [streamSubj] });
      log(`Stream ${stream} with subject ${streamSubj} CREATED`);
      return;
    }
    throw e;
  }
  log(`Stream '${stream}' with subject '${streamSubj}' FOUND`);
};

const findConsumer = async (jsm: JetStreamManager, durableName: string) => {
  const consumers = await jsm.consumers.list(stream).next();
  for (const ci of consumers) {
    const { config } = ci;
    if (config.durable_name === durableName) {
      return true;
    }
  }
  return false;
};

const verifyConsumer = async (jsm: JetStreamManager, uniqueConsumer: UniqueConsumerProps) => {
  const { durableName, queueGroupName, filterSubject } = uniqueConsumer;
  if (!(await findConsumer(jsm, durableName))) {
    log(`Consumer with name ${durableName} not found. Creating consumer...`);
    await jsm.consumers.add(stream, {
      durable_name: durableName,
      deliver_policy: DeliverPolicy.All,
      ack_policy: AckPolicy.Explicit,
      deliver_subject: createInbox(),
      deliver_group: queueGroupName,
      filter_subject: filterSubject
    });
    log(`Consumer with name ${durableName} CREATED`);
    return;
  }
  log(`Consumer with name ${durableName} FOUND`);
};

const getJetStreamClient = async () => {
  if (js) {
    return js;
  }
  const nc = await getNatsConnection();
  const jsm = await nc.jetstreamManager();
  await verifyStream(jsm);
  const durables = createConsumerProps();
  for (const durable of durables) {
    await verifyConsumer(jsm, durable);
  }
  // puede no ser necesario acá
  // bindConsumer(); -> only for subscription
  js = nc.jetstream();
  return js;
};

const createJetStreamClient = async () => {
  await getJetStreamClient();
};

export const sc = StringCodec();

const monitorNatsConnectionStatus = async () => {
  const nc = await getNatsConnection();
  for await (const status of nc.status()) {
    // logs with chalk TODO with color according to type
    log('nats status: ', { data: status.data, type: status.type });
  }
};

export const startJetStream = async () => {
  await createJetStreamClient();
  void monitorNatsConnectionStatus();
};

export const getAllMessages = async (durable: string) => {
  //     fetch(stream: string, durable: string, opts?: Partial<PullOptions>): QueuedIterator<JsMsg>;
  const js = await getJetStreamClient();
  const messages = js.fetch(stream, durable, { batch: 10, no_wait: true });
  return messages;
};
export const getAMessage = async (durable: string) => {
  const js = await getJetStreamClient();
  const msg = await js.pull(stream, durable);
  return msg;
};

const bindConsumer = () => {
  opts = consumerOpts();
  opts.queue('orders.created');
  opts.manualAck();
  opts.bind(stream, 'ORDERS_CREATED');
};

export const getASubscription = async () => {
  if (!js) {
    throw new Error('JetStream not initialized');
  }
  bindConsumer();
  const sub = await js.subscribe('orders.created', opts);
  return {
    sub,
    sc
  };
};
