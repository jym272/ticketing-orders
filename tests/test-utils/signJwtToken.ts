import jwt from 'jsonwebtoken';
import { getEnvOrFail } from '@utils/env';
import { signJwtTokenOptions } from '@utils/constants';
const secret = getEnvOrFail('JWT_SECRET');

// TODO: must be common!!! Auth uses it tooo
export const signJwtToken = ({ userEmail, userId }: { userEmail: string; userId: number }) => {
  const payload = {
    permissions: {
      authenticated: true
    }
  };
  const options = {
    expiresIn: '1d',
    issuer: signJwtTokenOptions.ISSUER,
    subject: userEmail,
    jwtid: userId.toString(),
    audience: signJwtTokenOptions.AUDIENCE
  };
  return jwt.sign(payload, secret, options);
};
