import { expect, test } from '@playwright/test';
import {
  generateA32BitUnsignedInteger,
  generateTicketAttributes,
  logFinished,
  logRunning,
  publishToSubject,
  runPsqlCommandWithTimeout,
  truncateTables
} from '@tests/test-utils';
import { Ticket } from '@db/models';
import { subjects } from '@jym272ticketing/common/dist/events';

// eslint-disable-next-line no-empty-pattern -- because we need to pass only the testInfo
test.beforeEach(({}, testInfo) => logRunning(testInfo));
// eslint-disable-next-line no-empty-pattern -- because we need to pass only the testInfo
test.afterEach(({}, testInfo) => logFinished(testInfo));

// only can prove happy paths !
test.describe('listener: ticketListener ', () => {
  let id: number;
  test.beforeAll(async () => {
    id = generateA32BitUnsignedInteger();
    await truncateTables('ticket', 'order');
  });

  test('subject tickets.created new Ticket in db', async () => {
    const { title, price } = generateTicketAttributes();

    await publishToSubject(subjects.TicketCreated, {
      [subjects.TicketCreated]: { id, title, price, version: 0 }
    });

    //retrieve the ticket directly from the db, the subscriber can be taking some time to process the event
    const res = await runPsqlCommandWithTimeout(
      `select jsonb_build_object('id', id, 'title', title, 'price', price, 'version', version) from "ticket" where id=${id}`
    );
    if (!res) {
      //actually the timeout force to throw an error, but ts thinks is resolved undefined because of the waiting
      throw new Error('No result');
    }
    const ticket = JSON.parse(res) as Ticket;
    expect(ticket.id).toBe(id);
    expect(ticket.title).toBe(title);
    expect(ticket.price).toBe(price);
    expect(ticket.version).toBe(0);
  });

  test('subject tickets.updated update Ticket already in db', async () => {
    const { title: newTitle, price: newPrice } = generateTicketAttributes();

    await publishToSubject(subjects.TicketUpdated, {
      [subjects.TicketUpdated]: { id, title: newTitle, price: newPrice, version: 1 }
    });

    const res = await runPsqlCommandWithTimeout(
      `select jsonb_build_object('id', id, 'title', title, 'price', price, 'version', version) from "ticket" where price=${newPrice} and title='${newTitle}'`
    );
    if (!res) {
      throw new Error('No result');
    }
    const ticket = JSON.parse(res) as Ticket;
    expect(ticket.id).toBe(id);
    expect(ticket.title).toBe(newTitle);
    expect(ticket.price).toBe(newPrice);
    expect(ticket.version).toBe(1);
  });
  // create test with various versino and time handlerses
});
