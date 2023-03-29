import { Sequelize } from 'sequelize';

import * as ticket from '@db/definitions/Ticket';

const appLabels = [ticket];

export const initDefinitions = (sequelize: Sequelize) => {
  for (const label of appLabels) {
    label.init(sequelize);
  }
};
