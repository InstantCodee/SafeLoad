export interface IDownloadToken {
    action: string;     // Stores permitted action. There is currently only 'download' but this may change in the future.
    file: string;       // File where permission was set to.
    ip: string;
}