import { test, expect } from '@playwright/test';
import {
  logFinished,
  logRunning,
  parseMessage,
  truncateTicketTable,
  generateRandomString,
  createACookieSession,
  generateA32BitUnsignedInteger,
  generateValidTicketAttributes,
  createAValidPrice,
  createAnInvalidPrice
} from '@tests/test-utils';
import { utils } from '@jym272ticketing/common';
const { httpStatusCodes } = utils;
import { TICKET_ATTRIBUTES } from '@utils/index';
import { TicketAttributes } from '@custom-types/index';
const { BAD_REQUEST, CREATED, INTERNAL_SERVER_ERROR, UNAUTHORIZED } = httpStatusCodes;
const { MAX_VALID_TITLE_LENGTH } = TICKET_ATTRIBUTES;

// eslint-disable-next-line no-empty-pattern -- because we need to pass only the testInfo
test.beforeEach(({}, testInfo) => logRunning(testInfo));
// eslint-disable-next-line no-empty-pattern -- because we need to pass only the testInfo
test.afterEach(({}, testInfo) => logFinished(testInfo));

let validTicketAttribute: TicketAttributes;
let cookie: string;

test.beforeAll(() => {
  validTicketAttribute = generateValidTicketAttributes();
  cookie = createACookieSession({
    userEmail: 'a@a.com',
    userId: generateA32BitUnsignedInteger()
  });
});

test.describe('routes: /api/tickets POST requireAuth controller', () => {
  test("current user doesn't exists, not authorized by requireAuth common controller", async ({ request }) => {
    const response = await request.post('/api/tickets', { data: validTicketAttribute });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Not authorized.');
    expect(response.status()).toBe(UNAUTHORIZED);
  });
});

test.describe('routes: /api/tickets POST checking attributes', () => {
  test('invalid price of a ticket', async ({ request }) => {
    const response = await request.post('/api/tickets', {
      data: {
        title: generateRandomString(MAX_VALID_TITLE_LENGTH),
        price: Number(createAnInvalidPrice())
      },
      headers: { cookie }
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Invalid price.');
    expect(response.status()).toBe(BAD_REQUEST);
  });
  test('invalid title of a ticket', async ({ request }) => {
    const response = await request.post('/api/tickets', {
      data: {
        title: generateRandomString(MAX_VALID_TITLE_LENGTH + 1, true),
        price: Number(createAValidPrice())
      },
      headers: { cookie }
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Invalid title.');
    expect(response.status()).toBe(BAD_REQUEST);
  });
});

test.describe('routes: /api/tickets POST createATicketController failed', () => {
  test.beforeAll(async () => {
    await truncateTicketTable();
  });
  test('invalid userId in cookie', async ({ request }) => {
    const cookieWithInvalidUserId = createACookieSession({
      userEmail: 'a@a.com',
      userId: Math.pow(2, 31)
    });
    const response = await request.post('/api/tickets', {
      data: validTicketAttribute,
      headers: { cookie: cookieWithInvalidUserId }
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Creating Ticket failed.');
    expect(response.status()).toBe(INTERNAL_SERVER_ERROR);
  });
});

test.describe('routes: /api/tickets POST createATicketController success', () => {
  test.beforeAll(async () => {
    await truncateTicketTable();
  });
  test('ticket creation is successful', async ({ request }) => {
    const response = await request.post('/api/tickets', {
      data: validTicketAttribute,
      headers: { cookie }
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(true);
    expect(message).toBe('Ticket created.');
    expect(response.status()).toBe(CREATED);
  });
});
