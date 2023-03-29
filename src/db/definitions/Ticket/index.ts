import { DataTypes, Sequelize } from 'sequelize';
import { Ticket } from '@db/models';

export const init = (sequelize: Sequelize) => {
  Ticket.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'title'
      },
      price: {
        type: DataTypes.DECIMAL,
        allowNull: false,
        field: 'price',
        get() {
          return Number(this.getDataValue('price'));
        }
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id'
      },
      createdAt: DataTypes.DATE,
      updatedAt: DataTypes.DATE
    },
    {
      sequelize,
      tableName: 'ticket'
    }
  );
};
