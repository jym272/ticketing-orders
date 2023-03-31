import childProcess from 'child_process';
import { promisify } from 'util';
import { utils } from '@jym272ticketing/common';

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
