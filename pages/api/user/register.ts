import { hash } from 'argon2';
import moment from 'moment';
import { NextApiRequest, NextApiResponse } from 'next';
import { UAParser } from 'ua-parser-js';
import getConfig from '../../../lib/config';
import preAPI from '../../../lib/middleware/preAPI';

import prisma from '../../../lib/prisma';
import { random } from '../../../lib/random';

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

    const user = await prisma.user.findFirst({ where: { name } });
    if (user !== null) {
        res.status(409).send({ message: "There is a conflict with an already existing user." });
        return;
    }

    const salt = random(8);

    const config = await getConfig();
    const hashedPassword = await hash(password, {
        memoryCost: config.hashMemory,
        parallelism: config.hashPara,
        salt: Buffer.from(salt),
    });

    // Check if this is the first user. If yes, give admin.
    const userCount = await prisma.user.count();
    
    await prisma.user.create({
        data: {
            name,
            salt,
            password: hashedPassword,
            isAdmin: userCount === 0
        }
    });

    res.status(200).send({});
}

export default preAPI(handle);