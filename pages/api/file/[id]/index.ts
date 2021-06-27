import { NextApiRequest, NextApiResponse } from 'next';
import { hash } from 'argon2';
import prisma from '../../../../lib/prisma'
import { verify, decode, sign } from 'jsonwebtoken';
import getConfig from '../../../../lib/config';
import { IDownloadToken } from '../../../../lib/types';
import { base64ToBuffer, bufferToBase64 } from '../../../../lib/utils';
import { decrypt, readMessage } from 'openpgp';

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
    const config = await getConfig();

    if (req.method !== 'POST') {
        res.status(405).send({});
        return;
    }

    const { id } = req.query;
        // Check token
        const token = req.headers.authorization;
        const { proof } = req.body;

        if (token === undefined) {
            const db = await prisma.fileUpload.findFirst({
                where: { id: id.toString() },
                select: {
                    proof: true
                }
            });

            if (db == null) {
                res.status(404).send({});
                return;
            }

            // Check if user provided the decrypted proof
            if (proof !== undefined) {
                if (Buffer.compare(db.proof.slice(0, 32), base64ToBuffer(proof)) == 0) {
                    const token = sign({ action: 'download', file: id }, process.env.JWT_SECRET, { expiresIn: '30s' });

                    console.log('Respond with:', token);
                    
                    res.status(200).send({ token });
                    return;
                } else {
                    console.log('Do not match!');
                    
                }
            }
            console.log(req.body.proof);

            // The first 32 bytes are the original while the reset is encrypted. We take the rest.
            const encryptedProof = db.proof.slice(32, db.proof.length);
            
            res.status(200).send(encryptedProof);
            return;
        }

        try {
            verify(token, process.env.JWT_SECRET);
            const decToken: IDownloadToken = JSON.parse(decode(token).toString());
            
            if (decToken.action !== 'download') {
                res.status(403).send({ message: 'The specified token is valid but is useless for downloading files.' });
                return;
            }

            if (decToken.file !== id) {
                res.status(403).send({ message: 'The specified token is valid but is useless for downloading this files.' });
                return;
            }

            // Now we know that the specified token is usable to unlock the download of this file.
            // The user can now get all information about the file.
            const db = await prisma.fileUpload.findFirst({
                where: { id: id.toString() },
                select: {
                    filename: true,
                    message: true,
                    expiresAt: true,
                    createdAt: true
                }
            });

            if (db === null) {
                res.status(404).send({});
                return;
            }

            res.json(db);
        } catch (err) {
            if (err) {
                res.status(403).send({ message: 'Your specified token is invalid.' });
                return;
            }
        }
}