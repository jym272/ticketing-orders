import { expect, test } from '@playwright/test';
import { Order, Ticket } from '@db/models';
import { events, utils } from '@jym272ticketing/common';
const {
  generateTicketAttributes,
  logFinished,
  logRunning,
  publishToSubject,
  runPsqlCommandWithTimeout,
  truncateTables,
  log,
  OrderStatus,
  createUniqueUser,
  insertIntoTableWithReturnJson
} = utils;
const { subjects } = events;

// eslint-disable-next-line no-empty-pattern -- because we need to pass only the testInfo
test.beforeEach(({}, testInfo) => logRunning(testInfo));
// eslint-disable-next-line no-empty-pattern -- because we need to pass only the testInfo
test.afterEach(({}, testInfo) => logFinished(testInfo));

/*
  Only can prove happy paths, these test are async, but it is difficult to know when the listener
  has finished to process the events. If the test fails increase the graceTime
 */
const graceTime = 100;
const user1 = createUniqueUser();

// doesn't matter, the test is assuming that the order is expired, the expiration
// api publish the event expiration.complete
const EXPIRATION_ORDER_MINUTES = 1;

test.describe('listener: expirationComplete', () => {
  let ticket: Ticket;
  let order: Order;

  test.beforeAll(async () => {
    await truncateTables('ticket', 'order');
    ticket = await insertIntoTableWithReturnJson<Ticket>('ticket', { version: 0, ...generateTicketAttributes() });
    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPIRATION_ORDER_MINUTES * 60);
    order = await insertIntoTableWithReturnJson<Order>('order', {
      ticketId: ticket.id,
      userId: user1.userId,
      expiresAt: expiration
    });
  });

  test('expiration api publish the event expiration.complete, the order is Cancelled', async () => {
    expect(order.status).toBe(OrderStatus.Created);
    await publishToSubject(subjects.ExpirationComplete, {
      [subjects.ExpirationComplete]: { id: order.id }
    });

    log(`waiting ${graceTime} ms for the listener to process the events`);
    await new Promise(resolve => setTimeout(resolve, graceTime));
    const res = await runPsqlCommandWithTimeout(
      `select jsonb_build_object('id', id, 'status', status) from "order" where id=${order.id}`
    );
    if (!res) {
      throw new Error('No result');
    }
    const { status } = JSON.parse(res) as Order;
    expect(status).toBe(OrderStatus.Cancelled);
    // because the order update is in a transaction with the publish method
    // It also proves that the event "orders.cancelled" has been published,
  });
});

test.describe('listener: expirationComplete but the order is already complete', () => {
  let ticket: Ticket;
  let order: Order;

  test.beforeAll(async () => {
    await truncateTables('ticket', 'order');
    ticket = await insertIntoTableWithReturnJson<Ticket>('ticket', { version: 0, ...generateTicketAttributes() });
    const expiration = new Date();
    expiration.setSeconds(expiration.getSeconds() + EXPIRATION_ORDER_MINUTES * 60);
    order = await insertIntoTableWithReturnJson<Order>('order', {
      ticketId: ticket.id,
      userId: user1.userId,
      expiresAt: expiration
    });
  });

  test('expiration api publish the event expiration.complete, the order is already Complete', async () => {
    expect(order.status).toBe(OrderStatus.Created);
    // completing, the order for example a pay has being made
    await publishToSubject(subjects.PaymentCreated, {
      [subjects.PaymentCreated]: { orderId: order.id }
    });
    // a race between two events expiration.complete and payment.created
    // simulate that the payment.created event is processed first
    log(`waiting ${graceTime} ms for the listener to process the events`);
    await new Promise(resolve => setTimeout(resolve, graceTime));

    await publishToSubject(subjects.ExpirationComplete, {
      [subjects.ExpirationComplete]: { id: order.id }
    });

    // the event expiration.complete is processed after the payment.created, arrives and
    // is m.term because the order is already complete
    log(`waiting ${graceTime} ms for the listener to process the events`);
    await new Promise(resolve => setTimeout(resolve, graceTime));

    const res = await runPsqlCommandWithTimeout(
      `select jsonb_build_object('id', id, 'status', status) from "order" where id=${order.id}`
    );
    if (!res) {
      throw new Error('No result');
    }
    const { status } = JSON.parse(res) as Order;
    expect(status).not.toBe(OrderStatus.Cancelled);
    expect(status).toBe(OrderStatus.Complete);
    // because the order update is in a transaction with the publish method
    // It also proves that the event "orders.updated" has been published,
  });
});
