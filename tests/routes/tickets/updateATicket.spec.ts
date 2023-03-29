import { test, expect } from '@playwright/test';
import {
  logFinished,
  logRunning,
  truncateTicketTable,
  generateRandomString,
  insertIntoTicketTable,
  selectIdFromTicketTable,
  parseMessage,
  createACookieSession,
  generateA32BitUnsignedInteger,
  generateValidTicketAttributes,
  generateValidTicket,
  createAnInvalidPrice,
  createAValidPrice
} from '@tests/test-utils';
import { utils } from '@jym272ticketing/common';
const { httpStatusCodes } = utils;
import { Ticket } from '@custom-types/index';
import { TICKET_ATTRIBUTES } from '@utils/constants';
const { OK, NOT_FOUND, INTERNAL_SERVER_ERROR, UNAUTHORIZED, BAD_REQUEST } = httpStatusCodes;
const { MAX_VALID_TITLE_LENGTH } = TICKET_ATTRIBUTES;

// eslint-disable-next-line no-empty-pattern -- because we need to pass only the testInfo
test.beforeEach(({}, testInfo) => logRunning(testInfo));
// eslint-disable-next-line no-empty-pattern -- because we need to pass only the testInfo
test.afterEach(({}, testInfo) => logFinished(testInfo));

let cookie: string;
let userId: number;
let ticket: Ticket;
let createdTicketId: number;
test.describe('routes: /api/tickets/:id PUT update ticket', () => {
  test.beforeAll(async () => {
    await truncateTicketTable();
    userId = generateA32BitUnsignedInteger();
    cookie = createACookieSession({
      userEmail: 'a@a.com',
      userId
    });
    ticket = generateValidTicket(userId);
    await insertIntoTicketTable(ticket);
    createdTicketId = (await selectIdFromTicketTable())[0].id;
    Object.assign(ticket, { id: createdTicketId });
  });
  test('update a ticket success', async ({ request }) => {
    const data = generateValidTicketAttributes();
    const response = await request.put(`/api/tickets/${createdTicketId}`, {
      data,
      headers: { cookie }
    });
    const body = await response.body();
    expect(response.ok()).toBe(true);
    const bodyParsed = JSON.parse(body.toString()) as Ticket;
    expect(bodyParsed).toBeDefined();
    const { title, price, id } = bodyParsed;
    expect(title).toBe(data.title);
    expect(price).toBe(data.price);
    expect(bodyParsed.userId).toBe(userId);
    expect(id).toBe(ticket.id);
    expect(response.status()).toBe(OK);
  });
});

test.describe('routes: /api/tickets/:id PUT update ticket failed', () => {
  test.beforeEach(async () => {
    await truncateTicketTable();
    cookie = createACookieSession({
      userEmail: 'a@a.com',
      userId: generateA32BitUnsignedInteger()
    });
  });
  test('invalid id in parameter request', async ({ request }) => {
    const invalidId = generateRandomString(5);
    const response = await request.put(`/api/tickets/${invalidId}`, {
      data: generateValidTicketAttributes(),
      headers: { cookie }
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Finding ticket failed.');
    expect(response.status()).toBe(INTERNAL_SERVER_ERROR);
  });
  test('Ticket Not found', async ({ request }) => {
    const validTicketId = generateA32BitUnsignedInteger();
    const response = await request.put(`/api/tickets/${validTicketId}`, {
      data: generateValidTicketAttributes(),
      headers: { cookie }
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Ticket not found.');
    expect(response.status()).toBe(NOT_FOUND);
  });
});

test.describe('routes: /api/tickets/:id PUT update ticket failed authorization', () => {
  test.beforeAll(async () => {
    const user = {
      userEmail: 'a@a.com',
      userId: generateA32BitUnsignedInteger()
    };
    cookie = createACookieSession(user);

    let userIdForTicket = generateA32BitUnsignedInteger();
    while (userIdForTicket === user.userId) {
      userIdForTicket = generateA32BitUnsignedInteger();
    }
    ticket = generateValidTicket(userIdForTicket);
    await truncateTicketTable();
    await insertIntoTicketTable(ticket);
    createdTicketId = (await selectIdFromTicketTable())[0].id;
    Object.assign(ticket, { id: createdTicketId });
  });

  test('userId in cookie payload is not the same as the userId found in the ticket in db', async ({ request }) => {
    const response = await request.put(`/api/tickets/${createdTicketId}`, {
      data: generateValidTicketAttributes(),
      headers: { cookie }
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Not authorized.');
    expect(response.status()).toBe(UNAUTHORIZED);
  });
});

test.describe('routes: /api/tickets/:id PUT update ticket failed because of attributes', () => {
  test.beforeAll(() => {
    cookie = createACookieSession({
      userEmail: 'a@a.com',
      userId: generateA32BitUnsignedInteger()
    });
  });
  test('invalid price of a ticket', async ({ request }) => {
    const validTicketId = generateA32BitUnsignedInteger();
    const response = await request.put(`/api/tickets/${validTicketId}`, {
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
    const validTicketId = generateA32BitUnsignedInteger();
    const response = await request.put(`/api/tickets/${validTicketId}`, {
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

test.describe('routes: /api/tickets/:id PUT requireAuth controller', () => {
  test("current user doesn't exists, not authorized by requireAuth common controller", async ({ request }) => {
    const validTicketId = generateA32BitUnsignedInteger();
    const response = await request.put(`/api/tickets/${validTicketId}`, {
      data: generateValidTicketAttributes()
    });
    const message = await parseMessage(response);
    expect(response.ok()).toBe(false);
    expect(message).toBe('Not authorized.');
    expect(response.status()).toBe(UNAUTHORIZED);
  });
});
