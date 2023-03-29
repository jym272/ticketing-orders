import express from 'express';
import { tickets } from '@routes/tickets';
import { routes as commonRoutes } from '@jym272ticketing/common';
const { utils, home } = commonRoutes;

const routes = [home, tickets, utils];

export const addRoutes = (server: express.Express) => {
  for (const route of routes) {
    server.use(route);
  }
};
