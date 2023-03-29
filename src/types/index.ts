import { JwtPayload } from 'jsonwebtoken';

export interface TicketAttributes {
  title: string;
  price: number;
}

export interface Ticket extends TicketAttributes {
  id?: number;
  userId: number;
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
