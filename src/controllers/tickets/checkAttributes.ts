import { NextFunction, Request, Response } from 'express';
import { TicketAttributes } from '@custom-types/index';
import { utils } from '@jym272ticketing/common';
const { httpStatusCodes, throwError } = utils;
import { isValidPrice, isValidTitle } from '@utils/validators';
const { BAD_REQUEST } = httpStatusCodes;

export const checkAttributesController = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { title: rawTitle, price } = req.body as TicketAttributes;
    const title = rawTitle.trim();
    if (!isValidTitle(title)) {
      throwError('Invalid title.', BAD_REQUEST, new Error(`Title invalid: ${title}`));
    }
    if (!isValidPrice(price)) {
      throwError('Invalid price.', BAD_REQUEST, new Error(`Price invalid: ${price}`));
    }
    res.locals = {
      ...res.locals,
      title,
      price
    };
    next();
  };
};
