import { verify } from 'jsonwebtoken';
import moment from 'moment';
import { GetServerSideProps } from 'next';
import { useRouter } from 'next/dist/client/router';
import { decrypt, readMessage } from 'openpgp';
import { useForm } from 'react-hook-form';
import Downloader from '../../components/Downloader';
import Uploader from '../../components/Uploader';

import prisma from '../../lib/prisma';
import { bufferToBase64 } from '../../lib/utils';
import styles from '../../styles/Download.module.scss';

const FileDownload = ({ found, unlock, downloadData }) => {
    const router = useRouter()
    const { id } = router.query;
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    let downloadToken: string = null;

    const checkStorage = async () => {
        const storageId = `token-${id}`;

        // Check if we already got a token.
        if (sessionStorage.getItem(storageId) !== null) {
            // Quickly verify if the token is still valid. We ignore if the signature is valid because if this here fails,
            // then the server will tell us that but this here will prevent useless API calls.
            const payload = sessionStorage.getItem(storageId).split('.')[1];
            if (payload === undefined) {
                console.debug('Got invalid jwt token. Ignore.');
                sessionStorage.removeItem(storageId);
                sessionStorage.removeItem('pw-' + id);
            } else {
                const payloadJSON = JSON.parse(atob(payload));
                const currentTime = moment().unix();

                console.log(`${currentTime} <-> ${payloadJSON.exp}`);

                if (currentTime > payloadJSON.exp) {
                    console.debug('Stored token is no longer valid. It expired ' + moment(payloadJSON.exp * 1000).fromNow() + '.');
                    sessionStorage.removeItem(storageId);
                } else {
                    // Everything set.
                    downloadToken = sessionStorage.getItem(storageId);
                    console.debug('Valid (in terms of date) token was found! Skip password prompt.\nNote: Token will expire in ' + moment(payloadJSON.exp * 1000).fromNow());

                    const res = await fetch('http://localhost:3000/api/file/' + id, {
                        method: 'POST',
                        headers: {
                            authorization: downloadToken
                        }
                    });

                    console.log(await res.json());
                }
            }
        } else {
            console.debug('No token was found');
        }
    }

    const onSubmit = async (data) => {
        // No need to get token if we already got one.
        if (downloadToken !== null) return;

        // We don't have any valid token yet, so we get the encrypted proof to get one.
        const res = await fetch('http://localhost:3000/api/file/' + id, {
            method: 'POST'
        });

        const encryptedProof = await (await res.blob()).arrayBuffer();

        console.debug('Acquired encrypted proof: ', encryptedProof);

        readMessage({ binaryMessage: Buffer.from(encryptedProof) }).then(async encryptedProofMessage => {
            console.debug('Start decrypting proof ...');
            console.time('dec');

            decrypt({
                message: encryptedProofMessage,
                passwords: [data.password],
                format: 'binary'
            }).then(async decryptedProof => {
                console.timeEnd('dec');
                console.debug('Decrypted proof:', decryptedProof);

                console.log('Send:', JSON.stringify({ proof: bufferToBase64(Buffer.from(decryptedProof.data)) }));

                const newRes = await fetch('http://localhost:3000/api/file/' + id, {
                    method: 'POST',
                    headers: {
                        'Content-Type': "application/json"
                    },
                    body: JSON.stringify({ proof: bufferToBase64(Buffer.from(decryptedProof.data)) })
                });

                const { token } = await newRes.json();

                // Store received token in session storage.
                sessionStorage.setItem('token-' + id, token);

                // We have to store the password for a short amount of time, so that it survives a reload.
                sessionStorage.setItem('pw-' + id, data.password);

                const currURL = new URL(window.location.href);
                
                window.location.href = `${currURL.protocol}//${currURL.hostname}:${currURL.port}${currURL.pathname}?t=${token}`;

            }, error => {
                console.error('Couldn\' decrypt proof!', error);
            });
        }, error => {
            console.error('Something went wrong, I can fell it:', error)
        });
    }

    if (typeof window !== 'undefined') {
        checkStorage();

        if (downloadData !== null) {
            // Decrypt file name
            const dlFilename = document.getElementById('dl-filename');

            const armoredMessage = `-----BEGIN PGP MESSAGE-----

${downloadData.filename}
-----END PGP MESSAGE-----`;

            readMessage({ armoredMessage }).then(message => {
                decrypt({
                    message,
                    passwords: [sessionStorage.getItem('pw-' + id)]
                }).then(async decryptedProof => {
                    dlFilename.innerHTML = decryptedProof.data.toString();
                });
            });            
        }
    }

    // If document was not found
    if (!found) {
        return (
            <div>
                <h1>File not found</h1>
            </div>
        )
    }

    if (unlock) {
        return <div>
            <div className={styles.form}>
                <Downloader filename={downloadData.filename} />
            </div>
        </div>
    }

    return (<>
        <div>
            <div className={styles.form}>
                <p>Enter your password for decryption</p>
                <form id="initUploadForm" onSubmit={handleSubmit(onSubmit)}>
                    <input type="password" placeholder="Password" {...register('password')} /><br />
                    <button type="submit">Decrypt</button>
                </form>
            </div>
            <div className={styles.passbox}></div>
        </div>
        <div className={styles.download}>

        </div>
    </>)
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const fileId = context.query.id.toString();
    const token = context.query.t;

    let unlock = false;
    let downloadData = null;

    if (token !== undefined) {
        try {
            verify(token.toString(), process.env.JWT_SECRET);
            unlock = true;

            // Fetch document data
            const res = await fetch('http://localhost:3000/api/file/' + fileId, {
                headers: {
                    'authorization': token.toString()
                },
                method: 'POST'
            });
            const resJSON = await res.json();
            console.log(resJSON, res.status);            

            downloadData = resJSON;
        } catch (err) {
            // Ignore and continue as if nothing happend...
        }
    }

    const db = await prisma.fileUpload.count({
        where: { id: fileId }
    });

    console.log(db);

    return {
        props: {
            found: db === 1,
            unlock,
            downloadData
        }
    }
}

export default FileDownload
