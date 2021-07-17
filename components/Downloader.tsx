const Downloader = ({ filename, mime, filesize, uploadDate }) => {
    return (
        <div>
            <h3 id='dl-filename'>{filename}</h3>
            <p id='dl-mime'>{mime}</p>
            <p id='dl-filesize'>{filesize}</p>
            <p id='dl-uploaddate'>{uploadDate}</p>
        </div>
    )
}

Downloader.defaultProps = {
    filename: 'Decryption required.txt',
    mime: 'application/json',
    filesize: 0,
    uploadDate: 0
};

export default Downloader