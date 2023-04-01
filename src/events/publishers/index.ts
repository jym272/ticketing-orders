import { js, sc, Subjects } from '@events/index';
import { log } from '@jym272ticketing/common/dist/utils';

export const publish = async <T>(msg: T, subj: Subjects) => {
  const msgString = JSON.stringify({ [subj]: msg });
  if (!js) {
    throw new Error('JetStream not initialized');
  }
  const pa = await js.publish(subj, sc.encode(msgString));
  const { stream, seq, duplicate } = pa;
  log(`[${stream}][${seq}][${duplicate.toString()}]: ${msgString}`);
  return pa;
};
