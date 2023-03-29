import { CreationOptional, InferAttributes, InferCreationAttributes, Model } from 'sequelize';

// eslint-disable-next-line no-use-before-define -- circular dependency allowed
export class Ticket extends Model<InferAttributes<Ticket>, InferCreationAttributes<Ticket>> {
  declare id: CreationOptional<number>;
  declare title: string;
  declare price: number;
  declare userId: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}
