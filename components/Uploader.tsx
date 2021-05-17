import { Settings } from '@prisma/client';
import crypto from 'crypto';
import { createMessage, encrypt, enums } from 'openpgp';
import React from 'react';
import { useForm } from 'react-hook-form';
import io, { Socket } from 'socket.io-client';

import { random } from '../lib/random';
import styles from '../styles/Uploader.module.scss';

export const Uploader = ({ c, chunkSize }) => {
    const config = c as Settings;
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const onSubmit = async (data) => {
        if (data.file.length > 1) return;

        // User did not provide any password, so we create one.
        if (data.password === "") {
            data.password = random(32);
        }

        const salt = random(8);
        console.log(data);

        // Encrypt filename
        const filenameMessage = await createMessage({ text: data.file[0].name });
        let encryptedFilename = await encrypt({
            message: filenameMessage,
            passwords: [data.password],
            armor: true
        });

        // Remove pgp header
        encryptedFilename = encryptedFilename.toString()
            .replace('-----BEGIN PGP MESSAGE-----', '')
            .replace('-----END PGP MESSAGE-----', '')
            .replaceAll('\n', '')
            .trim();

        console.debug(`Filename (encrypted): ${encryptedFilename}`);

        // Hash password
        console.time('hash');
        crypto.pbkdf2(data.password, salt, 500000, 64, 'sha512', async (err, key) => {
            const hashedPassword = key.toString('hex');
            console.debug('Password (hashed):', hashedPassword);
            console.timeEnd('hash')

            const res = await fetch(`http://localhost:3000/api/file`, {
                method: 'post',
                body: JSON.stringify({
                    password: hashedPassword,
                    salt,
                    filename: encryptedFilename,
                    maxDownload: Number(data.maxDownload),
                    expiresAt: data.expireAt,
                    emails: data.emails,
                    message: data.message
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await res.json();
            console.debug('File upload has been created. Response:', result);

            const reader = new FileReader();
            reader.readAsArrayBuffer(data.file[0]);
            initUpload(data.password, result.id, result.secret, reader)
        });
    };

    /**
     * Initialize file upload.
     * @param password Password for encryption
     * @param id ID of file upload
     * @param secret Secret of file upload
     * @param reader Open reader to target file
     */
    function initUpload(password: string, id: string, secret: string, reader: FileReader) {
        reader.onload = async (data) => {
            // Content is now a Int8Array
            const content = new Uint8Array(data.target.result as ArrayBuffer);

            const contentMessage = await createMessage({ binary: content });
            const contentEncrypted = await encrypt({
                message: contentMessage,
                passwords: [password],
                config: { preferredCompressionAlgorithm: enums.compression.zlib },
                armor: false
            });

            console.debug('Encryption finished! Saved', 100 - (contentEncrypted.length / content.length * 100), '% on size.');

            const socket = io('http://localhost:13342');

            socket.on('ident', data => {
                const { status, message } = data;
                console.debug('Server said [ident]:', message, `(${status})`);

                // Hash encrypted content
                const checksum = crypto.createHash('sha512').update(contentEncrypted).digest('hex');
                console.debug('Checksum:', checksum);

                if (status == 200) {
                    socket.emit('initData', { filesize: contentEncrypted.length, checksum });
                }
            });

            socket.on('initData', async data => {
                const { status, message } = data;
                console.debug('Server said [initData]:', message, `(${status})`);

                if (status == 200) {
                    console.log("Send:", contentEncrypted);
                    
                    fileTransfer(socket, contentEncrypted);
                }
            });

            socket.emit('ident', { id, secret });
        }
    }

    /**
     * The function `initUpload()` has to be called prior to this. This function will take a open socket connection
     * to tranfer the data in chunks.
     * @param params 
     */
    async function fileTransfer(socket: Socket, buffer: Uint8Array, sentBytes: number = 0) {
        const left = buffer.length - sentBytes;
        if (left <= 0) return;

        // E. g.: There are 162 byte left but 256 bytes could fit into a chunk, then only transmit the last remaining bytes.
        let copyOver = left < chunkSize ? left : chunkSize;

        let chunk = new Uint8Array(copyOver);

        // console.log(`Send chunk (${left - chunkSize} left):`, chunk);

        for (let i = 0; i < copyOver; i++) {
            const cursor = sentBytes + i;

            if (buffer[cursor] === undefined) break;
            chunk[i] = buffer[cursor];
        }

        console.debug(`Copied ${chunk.length} bytes of to chunk (${left - copyOver} byte remaining). Sending ...`);
        socket.emit('data', chunk);

        socket.once('data', data => {
            const { status, message } = data;
            if (status !== 200) {
                console.error('A error occured while upload data:', message);
                return;
            }

            fileTransfer(socket, buffer, sentBytes + copyOver);
        });
    }

    const messagePlaceholder = `Message (max ${config.maxMsgSize} characters)`

    return (
        <div className={styles.uploader}>
            <h2 className={styles.head}>Ready to upload some data?</h2>
            <form className={styles.form} action="/api/file" method="POST" id="uploadForm" onSubmit={handleSubmit(onSubmit)}>
                <input type='file' {...register('file')} /><br />
                <input type="password" placeholder="Password" {...register('password')} /><br />
                <input type="number" placeholder="Max. Downloads" {...register('maxDownload')} /><br />
                <input type="number" placeholder="Expire (days)" {...register('expireAt')} /><br />
                <input type="text" placeholder="E-Mails" {...register('emails')} /><br />
                {errors.message && <p>Your message can only have {config.maxMsgSize} characters at maximum.</p>}
                <input type="text" placeholder={messagePlaceholder} {...register('message', { maxLength: 200 })} /><br /><br />
            </form>

            <button type="submit" form="uploadForm" className={styles.share}>Share</button>
        </div>
    )
}

export const getServerSideProps = async context => {
    const req = await fetch(`http://localhost:3000/api/config`);

    return {
        props: {
            c: await req.json(),
            chunkSize: Number(process.env.CHUNK_SIZE)
        }
    }
}

export default Uploader