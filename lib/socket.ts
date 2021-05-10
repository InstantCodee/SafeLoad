import { resolve, join } from 'path';
import ws from 'ws';
import fs from 'fs';
import io from 'socket.io';
import prisma from './prisma';
import getConfig from './config';

let running = false;

export function initWS(server) {
    if (running) return;
}

interface ExtentedSocket extends io.Socket {
    fileUpload?: string;

    filesize: number;
    written: number;
    
    initFinished: boolean;
    locked?: boolean;
}