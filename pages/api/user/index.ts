import { NextApiResponse } from 'next';

import authenticate, { SafeLoadRequest } from '../../../lib/middleware/authenticate';

async function handle(req: SafeLoadRequest, res: NextApiResponse) {
    res.send({ message: `Hello ${req.user.name}` });
}

export default authenticate(handle);