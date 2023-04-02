import {
  AckPolicy,
  connect,
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
export enum TicketSubjects { //TODO: one enum per service instead of one global enum, in that case arg for createConsumerProps
  TicketCreated = 'tickets.created',
  TicketUpdated = 'tickets.updated'
}
export const subjects = {
  ...OrderSubjects,
  ...TicketSubjects
};
export type SubjectsValues = (typeof subjects)[keyof typeof subjects];
//streams are derivated from subjects values and validated there
export type SubjectsKeys = keyof typeof subjects;
export type Subjects = TicketSubjects | OrderSubjects;
// type SubjectsArr = OrderSubjects[] | TicketSubjects[];

export const getDurableName = (subject: SubjectsValues) => {
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
// export const stream = Streams.ORDERS; //TODO: stream and streamSubj must be generated, doing this can allowd check if the enum is correct!"
// export const streamSubj = `${Streams.ORDERS}.*`;
/**/

interface UniqueConsumerProps {
  durableName: string;
  queueGroupName: SubjectsValues;
  filterSubject: SubjectsValues;
}

// const enumToArr = <T extends string>(e: Record<T, string>): T[] => {
//   return Object.keys(e).map(k => k as T);
// };

const enumValuesToArr = <T extends string>(e: Record<T, string>): string[] => {
  return Object.values(e);
};

const createConsumerProps = (values: SubjectsValues[]) =>
  values.map(subjectValue => {
    return {
      durableName: getDurableName(subjectValue),
      queueGroupName: subjectValue,
      filterSubject: subjectValue
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

const verifyStream = async (jsm: JetStreamManager, stream: Streams) => {
  const streamSubj = `${stream}.*`;
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

const findConsumer = async (jsm: JetStreamManager, durableName: string, stream: Streams) => {
  const consumers = await jsm.consumers.list(stream).next();
  for (const ci of consumers) {
    const { config } = ci;
    if (config.durable_name === durableName) {
      return true;
    }
  }
  return false;
};

export const extractStreamName = (subject: SubjectsValues) => {
  const parts = subject.split('.');
  if (!parts.length) {
    throw new Error('Subject is empty');
  }
  const stream = parts[0];
  // check if streamName is a valid stream, part of the enum, otherwise throw error
  if (!enumValuesToArr(Streams).includes(stream)) {
    throw new Error(`Stream name ${stream} is not valid`);
  }
  return stream as Streams;
};

// find or create
const verifyConsumer = async (jsm: JetStreamManager, uniqueConsumer: UniqueConsumerProps) => {
  const { durableName, queueGroupName, filterSubject } = uniqueConsumer;

  const stream = extractStreamName(filterSubject);
  await verifyStream(jsm, stream); //find or create

  if (!(await findConsumer(jsm, durableName, stream))) {
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

//UNIQUE VALUE, maybe get the type later
const apiSubjects = [Object.values(OrderSubjects), Object.values(TicketSubjects)];
const verifyConsumers = async (jsm: JetStreamManager) => {
  for (const subjectsValues of apiSubjects) {
    const durables = createConsumerProps(subjectsValues);
    for (const durable of durables) {
      await verifyConsumer(jsm, durable);
    }
  }
};
const getJetStreamClient = async () => {
  if (js) {
    return js;
  }
  const nc = await getNatsConnection();
  const jsm = await nc.jetstreamManager();
  await verifyConsumers(jsm); // bettter name is
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
  await createJetStreamClient(); //consumers and strems created
  void monitorNatsConnectionStatus();
};

// const bindConsumer = () => {
//   opts = consumerOpts();
//   opts.queue('orders.created');
//   opts.manualAck();
//   opts.bind(stream, 'ORDERS_CREATED');
// };
