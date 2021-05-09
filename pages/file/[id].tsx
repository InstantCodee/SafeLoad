import { GetServerSideProps } from 'next';
import { useRouter } from 'next/dist/client/router'
import prisma from '../../lib/prisma'

const FileDownload = ({ file }) => {
    const router = useRouter()
    const { id } = router.query;

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
            <p>File with id: { id }</p>
            <pre>
                Created at: { file.createdAt }
            </pre>
        </div>
    )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    const res = await fetch(`http://localhost:3000/api/file/${context.query.id.toString()}`);
    const file = await res.json();

    return {
        props: { file }
    }
}

export default FileDownload
