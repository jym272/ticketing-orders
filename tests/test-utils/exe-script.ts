import childProcess from 'child_process';
import { promisify } from 'util';
import { utils } from '@jym272ticketing/common';
import { Streams, Subjects } from '@events/nats-jetstream';

const { activateLogging, log } = utils;

const exec = promisify(childProcess.exec);
// TODO: the logging only make ses here, other noooo
export const runPsqlCommand = async (psqlCommand: string, logging = activateLogging()) => {
  try {
    // escape single quote for bash script
    const psqlCommandProc = psqlCommand.replace(/'/g, `'\\''`);
    const { stdout, stderr } = await exec('./scripts/run_psql ' + `'${psqlCommandProc}'`);
    if (stderr && logging) log(stderr);
    if (stdout && logging) log(stdout);
    return stdout;
  } catch (error) {
    log(`Error executing script: ${error as string}`);
    throw error;
  }
};
//TODO: refactor in one function runCommand
export const runNatsCommand = async (natsCmd: string, logging = activateLogging()) => {
  try {
    // escape single quote for bash script
    const cmd = natsCmd.replace(/'/g, `'\\''`);
    const { stdout, stderr } = await exec('./scripts/run_nats ' + `'${cmd}'`);
    if (stderr && logging) log(stderr);
    if (stdout && logging) log(stdout);
    return stdout;
  } catch (error) {
    log(`Error executing script: ${error as string}`);
    throw error;
  }
};

interface Response<T> {
  subject: Subjects;
  seq: number;
  data: T;
  time: string;
}

// interface OrderResponse {
//   subject: OrderSubjects;
//   seq: number;
//   data: {
//     [OrderSubjects.OrderCreated]: OrderCreatedData;
//     [OrderSubjects.OrderCancelled]: OrderCancelledData;
//   };
//   time: string;
// }
//
// interface OrderCreatedData {
//   expiresAt: string;
//   status: string;
//   id: number;
//   userId: number;
//   ticketId: number;
//   updatedAt: string;
//   createdAt: string;
// }
//
// interface OrderCancelledData {
//   // properties for order cancelled data
// }
/*
usage: nats stream get [<flags>] [<stream>] [<id>]
Retrieves a specific message from a Stream

Args:
  [<stream>]  Stream name
  [<id>]      Message Sequence to retrieve

Flags:
  -S, --last-for=SUBJECT  Retrieves the message for a specific subject
  -j, --json              Produce JSON output

 */
export const getSequenceDataFromNats = async <T>(stream: Streams, seq: number) => {
  const res = await runNatsCommand(`nats str get ${stream} ${seq} -j`);

  // RES {
  //   "subject": "orders.created",
  //     "seq": 2,
  //     "data": "eyJvcmRlci5jcmVhdGVkIjp7ImV4cGlyZXNBdCI6IjIwMjMtMDQtMDFUMDY6NTk6MDguMzI5WiIsInN0YXR1cyI6ImNyZWF0ZWQiLCJpZCI6MjIwLCJ1c2VySWQiOjMxOTI4NDE2OSwidGlja2V0SWQiOjIyMCwidXBkYXRlZEF0IjoiMjAyMy0wNC0wMVQwNjo0NDowOC4zMzBaIiwiY3JlYXRlZEF0IjoiMjAyMy0wNC0wMVQwNjo0NDowOC4zMzBaIn19",
  //     "time": "2023-04-01T06:44:08.333064065Z"
  // }

  const resJson = JSON.parse(res) as Response<string>;
  // expect resJson.subject to be 'orders.created'

  // {"order.created":{"expiresAt":"2023-04-01T07:00:42.627Z","status":"created","id":226,"userId":199772815,"ticketId":226,"updatedAt":"2023-04-01T06:45:42.627Z","createdAt":"2023-04-01T06:45:42.627Z"}}
  const decodedData = Buffer.from(resJson.data, 'base64').toString('utf8');

  const dataJson = JSON.parse(decodedData) as T;

  const returnObj: Response<T> = {
    ...resJson,
    data: dataJson
  };
  return returnObj;

  // console.log("DATAJASON",dataJson);
  // const order = dataJson[OrderSubjects.OrderCreated];
  // expect(order).toBeDefined();
  // 'order.created': {
  //   expiresAt: '2023-04-01T07:04:44.930Z',
  //     status: 'created',
  //     id: 228,
  //     userId: 1103276887,
  //     ticketId: 228,
  //     updatedAt: '2023-04-01T06:49:44.930Z',
  //     createdAt: '2023-04-01T06:49:44.930Z'
  // }
};

export const truncateTables = async (...table: [string, ...string[]]) => {
  const processedTables = table.map(t => `"${t}"`);
  await runPsqlCommand(`truncate table ${processedTables.join(', ')} cascade;`);
};

export const insertIntoTable = async (
  table: string,
  props: Record<string, string | number>,
  logging = activateLogging()
) => {
  const refactorKeys = (key: string) => {
    const arr = key.split(/(?=[A-Z])/);
    return arr.join('_').toLowerCase();
  };
  const keys = Object.keys(props).map(k => refactorKeys(k));
  const values = Object.values(props).map(v => (typeof v === 'string' ? `'${v}'` : v));
  const psqlCommand = `insert into "${table}" (${keys.join(', ')}) values (${values.join(', ')});`;
  await runPsqlCommand(psqlCommand, logging);
};

export const insertIntoTableWithReturnJson = async <T>(
  table: string,
  props: Record<string, string | number>,
  logging = activateLogging()
) => {
  const keys = Object.keys(props).map(k => `"${k}"`);
  const values = Object.values(props).map(v => (typeof v === 'string' ? `'${v}'` : v));
  const psqlCommand = `insert into "${table}" (${keys.join(', ')}) values (${values.join(
    ', '
  )}) returning row_to_json("${table}".*);`;
  const stdout = await runPsqlCommand(psqlCommand, logging);
  if (!stdout) throw new Error('No stdout returned');
  if (logging) {
    log('Raw stdout: ', JSON.stringify(stdout));
  }
  return JSON.parse(stdout) as T;
};

export const selectIdFromTable = async (table: string, logging = activateLogging()) => {
  const psqlCommand = `select json_agg(json_build_object('id', id)) from "${table}";`;
  const stdout = await runPsqlCommand(psqlCommand, logging);
  if (!stdout) throw new Error('No stdout returned');
  return JSON.parse(stdout) as { id: number }[];
};
