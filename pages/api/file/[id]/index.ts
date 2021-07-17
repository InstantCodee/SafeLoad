import { decode, sign, verify } from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';

import getConfig from '../../../../lib/config';
import prisma from '../../../../lib/prisma';
import { IDownloadToken } from '../../../../lib/types';
import { base64ToBuffer } from '../../../../lib/utils';

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
                const token = sign({
                    action: 'download',
                    file: id,
                    ip: req.socket.remoteAddress
                }, process.env.JWT_SECRET, { expiresIn: '30s' });

                res.status(200).send({ token });
                return;
            } else {
                res.status(401).send({ message: 'Your proof doesn\'t match' });
                return;
            }
        }

        // The first 32 bytes are the original while the reset is encrypted. We take the rest.
        const encryptedProof = db.proof.slice(32, db.proof.length);

        res.status(200).send(encryptedProof);
        return;
    }

    let decToken: IDownloadToken;
    try {
        verify(token, process.env.JWT_SECRET);
        decToken = <IDownloadToken>decode(token);
    } catch (err) {
        if (err) {
            res.status(403).send({ message: 'Your specified token is invalid: ' + err.message });
            return;
        }
    }

    if (decToken.action !== 'download') {
        res.status(403).send({ message: 'The specified token is valid but is useless for downloading files.' });
        return;
    }

    if (decToken.file !== id) {
        res.status(403).send({ message: 'The specified token is valid but is useless for downloading this file.' });
        return;
    }

    if (decToken.ip !== req.socket.remoteAddress) {
        res.status(403).send({ message: 'The specified token is valid but was created for a different host.' });
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
}