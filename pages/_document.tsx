import Document, { Html, Head, Main, NextScript } from 'next/document'
import { pullConfig } from '../lib/config';

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx)

    // This is kinda hacky but I somehow have to kick-off the socket.io server.
    // So this will only happen on the very first site load.
    fetch('http://localhost:3000/api/socket');
    pullConfig();
    return { ...initialProps }
  }

  render() {
    return (
      <Html>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument