import childProcess from 'child_process';
import { promisify } from 'util';
import { utils } from '@jym272ticketing/common';
import { Ticket } from '@custom-types/index';

const { activateLogging, log } = utils;

const exec = promisify(childProcess.exec);

export const runPsqlCommand = async (psqlCommand: string, logging = activateLogging()) => {
  try {
    const { stdout, stderr } = await exec(`./scripts/run_psql "${psqlCommand}"`);
    if (stderr && logging) log(stderr);
    if (stdout && logging) log(stdout);
    return stdout;
  } catch (error) {
    log(`Error executing script: ${error as string}`);
    throw error;
  }
};

export const truncateTicketTable = async (logging = activateLogging()) => {
  await runPsqlCommand('truncate table "ticket" cascade;', logging);
};

export const insertIntoTicketTable = async ({ title, price, userId }: Ticket, logging = activateLogging()) => {
  const psqlCommand = `insert into "ticket" (title, price, user_id) values ('${title}', ${price}, ${userId});`;
  await runPsqlCommand(psqlCommand, logging);
};

export const selectIdFromTicketTable = async (logging = activateLogging()) => {
  const psqlCommand = `select json_agg(json_build_object('id', id)) from "ticket";`;
  const stdout = await runPsqlCommand(psqlCommand, logging);
  if (!stdout) throw new Error('No stdout');
  return JSON.parse(stdout) as { id: number }[];
};
