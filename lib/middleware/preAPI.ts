import { NextApiRequest, NextApiResponse } from "next";
import { NextMiddleware, use } from "next-api-middleware";
import { pullConfig } from "../config";

/**
 * This is a middleware used to init all necessary parts like config and socket.io.
 */
export const _preAPI: NextMiddleware = async (req: NextApiRequest, res: NextApiResponse, next) => {
    await pullConfig();
    await fetch('http://localhost:3000/api/socket');

    await next();
}

const preAPI = use(_preAPI);

export default preAPI;