import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../../lib/prisma'
import formidable from 'formidable';

function formParseWrapper(form, req) {
    return new Promise<any>(resolve => {
        form.parse(req, async (err, fields, files) => {
            resolve({ err, fields, files });
        });
    });
}

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "POST") {
        const { maxDownload, expireAt, filename, password, message, emails } = req.body;

        if (filename === undefined || password === undefined) {
            res.status(401).send({ message: 'One or more required fields are missing.' });
            return;
        }
    
        const id: string = uuidv4();
    
        await prisma.fileUpload.create({
            data: {
                id,
                maxDownload,
                filename,
                password,
                message,
                downloads: 0,
                viewCount: 0
            }
        });
    
        res.status(200).send({});
    } else {
        res.send('ok');
    }
    
}