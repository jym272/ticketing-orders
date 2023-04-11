import { JsMsg } from 'nats';
import { Order } from '@db/models';
import { OrderStatus, log } from '@jym272ticketing/common/dist/utils';
import { getSequelizeClient } from '@db/sequelize';
import { PaymentSubjects, sc, subjects, nakTheMsg, publish } from '@jym272ticketing/common/dist/events';

const sequelize = getSequelizeClient();

interface Payment {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  stripeCharge: Record<string, unknown>;
  orderId: number;
  order?: Record<string, unknown>;
}
const orderComplete = async (m: JsMsg, payment: Payment) => {
  m.working();
  let foundOrder: Order | null;
  try {
    foundOrder = await Order.findByPk(payment.orderId);
    if (!foundOrder) {
      log('Order does not exist');
      return m.term();
    }
  } catch (err) {
    log('Error finding order', err);
    return nakTheMsg(m);
  }

  try {
    await sequelize.transaction(async () => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const order = foundOrder!;
      order.status = OrderStatus.Complete;
      await order.save();
      await publish(order, subjects.OrderUpdated);
      m.ack();
    });
  } catch (err) {
    log('Error updating/completing the order', err);
    return nakTheMsg(m);
  }
};
export const paymentCreatedListener = async (m: JsMsg) => {
  if (m.subject !== subjects.PaymentCreated) {
    log('Wrong subject', m.subject);
    m.term();
    return;
  }
  let payment: Payment | undefined;
  try {
    const data = JSON.parse(sc.decode(m.data)) as Record<PaymentSubjects, Payment | undefined>;
    payment = data[subjects.PaymentCreated];
    if (!payment) throw new Error(`Payment not found in message data with subject ${m.subject}`);
  } catch (e) {
    log('Error parsing message data', e);
    m.term();
    return;
  }
  await orderComplete(m, payment);
};
