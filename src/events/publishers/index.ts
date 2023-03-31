import { js, sc, Subjects } from '@events/index';
import { log } from '@jym272ticketing/common/dist/utils';

export const publish = async (subj: Subjects, pseudoSentence: string) => {
  if (!js) {
    throw new Error('JetStream not initialized');
  }
  const pa = await js.publish(subj, sc.encode(pseudoSentence));
  const { stream, seq, duplicate } = pa;
  log(`[${stream}][${seq}][${duplicate.toString()}]: ${pseudoSentence}`);
};
