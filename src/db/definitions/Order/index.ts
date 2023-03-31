import { DataTypes, Sequelize } from 'sequelize';
import { Order, Ticket } from '@db/models';
import { OrderStatus } from '@custom-types/index';

export const init = (sequelize: Sequelize) => {
  Order.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
        // field: 'user_id'
      },
      status: {
        type: DataTypes.ENUM,
        values: Object.values(OrderStatus),
        allowNull: false,
        field: 'status',
        defaultValue: OrderStatus.Created
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
        // field: 'expires_at'
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: false
        // field: 'ticket_id'
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: 'order'
    }
  );
};

export const associate = () => {
  Order.belongsTo(Ticket, {
    foreignKey: 'ticketId',
    as: 'ticket'
  });
};
