import { Settings } from '@prisma/client';
import crypto from 'crypto';
import { createMessage, encrypt, enums, Message } from 'openpgp';
import { useForm } from 'react-hook-form';
import io, { Socket } from 'socket.io-client';
import { DefaultEventsMap } from 'socket.io-client/build/typed-events';

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
                armor: false,
            });

            console.debug('Encryption finished! Saved', 100 - (contentEncrypted.byteLength / content.byteLength * 100), '% on size.');

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

        for (let i = 1; i < copyOver + 1; i++) {
            const cursor = sentBytes + i;
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

    return <div>
        <svg class="bottom" xmlns="http://www.w3.org/2000/svg" width="1920" height="405" fill="none" viewBox="0 0 1920 405">
            <g filter="url(#filter0_f)">
                <path fill="url(#paint0_linear)" d="M411.5 7C90.7-15-45.667 127.5-76 195.5v299l2117.5 12v-332c-77.67 51.833-300.6 139.3-571 74.5-338-81-658-214.5-1059-242z" />
            </g>
            <defs>
                <linearGradient id="paint0_linear" x1="982.75" x2="983" y1="4.716" y2="445.5" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#D11DF3" />
                    <stop offset=".81" stopColor="#6D2A7A" />
                </linearGradient>
                <filter id="filter0_f" width="2125.5" height="509.784" x="-80" y=".716" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    
                </filter>
            </defs>
        </svg>
        <svg class="top" xmlns="http://www.w3.org/2000/svg" width="1920" height="798" fill="none" viewBox="0 0 1920 798">
            <g filter="url(#filter1_f)">
                <path fill="url(#paint1_linear)" d="M374.599 413.587C186.954 411.433 20.014 523.945-40 580.471L-6.492-70.467 2051-92l-18.5 368.76c-75.02 82.993-42.01 76.713-273.57 262.438-77.29 61.997-439.61 333.768-692.17 232.382-252.556-101.387-457.605-355.302-692.161-357.993z" />
            </g>
            <defs>
                <linearGradient id="paint1_linear" x1="1019" x2="1019" y1="607.5" y2="-138.5" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#089BCD" />
                    <stop offset="1" stopColor="#255767" />
                </linearGradient>
                <filter id="filter1_f" width="2099" height="894" x="-44" y="-96" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
                    
                </filter>
            </defs>
        </svg>


        <div class="wrapper">

        </div>

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