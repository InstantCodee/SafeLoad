import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { sign } from 'jsonwebtoken';
import prisma from '../../../lib/prisma'
import formidable from 'formidable';
import { random } from '../../../lib/random';

function formParseWrapper(form, req) {
    return new Promise<any>(resolve => {
        form.parse(req, async (err, fields, files) => {
            resolve({ err, fields, files });
        });
    });
}

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "POST") {
        const { maxDownload, expiresAt, filename, password, salt, message, emails } = req.body;

        if (filename === undefined || password === undefined) {
            res.status(401).send({ message: 'One or more required fields are missing.' });
            return;
        }
    
        const id: string = uuidv4();
        const uSecret = random(16);
    
        const upload = await prisma.fileUpload.create({
            data: {
                id,
                maxDownload,
                filename,
                password,
                salt,
                uSecret,
                message,
                downloads: 0,
                viewCount: 0
            }
        });

        // Create JWT token that will authorize the client to upload a file.
        // const token = sign({ id, action: 'file-upload' }, process.env.JWT_SECRET, { expiresIn: '15s' });
    
        res.status(200).send({ id: upload.id, secret: uSecret });
    } else {
        res.send('ok');
    }
    
}