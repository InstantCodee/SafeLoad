import { Settings } from '@prisma/client';
import crypto from 'crypto';
import { createMessage, encrypt, config as pgpConfig } from 'openpgp';
import React from 'react';
import { useForm } from 'react-hook-form';
import io, { Socket } from 'socket.io-client';

import { random } from '../lib/random';
import { bufferToBase64, mergeBuffers } from '../lib/utils';
import styles from '../styles/Uploader.module.scss';

export const Uploader = ({ c, chunkSize }) => {
    const config = c as Settings;
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    let isUploading = false;

    // We need to execute the worker stuff inside `useEffect` because otherwise it wont compile.
    // Reason is that Node.js doesn't have a Worker object, therefore it fails. `useEffect` makes
    // sure it's executed on client side.
    if (typeof window !== "undefined") {
        window.onbeforeunload = function (e) {
            return 'A file is still uploading. Are you sure to cancel that upload?';
        };
    }

    const onSubmit = async (data) => {
        if (data.file.length > 1) return;

        // User did not provide any password, so we create one.
        if (data.password === "") {
            data.password = random(32);
        }

        const salt = random(8);
        console.log(data);

        isUploading = true;

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

        console.time('proof');

        // Generate proof
        const source = crypto.randomBytes(32);
        const sourceMessage = await createMessage({ binary: source });
        const sourceEncrypted = await encrypt({
            message: sourceMessage,
            passwords: [data.password],
            armor: false
        });

        const finalSource = mergeBuffers(source, Buffer.from(sourceEncrypted));

        console.timeEnd('proof');

        const res = await fetch(`http://localhost:3000/api/file`, {
            method: 'post',
            body: JSON.stringify({
                filename: encryptedFilename,
                proof: bufferToBase64(finalSource),
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

            console.log('Here');

            // console.debug('Encryption finished!');

            const socket = io('http://localhost:13342');

            socket.on('ident', data => {
                const { status, message } = data;
                console.debug('Server said [ident]:', message, `(${status})`);

                if (status == 200) {
                    // We send the file size of the original file because we don't know the final size of the encrypted content yet.
                    // Usually the encrypted content is not much larger then the original (if armored is disabled because of Base64).
                    socket.emit('initData', { filesize: content.length });
                }
            });

            socket.on('initData', async data => {
                const { status, message } = data;
                console.debug('Server said [initData]:', message, `(${status})`);

                if (status == 200) {
                    fileTransfer(socket, content, password);
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
    async function fileTransfer(socket: Socket, data: Uint8Array, password: string) {
        let sentBytes = 0;

        const stream = new ReadableStream({
            start(controller) {
                console.log('Stream has been opened with a chunk size of', controller.desiredSize);
            },
            pull(controller) {
                let left = data.length - sentBytes;
                console.log('Left:', left);

                if (left < controller.desiredSize) {
                    controller.enqueue(data.slice(sentBytes, sentBytes + left));

                    console.log('Done sending data.');

                    // We're done
                    controller.close();
                } else {
                    controller.enqueue(data.slice(sentBytes, sentBytes + controller.desiredSize));
                    sentBytes += controller.desiredSize;
                }
            }
        }, { highWaterMark: chunkSize });

        // Well, the docs of OpenPGP.js advice to not enable this options because it would break compatibility with
        // other software of future version but it doesn't work without it. Who needs compatibility anyways, right?
        //
        // Tested with GnuPG 2.2.27
        pgpConfig.aeadProtect = true;

        const contentMessage = await createMessage({ binary: stream });
        const contentEncrypted = await encrypt({
            message: contentMessage,
            passwords: [password],
            // config: { preferredCompressionAlgorithm: enums.compression.zlib },
            armor: false
        }) as ReadableStream<Uint8Array>;

        const reader = contentEncrypted.getReader();
        reader.read().then(function process(stream) {
            if (stream.done) {
                console.log("Stream complete");
                socket.emit('dataEnd', {});

                isUploading = false;

                return;
            }

            socket.emit('data', stream.value);

            socket.once('data', data => {
                const { status, message } = data;
                if (status !== 200) {
                    console.error('A error occured while upload data:', message);
                    return;
                }

                console.log('Received OK');

                // Start all over and send the next chunk of data.
                return reader.read().then(process);
            });

            console.log('Sent', stream.value);
        });

        /*const left = stream.length - sentBytes;
        if (left <= 0) return;*/

        // E. g.: There are 162 byte left but 256 bytes could fit into a chunk, then only transmit the last remaining bytes.
        /*let copyOver = left < chunkSize ? left : chunkSize;

        let chunk = new Uint8Array(copyOver);

        // console.log(`Send chunk (${left - chunkSize} left):`, chunk);

        for (let i = 0; i < copyOver; i++) {
            const cursor = sentBytes + i;

            if (stream[cursor] === undefined) break;
            chunk[i] = stream[cursor];
        }

        console.debug(`Copied ${chunk.length} bytes of to chunk (${left - copyOver} byte remaining). Sending ...`);
        socket.emit('data', chunk);

        socket.once('data', data => {
            const { status, message } = data;
            if (status !== 200) {
                console.error('A error occured while upload data:', message);
                return;
            }

            fileTransfer(socket, stream, sentBytes + copyOver);
        });*/
    }

    const messagePlaceholder = `Message (max ${config.maxMsgSize} characters)`

    return (
        <div className={styles.uploader}>
            <form className={styles.form} id="uploadForm" onSubmit={handleSubmit(onSubmit)}>
                <div className={styles.dragArea}>
                    <input className={styles.upload} data-title="Blub" type='file' {...register('file')} /><br />
                </div>
                <input className={styles.pass} type="password" placeholder="Password" {...register('password')} /><br />
                <div className={styles.wrapper}>
                    <input className={styles.numberFieldInput} type="number" placeholder="Max. Downloads" {...register('maxDownload')} />
                    <input className={styles.numberFieldInput} type="number" placeholder="Expire (days)" {...register('expireAt')} />
                </div>
                <input className={styles.emails} type="text" placeholder="E-Mails" {...register('emails')} /><br />
                {errors.message && <p>Your message can only have {config.maxMsgSize} characters at maximum.</p>}
                <textarea className={styles.textArea} placeholder={messagePlaceholder} {...register('message', { maxLength: 200 })} /><br /><br />
            </form>

            <button className={styles.share} type="submit" form="uploadForm">Share</button>
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