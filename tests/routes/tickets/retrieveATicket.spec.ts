import { test, expect } from '@playwright/test';
import {
  logFinished,
  logRunning,
  truncateTicketTable,
  generateRandomString,
  insertIntoTicketTable,
  selectIdFromTicketTable,
  parseMessage,
  generateValidTicket
} from '@tests/test-utils';
import { utils } from '@jym272ticketing/common';
import { Ticket } from '@custom-types/index';
const { httpStatusCodes } = utils;
const { OK, NOT_FOUND, INTERNAL_SERVER_ERROR } = httpStatusCodes;

// eslint-disable-next-line no-empty-pattern -- because we need to pass only the testInfo
test.beforeEach(({}, testInfo) => logRunning(testInfo));
// eslint-disable-next-line no-empty-pattern -- because we need to pass only the testInfo
test.afterEach(({}, testInfo) => logFinished(testInfo));

test.describe('routes: /api/tickets/:id GET ticket', () => {
  let ticket: Ticket;
  let createdTicketId: number;
  test.beforeAll(async () => {
    await truncateTicketTable();
    ticket = generateValidTicket();
    await insertIntoTicketTable(ticket);
    createdTicketId = (await selectIdFromTicketTable())[0].id;
    Object.assign(ticket, { id: createdTicketId });
  });
  test('Ticket Not found', async ({ request }) => {
    const response = await request.get(`/api/tickets/${createdTicketId + 1}`);
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Ticket not found.');
    expect(response.status()).toBe(NOT_FOUND);
  });
  test('invalid id in parameter request', async ({ request }) => {
    const invalidId = generateRandomString(5);
    const response = await request.get(`/api/tickets/${invalidId}`);
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Finding ticket failed.');
    expect(response.status()).toBe(INTERNAL_SERVER_ERROR);
  });
  test('get a ticket success', async ({ request }) => {
    const response = await request.get(`/api/tickets/${createdTicketId}`);
    const body = await response.body();
    expect(response.ok()).toBe(true);
    const bodyParsed = JSON.parse(body.toString()) as Ticket;
    expect(bodyParsed).toBeDefined();
    const { title, price, userId, id } = bodyParsed;
    expect(title).toBe(ticket.title);
    expect(price).toBe(ticket.price);
    expect(userId).toBe(ticket.userId);
    expect(id).toBe(ticket.id);
    expect(response.status()).toBe(OK);
  });
});
