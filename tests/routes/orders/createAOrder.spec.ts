import { test, expect } from '@playwright/test';
import {
  logFinished,
  logRunning,
  parseMessage,
  generateRandomString,
  createACookieSession,
  generateA32BitUnsignedInteger,
  truncateTables,
  insertIntoTableWithReturnJson,
  generateTicketAttributes,
  createUniqueUser
} from '@tests/test-utils';
import { utils } from '@jym272ticketing/common';
const { httpStatusCodes } = utils;
import { TICKET_ATTRIBUTES } from '@utils/index';
import { Ticket } from '@db/models';
const { BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR, UNAUTHORIZED } = httpStatusCodes;
const { MAX_VALID_TITLE_LENGTH } = TICKET_ATTRIBUTES;

// eslint-disable-next-line no-empty-pattern -- because we need to pass only the testInfo
test.beforeEach(({}, testInfo) => logRunning(testInfo));
// eslint-disable-next-line no-empty-pattern -- because we need to pass only the testInfo
test.afterEach(({}, testInfo) => logFinished(testInfo));

const user1 = createUniqueUser();

test.describe('routes: /api/orders POST requireAuth controller', () => {
  test("current user doesn't exists, not authorized by requireAuth common controller", async ({ request }) => {
    const response = await request.post('/api/orders', {
      data: {
        ticketId: generateA32BitUnsignedInteger()
      }
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Not authorized.');
    expect(response.status()).toBe(UNAUTHORIZED);
  });
});

test.describe('routes: /api/orders POST checking body { ticketId: string|number }', () => {
  test('invalid ticketId because is not a number', async ({ request }) => {
    const response = await request.post('/api/orders', {
      data: {
        ticketId: generateRandomString(MAX_VALID_TITLE_LENGTH)
      },
      headers: { cookie: user1.cookie }
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Invalid ticketId.');
    expect(response.status()).toBe(BAD_REQUEST);
  });
  test('invalid ticketId because is a negative number', async ({ request }) => {
    const response = await request.post('/api/orders', {
      data: {
        ticketId: generateA32BitUnsignedInteger() * -1
      },
      headers: { cookie: user1.cookie }
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Invalid ticketId.');
    expect(response.status()).toBe(BAD_REQUEST);
  });
});

test.describe('routes: /api/orders POST createAOrderController failed, there is no ticketId', () => {
  test.beforeAll(async () => {
    await truncateTables('ticket', 'order');
  });
  test('there is no values in "ticket" table', async ({ request }) => {
    const response = await request.post('/api/orders', {
      data: { ticketId: generateA32BitUnsignedInteger() },
      headers: { cookie: user1.cookie }
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Ticket not found.');
    expect(response.status()).toBe(BAD_REQUEST);
  });
});

test.describe('routes: /api/orders POST createAOrderController ticket exists, an order exists for that ticket', () => {
  let ticket: Ticket;
  test.beforeAll(async () => {
    await truncateTables('ticket', 'order');
    ticket = await insertIntoTableWithReturnJson('ticket', generateTicketAttributes());
    await insertIntoTableWithReturnJson('order', {
      userId: user1.userId,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      ticketId: ticket.id
    });
  });
  test('fail because there is already an order with status "created" for that ticketId', async ({ request }) => {
    const response = await request.post('/api/orders', {
      data: { ticketId: ticket.id },
      headers: { cookie: user1.cookie }
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Ticket is already reserved.');
    expect(response.status()).toBe(BAD_REQUEST);
  });
});

test.describe('routes: /api/orders POST createAOrderController', () => {
  let ticket: Ticket;
  test.beforeAll(async () => {
    await truncateTables('ticket', 'order');
    ticket = await insertIntoTableWithReturnJson('ticket', generateTicketAttributes());
  });

  test('failed because of userId invalid in cookie', async ({ request }) => {
    const cookieWithInvalidUserId = createACookieSession({
      userEmail: 'a@a.com',
      userId: Math.pow(2, 31) //out of range for type integer
    });
    const response = await request.post('/api/orders', {
      data: { ticketId: ticket.id },
      headers: { cookie: cookieWithInvalidUserId }
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Creating Order failed.');
    expect(response.status()).toBe(INTERNAL_SERVER_ERROR);
  });
  test('success creating the order', async ({ request }) => {
    const response = await request.post('/api/orders', {
      data: { ticketId: ticket.id },
      headers: { cookie: user1.cookie }
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(true);
    expect(message).toBe('Order created.');
    expect(response.status()).toBe(CREATED);
  });
});
