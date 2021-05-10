import { NextApiRequest, NextApiResponse } from 'next';
import { hash } from 'argon2';
import { verify } from 'jsonwebtoken';
import prisma from '../../../../lib/prisma';

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
    if (req.method != 'POST') {
        res.status(400).send(({ message: 'Wrong method. Please use POST to upload a file.' }));
        return;
    }

    const { token } = req.headers;
    if (token === undefined) {
        res.status(401).send({ message: 'No token specified' });
        return;
    }

    try {
        verify(token.toString(), process.env.JWT_SECRET)
    } catch (err) {
        res.status(401).send({ message: 'Token is invalid' });
        return;
    }
}