import { User } from ".prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import { NextMiddleware, use } from "next-api-middleware";
import prisma from "../prisma";
import preAPI, { _preAPI } from "./preAPI";

export interface SafeLoadRequest extends NextApiRequest {
    user?: User
};

/**
 * This middleware takes a users cookie and checks if it's valid.
 */
const _authenticate: NextMiddleware = async (req: NextApiRequest, res: NextApiResponse, next) => {
    if (req.cookies.auth === undefined) {
        res.redirect('/user/login');
        return;
    }

    const session = prisma.userSession.findFirst({ where: { id: req.cookies.auth } });
    const resolvedSession = await session;
    
    if (resolvedSession === undefined) {
        res.redirect('/user/login');
        return;
    }

    // Convert normal request to custom one to store the user inside the object.
    const slReq: SafeLoadRequest = req;
    slReq.user = await session.user();

    req = slReq;

    await next();
}

/**
 * This will make sure that the "preAPI" call is always called upfront.
 * The underscore means that this is the direct function that is not wrapped inside the use(...) functions.
 */
const authenticate = use(
    _preAPI,
    _authenticate
)

export default authenticate;