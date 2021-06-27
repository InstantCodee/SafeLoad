import { hash, verify } from 'argon2';
import cookie from 'cookie';
import moment from 'moment';
import { NextApiRequest, NextApiResponse } from 'next';
import { UAParser } from 'ua-parser-js';

import getConfig from '../../../lib/config';
import preAPI from '../../../lib/middleware/preAPI';
import prisma from '../../../lib/prisma';
import { random } from '../../../lib/random';
import { capitalizeFirst } from '../../../lib/utils';

async function handle(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.status(405).send({});
        return;
    }

    const { name, password } = req.body;

    if (name === undefined || password === undefined) {
        res.status(400).send({ message: 'Username and password have to be provided.' });
        return;
    }

    const config = await getConfig();
    const user = await prisma.user.findFirst({ where: { name } });
    if (user === null) {
        await hash(password, {
            memoryCost: config.hashMemory,
            parallelism: config.hashPara
        });

        res.status(401).send({ message: 'Either the user doesn\'t exist or the password is wrong.' });
        return
    }

    const check = await verify(user.password, password);

    if (check) {
        const agent = new UAParser(req.headers['user-agent']);


        let agentFinal = "Unknown";
        try {
            agentFinal = `${capitalizeFirst(agent.getDevice().type)} - ${capitalizeFirst(agent.getOS().name)}`;
        } catch (err) {
        }

        const expireIn = moment().add(3, 'days');
        const session = await prisma.userSession.create({
            data: {
                id: random(32),
                device: agentFinal,
                expiresAt: expireIn.toDate(),
                userId: user.id
            }
        });

        res.setHeader('Set-Cookie', cookie.serialize('auth', session.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            sameSite: 'strict',
            maxAge: 86400 * 3,
            path: '/'
        }));
        res.send({ message: 'Login succeeded' });
    } else {
        res.status(401).send({ message: 'Either the user doesn\'t exist or the password is wrong.' });
        return;
    }
}

export default preAPI(handle);