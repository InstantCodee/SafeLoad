import Meta from './Meta'

const Layout = ({ children }) => {
    return (
        <>
            <Meta />
            <div>
                <main>
                    {children}
                </main>
            </div>
        </>
    )
}

export default Layout
