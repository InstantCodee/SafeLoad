/**
 * This function capitalizes the very first char in a string.
 */
export function capitalizeFirst(str: string) {
    return str.replace(/^\w/, c => c.toUpperCase());
};

/**
 * Merges two buffers
 * Source: https://gist.github.com/72lions/4528834
 *
 * @param buffer1 The first buffer.
 * @param buffer2 The second buffer.
 * @return The new ArrayBuffer created out of the two.
 */
export function mergeBuffers(buffer1: Buffer, buffer2: Buffer): Buffer {
    var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
    tmp.set(new Uint8Array(buffer1), 0);
    tmp.set(new Uint8Array(buffer2), buffer1.byteLength);

    return Buffer.from(tmp.buffer);
};

/**
 * Takes a buffer and converts him to a Base64 string.
 * @param buf Buffer to convert
 * @returns Base64
 */
export function bufferToBase64(buf: Buffer): string {
    var binstr = Array.prototype.map.call(buf, function (ch) {
        return String.fromCharCode(ch);
    }).join('');

    return btoa(binstr);
}

/**
 * Takes a Base64 string and converts him into a buffer.
 * @param base64 Target Base64 string
 * @returns Buffer
 */
export function base64ToBuffer(base64: string): Buffer {
    var binstr = atob(base64);
    var buf = new Uint8Array(binstr.length);
    Array.prototype.forEach.call(binstr, function (ch, i) {
        buf[i] = ch.charCodeAt(0);
    });

    return Buffer.from(buf.buffer);
}