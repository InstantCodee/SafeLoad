import Uploader from '../components/Uploader';
import styles from '../styles/Index.module.scss';

function HomePage({ c, chunkSize }) {
    return <div>

        
        <a href="/user/login" className={styles.userButton}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#fff" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <circle cx="12" cy="7" r="4" />
                <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
            </svg>
        </a>
        <div  className={styles.grid}>
            <h1 className={styles.brand}>SafeLoad</h1>
        </div>

        <Uploader c={c} chunkSize={chunkSize} />

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