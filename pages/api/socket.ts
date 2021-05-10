import { join, resolve } from 'path';
import { Server, Socket } from 'socket.io';
import getConfig, { pullConfig } from '../../lib/config';

import prisma from '../../lib/prisma';

const ioHandler = async (req, res) => {
    if (res.socket.server.io) {
        res.end();
        return;
    }
    console.log('*First use, starting socket.io')

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
                socket.emit('initData', { status: 400, message: 'You need to specify the total file size in KB.' });
                return;
            }

            const file = await prisma.fileUpload.findUnique({ where: { id: socket.fileUpload } });
            if (file === null) {
                socket.emit('initData', { status: 404, message: 'The document seems to vanished while your last call. Very strange. Quitting' });
                socket.disconnect();
                return;
            }

            file.filesize = filesize;
            file.uStarted = new Date();

            socket.initFinished = true;
            socket.filesize = filesize;
            socket.written = 0;
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

            await pullConfig();
            
            const filePath = join(resolve('.'), getConfig().vaultPath, socket.fileUpload);
            socket.locked = true;

            console.log('Would write ', binaryData.byteLength, ' KB to:', filePath);

            socket.written += binaryData.byteLength;

            console.log(`Wrote ${socket.written} KB of ${socket.filesize} ...`);

            socket.locked = false;

            if (socket.written >= socket.filesize) {
                socket.emit('data', { status: 200, message: 'All data has been written. Quitting' });
                socket.disconnect();

                return;
            }

            socket.emit('data', { status: 200 });
        });

        // Usually I would know how much data I receive but since the file is getting encrypted on the fly
        // the client itself doesn't know how large the result will be. That why the client has to end the
        // transmission manually.
        socket.on('dataEnd', data => {
            socket.emit('dataEnd', { status: 200 });
            socket.disconnect();
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

    filesize: number;
    written: number;

    initFinished: boolean;
    locked?: boolean;
}