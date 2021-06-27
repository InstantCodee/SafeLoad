import { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import { hash } from 'argon2';

import prisma from '../../../lib/prisma';
import { random } from '../../../lib/random';
import getConfig from '../../../lib/config';
import { base64ToBuffer } from '../../../lib/utils';

function formParseWrapper(form, req) {
    return new Promise<any>(resolve => {
        form.parse(req, async (err, fields, files) => {
            resolve({ err, fields, files });
        });
    });
}

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "POST") {
        const { maxDownload, expiresAt, filename, proof, message, emails } = req.body;
        const config = await getConfig();

        if (proof === undefined) {
            res.status(401).send({ message: 'A proof needs to be set!' });
            return;
        }

        // We already received the password in a hashed form but we hash it again. This time with Argon2.
        // The reason for this is that we don't want to make the hash the password which ruins the concept
        // of hashes.
        //const hashedPassword = await hash(password, { memoryCost: config.hashMemory, parallelism: config.hashPara, timeCost: config.hashRounds });
    
        const id: string = uuidv4();
        const uSecret = random(16);
    
        const upload = await prisma.fileUpload.create({
            data: {
                id,
                maxDownload,
                filename,
                uSecret,
                message,
                downloads: 0,
                viewCount: 0,
                proof: base64ToBuffer(proof)
            }
        });

        // Create JWT token that will authorize the client to upload a file.
        // const token = sign({ id, action: 'file-upload' }, process.env.JWT_SECRET, { expiresIn: '15s' });
    
        res.status(200).send({ id: upload.id, secret: uSecret });
    } else {
        res.send('ok');
    }
    
}