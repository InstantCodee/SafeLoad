import { join, resolve } from 'path';
import { Server, Socket } from 'socket.io';
import { write, open, close } from 'fs';
import getConfig, { pullConfig } from '../../lib/config';

import prisma from '../../lib/prisma';

const ioHandler = async (req, res) => {
    if (res.socket.server.io) {
        res.end();
        return;
    }
    console.log('Start Socket.io server')

    const ioServer = new Server({
        pingTimeout: 10 * 1000 * 60,
        cors: {
            origin: 'http://localhost:3000'
        }
    });
    ioServer.listen(13342);

    console.log('Socket.io server is running on 13342');

    ioServer.on('connection', (socket: ExtentedSocket) => {
        socket.locked = false;
        socket.initFinished = false;
        socket.fileUpload = null;

        // The socket has to send the ID of a specific upload and it's secret in order to upload.
        socket.on('ident', async data => {
            const { id, secret } = data;

            if (socket.fileUpload !== null) {
                socket.emit('ident', { status: 409, message: 'You\'re already identified. To issue a new upload, please re-connect.' });
                return;
            }

            if (id === undefined || secret === undefined) {
                socket.emit('ident', { status: 500, message: 'You need to provide a target id and it\'s corresponding secret.' });
                return;
            }

            const upload = await prisma.fileUpload.findUnique({ where: { id } });
            if (upload === null || upload.uSecret !== secret) {
                socket.emit('ident', { status: 404, message: 'Either your id or secret is wrong.' });
                return;
            }

            if (upload.checksum !== null) {
                socket.emit('ident', { status: 409, message: 'File already got uploaded.' });
                return;
            }

            // Everything is safe
            socket.fileUpload = upload.id;

            socket.emit('ident', { status: 200 });
        });

        socket.on('initData', async data => {
            const { filesize } = data;
            console.log(filesize);

            if (socket.fileUpload === null) {
                socket.emit('initData', { status: 401, message: 'You\'re not identified! You need to call the \'ident\' event first.' });
                return;
            }

            if (filesize === undefined) {
                socket.emit('initData', { status: 400, message: 'You need to specify the total file size in byte.' });
                return;
            }

            /*if (!(/[A-Fa-f0-9]{128}/g.test(checksum))) {
                socket.emit('initData', { status: 400, message: 'Your checksum has be a valid SHA-512 hash.' });
                return;
            }*/

            const file = await prisma.fileUpload.findUnique({ where: { id: socket.fileUpload } });
            if (file === null) {
                socket.emit('initData', { status: 404, message: 'The document seems to vanished since your last call. Very strange. Quitting' });
                socket.disconnect();
                return;
            }

            await prisma.fileUpload.update({
                where: { id: socket.fileUpload },
                data: {
                    filesize,
                    uStarted: new Date()
                }
            });

            socket.initFinished = true;
            socket.filesize = filesize;
            socket.written = 0;

            await pullConfig();
            const filePath = join(resolve('.'), (await getConfig()).vaultPath, socket.fileUpload);

            // Open file
            console.log('Open file', filePath);
            open(filePath, 'a', (err, fd) => {
                if (err) {
                    socket.emit('initData', { status: 500, message: 'Cannot write to file.' });
                    return;
                }

                socket.fd = fd;
            });
            socket.emit('initData', { status: 200 });
        });

        socket.on('data', async data => {
            const binaryData = new Uint8Array(data);

            if (socket.fileUpload === null) {
                socket.emit('data', { status: 401, message: 'You\'re not identified! You need to call the \'ident\' event first.' });
                return;
            }

            if (!socket.initFinished) {
                socket.emit('data', { status: 401, message: 'You didn\'t initialized the upload yet! You need to call the \'initData\' event first.' });
                return;
            }

            if (socket.locked) {
                socket.emit('data', { status: 409, message: 'You\'ll need to wait for the data to be written.' });
                return;
            }

            socket.locked = true;

            // console.log('Would write ', binaryData.byteLength, ' byte');

            const buf = Buffer.from(binaryData);
            write(socket.fd, buf, 0, buf.length, null, async (err, written) => {
                if (err) {
                    socket.emit('data', { status: 500, message: 'Cannot write to file.' });
                    return;
                }

                socket.written += written;

                console.log(`Wrote ${socket.written} Byte of ${socket.filesize} (${(socket.written / socket.filesize * 100).toFixed(2)} %) ... (received: ${written} bytes)`);

                socket.locked = false;
                socket.emit('data', { status: 200 });
            });
        });

        // Usually I would know how much data I receive but since the file is getting encrypted on the fly
        // the client itself doesn't know how large the result will be. That why the client has to end the
        // transmission manually.
        socket.on('dataEnd', data => {
            console.log(`Received all data. Closing file...`);

            close(socket.fd, async (err) => {
                if (err) {
                    console.error(`There was an error on closing the file with id ${socket.fileUpload}:`, err);
                } else {
                    await prisma.fileUpload.update({
                        where: { id: socket.fileUpload },
                        data: {
                            uFinished: new Date(),
                            filesize: socket.written
                        }
                    });

                    socket.emit('dataEnd', { status: 200 });
                    socket.disconnect();
                }
            });
        });
    });

    res.socket.server.io = ioServer;

    res.end()
}

export const config = {
    api: {
        bodyParser: false
    }
}

export default ioHandler

interface ExtentedSocket extends Socket {
    fileUpload?: string;

    filesize?: number;
    written?: number;

    // File descriptor. If none is provided then no file is open.
    fd?: number;

    initFinished?: boolean;
    locked?: boolean;
}