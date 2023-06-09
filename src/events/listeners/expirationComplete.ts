import { JsMsg } from 'nats';
import { Order, Ticket } from '@db/models';
import { log, OrderStatus } from '@jym272ticketing/common/dist/utils';
import { getSequelizeClient } from '@db/sequelize';
import { ExpirationSubjects, nakTheMsg, publish, sc, subjects } from '@jym272ticketing/common/dist/events';

const sequelize = getSequelizeClient();

const updateOrder = async (m: JsMsg, order: Order) => {
  m.working();
  let foundOrder: Order | null;
  try {
    foundOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: Ticket,
          as: 'ticket'
        }
      ]
    });
    if (!foundOrder) {
      log('Order does not exist');
      return m.term();
    }
  } catch (err) {
    log('Error finding order', err);
    return nakTheMsg(m);
  }

  if (foundOrder.status === OrderStatus.Complete) {
    log('Order is already complete, cannot be cancelled');
    return m.term();
  }

  try {
    await sequelize.transaction(async () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const order = foundOrder!;
      order.status = OrderStatus.Cancelled;
      await order.save();
      await publish(order, subjects.OrderUpdated);
      m.ack();
    });
  } catch (err) {
    log('Error updating/cancelling order', err);
    return nakTheMsg(m);
  }
};

export const expirationCompleteListener = async (m: JsMsg) => {
  if (m.subject !== subjects.ExpirationComplete) {
    log('Wrong subject', m.subject);
    m.term();
    return;
  }
  let order: Order | undefined;
  try {
    const data = JSON.parse(sc.decode(m.data)) as Record<ExpirationSubjects, Order | undefined>;
    order = data[subjects.ExpirationComplete];
    if (!order) throw new Error(`Order not found in message data with subject ${m.subject}`);
  } catch (e) {
    log('Error parsing message data', e);
    m.term();
    return;
  }
  await updateOrder(m, order);
};
