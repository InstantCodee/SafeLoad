import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma'

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const db = await prisma.fileUpload.findFirst({
        where: { id: id.toString() }
    });

    res.json(db);
}