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

//exporting for the test probe
export let nc: NatsConnection | undefined;
export let js: JetStreamClient | undefined;
// refacotorizacion igual a la de http codes
export enum Subjects { //TODO: one enum per service instead of one global enum, in that case arg for getProps
  TicketCreated = 'tickets.created',
  TicketUpdated = 'tickets.updated'
}
const getDurableName = (subject: Subjects) => {
  const parts = subject.split('.');
  if (!parts.length) {
    throw new Error('Subject is empty');
  }
  const upperCaseParts = parts.map(part => part.toUpperCase());
  return upperCaseParts.join('_');
};

export type SubjectsType = Subjects;
export let opts: ConsumerOptsBuilder; // for the subscription
export const stream = 'tickets';
export const subj = `tickets.*`;
interface UniqueConsumerProps {
  durableName: string;
  queueGroupName: SubjectsType;
  filterSubject: SubjectsType;
}

const getProps = () =>
  Object.values(Subjects).map(subject => {
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
    await jsm.streams.find(subj);
  } catch (e) {
    if (e instanceof Error && e.message === STREAM_NOT_FOUND) {
      log(`Stream ${stream} not found, creating...`);
      await jsm.streams.add({ name: stream, subjects: [subj] });
      log(`Stream ${stream} with subject ${subj} CREATED`);
      return;
    }
    throw e;
  }
  log(`Stream '${stream}' with subject '${subj}' FOUND`);
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

// const bindConsumer = () => {
//   // los puedo bindear en el acto, no necesariamte acá
//   // opts = consumerOpts();
//   // opts.queue(queueGroupName);
//   // opts.manualAck();
//   // opts.bind(stream, durableName);
// };

const getJetStreamClient = async () => {
  if (js) {
    return js;
  }
  const nc = await getNatsConnection();
  const jsm = await nc.jetstreamManager();
  await verifyStream(jsm);
  const durables = getProps();
  for (const durable of durables) {
    await verifyConsumer(jsm, durable);
  }
  // puede no ser necesario acá
  // bindConsumer();
  js = nc.jetstream();
  return js;
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
  await getJetStreamClient();
  void monitorNatsConnectionStatus();
};
