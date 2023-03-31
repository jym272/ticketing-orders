import { JwtPayload } from 'jsonwebtoken';

export interface TicketAttributes {
  title: string;
  price: number;
}

export interface Ticket extends TicketAttributes {
  id?: number;
  userId?: number; // not used in this api maybe ?
  createdAt?: string;
  updatedAt?: string;
}

export interface JwtPayloadCustom extends JwtPayload {
  permissions: {
    authenticated: boolean;
  };
  exp: number;
  iss: string;
  sub: string;
  aud: string | string[];
  jti: string;
}

//TODO: maybe the common controller needs this too
export enum OrderStatus {
  // When the order has been created, but the ticket it is trying to order has not been reserved
  Created = 'created',
  // The ticket the order is trying to reserve has already been reserved, or when the user has cancelled the order
  // The order expires before payment TODO: it can be three different statuses
  Cancelled = 'cancelled',
  // The order has successfully reserved the ticket
  AwaitingPayment = 'awaiting:payment',
  // The order has reserved the ticket and the user has provided payment successfully
  Complete = 'complete'
}
