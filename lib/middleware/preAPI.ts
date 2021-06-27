import { NextApiRequest, NextApiResponse } from "next";
import { NextMiddleware, use } from "next-api-middleware";
import getConfig from "../config";

/**
 * This is a middleware used to init all necessary parts like config and socket.io.
 */
export const _preAPI: NextMiddleware = async (req: NextApiRequest, res: NextApiResponse, next) => {
    await getConfig();                                  // This will pull the config if not loaded yet.
    await fetch('http://localhost:3000/api/socket');    // This will init the socket server once.

    await next();
}

const preAPI = use(_preAPI);

export default preAPI;