import { Settings } from '@prisma/client';
import crypto from 'crypto';
import { createMessage, encrypt, enums } from 'openpgp';
import { useForm } from 'react-hook-form';
import io from 'socket.io-client';

import { random } from '../lib/random';

function HomePage({ c, chunkSize }) {
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
                    expireAt: data.expireAt,
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
            uploadFile(data.password, result.id, result.secret, reader)
        });
    };

    function uploadFile(password: string, id: string, secret: string, reader: FileReader) {
        reader.onload = async (data) => {
            // Content is now a Int8Array
            const content = new Uint8Array(data.target.result as ArrayBuffer);
            console.log(content);

            const contentMessage = await createMessage({ binary: content });
            const contentEncrypted = await encrypt({
                message: contentMessage,
                passwords: [password],
                config: { preferredCompressionAlgorithm: enums.compression.zlib },
                armor: false
            });

            console.debug('Encryption finished! Saved', 100 - (contentEncrypted.byteLength / content.byteLength * 100), '% on size.');

            const socket = io('http://localhost:13342');

            socket.on('ident', data => {
                const { status, message } = data;
                console.debug('Server said [ident]:', message, `(${status})`);

                if (status == 200) {
                    socket.emit('initData', { filesize: contentEncrypted.length });
                }
            });

            socket.on('initData', async data => {
                const { status, message } = data;
                console.debug('Server said [initData]:', message, `(${status})`);

                if (status == 200) {
                    console.log('Start sending data (with a chunk size of ', chunkSize, ') with the size of', contentEncrypted.length);

                    let chunk = new Uint8Array(chunkSize);
                    let sentChunks = 0;
                    let count = 0;

                    for await (const byte of contentEncrypted) {
                        const left = contentEncrypted.length - (sentChunks * chunkSize);
                        chunk[count] = byte;
                        count++;

                        if (count == chunkSize) {
                            console.log(`Send chunk (${contentEncrypted.length - ((1 + sentChunks) * chunkSize)} left):`, chunk);
                            
                            socket.emit('data', chunk);
                            chunk = new Uint8Array(chunkSize);  // Clearing chunk
                            count = 0;
                            sentChunks += 1;
                        } else if (left < chunkSize) {
                            const remainingData = contentEncrypted.slice(contentEncrypted.length - left, contentEncrypted.length);
                            console.log(`Send remaining data (${left} left):`, remainingData);
                            socket.emit('data', remainingData);
                            break;
                        }
                    }
                }
            });

            socket.emit('ident', { id, secret });
        }
    }

    const messagePlaceholder = `Message (max ${config.maxMsgSize} characters)`

    return <div>
        <h2>Ready to upload some data?</h2>
        <form action="/api/file" method="POST" onSubmit={handleSubmit(onSubmit)}>
            <input type='file' {...register('file')} /><br />
            <input type="password" placeholder="Password" {...register('password')} /><br />
            <input type="number" placeholder="Max. Downloads" {...register('maxDownload')} /><br />
            <input type="number" placeholder="Expire (days)" {...register('expireAt')} /><br />
            <input type="text" placeholder="E-Mails" {...register('emails')} /><br />
            {errors.message && <p>Your message can only have {config.maxMsgSize} characters at maximum.</p>}
            <input type="text" placeholder={messagePlaceholder} {...register('message', { maxLength: 200 })} /><br /><br />
            <button type="submit">Share</button>
        </form>
    </div>
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

export default HomePage