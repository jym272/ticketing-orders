import { consumerOpts, JetStreamSubscription, JsMsg } from 'nats';
import { getDurableName, js, extractStreamName, Subjects, sc } from '@events/nats-jetstream';
import { ConsumerOptsBuilder } from 'nats/lib/nats-base-client/types';
import { log } from '@jym272ticketing/common/dist/utils';

const getOptsBuilderConfigured = (subj: Subjects): ConsumerOptsBuilder => {
  const opts = consumerOpts();
  opts.queue(subj);
  opts.manualAck();
  opts.bind(extractStreamName(subj), getDurableName(subj));
  return opts;
};

export const subscribe = async (subj: Subjects, cb: (m: JsMsg) => Promise<void>) => {
  if (!js) {
    throw new Error('Jetstream is not defined');
  }
  let sub: JetStreamSubscription;
  try {
    sub = await js.subscribe(subj, getOptsBuilderConfigured(subj));
  } catch (e) {
    log(`Error subscribing to ${subj}`, e);
    throw e;
  }
  log(`[${subj}] subscription opened`);
  for await (const m of sub) {
    log(`[${m.seq}]: [${sub.getProcessed()}]: ${sc.decode(m.data)}`);
    // igual no puedo esperar nada
    void cb(m);
  }
  log(`[${subj}] subscription closed`);
};
