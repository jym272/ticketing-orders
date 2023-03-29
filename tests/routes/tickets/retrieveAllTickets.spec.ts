import { test, expect } from '@playwright/test';
import {
  logFinished,
  logRunning,
  truncateTicketTable,
  insertIntoTicketTable,
  generateValidTicket
} from '@tests/test-utils';
import { Ticket } from '@custom-types/index';
import { utils } from '@jym272ticketing/common';
const { httpStatusCodes } = utils;
const { OK } = httpStatusCodes;

// eslint-disable-next-line no-empty-pattern -- because we need to pass only the testInfo
test.beforeEach(({}, testInfo) => logRunning(testInfo));
// eslint-disable-next-line no-empty-pattern -- because we need to pass only the testInfo
test.afterEach(({}, testInfo) => logFinished(testInfo));

test.describe('routes: /api/tickets GET tickets', () => {
  let ticket: Ticket;
  test.beforeAll(async () => {
    ticket = generateValidTicket();
    await truncateTicketTable();
    await insertIntoTicketTable(ticket);
  });
  test('retrieve all tickets success', async ({ request }) => {
    const response = await request.get('/api/tickets');
    const body = await response.body();
    expect(response.ok()).toBe(true);
    const bodyParsed = JSON.parse(body.toString()) as Ticket[];
    expect(bodyParsed.length).toBe(1);
    const retrieveTicket = bodyParsed[0];
    expect(retrieveTicket.title).toBe(ticket.title);
    expect(retrieveTicket.price).toBe(ticket.price);
    expect(retrieveTicket.userId).toBe(ticket.userId);
    expect(response.status()).toBe(OK);
    expect(retrieveTicket.id).toBeDefined();
    expect(typeof retrieveTicket.id).toBe('number');
  });
});

test.describe('routes: /api/tickets GET empty list', () => {
  test.beforeAll(async () => {
    await truncateTicketTable();
  });
  test('retrieve empty tickets success', async ({ request }) => {
    const response = await request.get('/api/tickets');
    const body = await response.body();
    expect(response.ok()).toBe(true);
    const bodyParsed = JSON.parse(body.toString()) as Ticket[];
    expect(bodyParsed.length).toBe(0);
    expect(response.status()).toBe(OK);
  });
});
