import { TestInfo } from '@playwright/test';
import chalk from 'chalk';
import { utils } from '@jym272ticketing/common';
const { log } = utils;

const capitalizeString = (string: string) => string.charAt(0).toUpperCase() + string.slice(1);

const logStatus = (testInfo: TestInfo) => {
  const status = testInfo.status;
  const boldText = chalk.bold.black;
  switch (status) {
    case 'passed':
      return boldText.bgGreenBright(capitalizeString(status));
    case 'failed':
      return boldText.bgRedBright(capitalizeString(status));
    case 'skipped':
      return boldText.bgYellowBright(capitalizeString(status));
    default:
      return boldText.bgWhiteBright(status);
  }
};

export const logRunning = (testInfo: TestInfo) =>
  log(`\t${chalk.italic('Running')} ${chalk.greenBright(testInfo.title)}`);

export const logFinished = (testInfo: TestInfo) =>
  log(`\t${chalk.italic('Finished')} ${chalk.greenBright(testInfo.title)} with status ${logStatus(testInfo)}`);
