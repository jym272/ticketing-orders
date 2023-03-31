import { CreationOptional, ForeignKey, InferAttributes, InferCreationAttributes, Model, NonAttribute } from 'sequelize';
import { OrderStatus } from '@custom-types/index';
import { Ticket } from '@db/models';

// eslint-disable-next-line no-use-before-define -- circular dependency allowed
export class Order extends Model<InferAttributes<Order>, InferCreationAttributes<Order>> {
  declare id: CreationOptional<number>;
  declare userId: number;
  declare status: CreationOptional<OrderStatus>;
  declare expiresAt: Date;
  declare ticketId: ForeignKey<Ticket['id']>;
  declare ticket?: NonAttribute<Ticket>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}