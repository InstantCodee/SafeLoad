import { hash, verify } from 'argon2';
import cookie from 'cookie';
import moment from 'moment';
import { NextApiRequest, NextApiResponse } from 'next';
import { UAParser } from 'ua-parser-js';

import getConfig from '../../../lib/config';
import authenticate, { SafeLoadRequest } from '../../../lib/middleware/authenticate';
import preAPI from '../../../lib/middleware/preAPI';
import prisma from '../../../lib/prisma';
import { random } from '../../../lib/random';
import { capitalizeFirst } from '../../../lib/utils';

async function handle(req: SafeLoadRequest, res: NextApiResponse) {
    res.send({ message: `Hello ${req.user.name}` });
}

export default authenticate(handle);