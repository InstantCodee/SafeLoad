import Meta from './Meta'
import styles from '../styles/Layout.module.scss';

const Layout = ({ children }) => {
    return (
        <>
            <Meta />
            <div>
                <main>
                    {children}
                </main>
            </div>
            <div className={styles.footer}>
                <span><small>Alpha - v1.0</small></span>
                <span><span className={styles.quote}>"Ignorance is strength"</span> ― George Orwell, 1984</span>
            </div>
        </>
    )
}

export default Layout
