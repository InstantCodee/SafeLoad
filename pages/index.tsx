import Uploader from '../components/Uploader';
import styles from '../styles/Index.module.scss';

function HomePage({ c, chunkSize }) {
    return <div>
        <svg className={styles.bottom} xmlns="http://www.w3.org/2000/svg" width="1920" height="405" fill="none" viewBox="0 0 1920 405">
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
        <svg className={styles.top} xmlns="http://www.w3.org/2000/svg" width="1920" height="798" fill="none" viewBox="0 0 1920 798">
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