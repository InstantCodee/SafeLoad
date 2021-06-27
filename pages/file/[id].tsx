import { GetServerSideProps } from 'next';
import { useRouter } from 'next/dist/client/router'
import { decrypt, readMessage } from 'openpgp';
import { useForm } from 'react-hook-form';
import prisma from '../../lib/prisma'
import { bufferToBase64 } from '../../lib/utils';

const FileDownload = ({ file, password }) => {
    const router = useRouter()
    const { id } = router.query;
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const onSubmit = async (data) => {
        console.log(data);

        const res = await fetch('http://localhost:3000/api/file/' + id, { method: 'POST' });
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
            }, error => {
                console.error('Couldn\' decrypt proof!', error);
            });
        }, error => {
            console.error('Something went wrong I can fell it:', error)
        });
    }

    if (id === undefined) {
        return (
            <div>
                <h1>Your id is undefined</h1>
            </div>
        )
    }

    return (
        <div>
            <h1>Your download</h1>
            <p>File with id: {id}</p>
            <pre>
                Password: {password}
            </pre>
            <form id="initUploadForm" onSubmit={handleSubmit(onSubmit)}>
                <input type="password" placeholder="Password" {...register('password')} /><br />
                <button type="submit">Download</button>
            </form>
        </div>
    )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const res = await fetch(`http://localhost:3000/api/file/${context.query.id.toString()}`);
    const file = await res.json();

    console.log(context.query);


    return {
        props: { file }
    }
}

export default FileDownload
