import { Error as SequelizeError } from 'sequelize';

// TODO: it must be in the common API
// TODO: refactor all apis with this !!!!
type ServerSideError = Error | undefined;
export const parseSequelizeError = (err: unknown, serverMessage: string): ServerSideError => {
  let error = new Error(serverMessage);
  if (err instanceof SequelizeError) {
    err.message = `${err.message} ${serverMessage}`;
    error = err;
  }
  return error;
};
