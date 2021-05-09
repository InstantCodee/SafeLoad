import { NextApiRequest, NextApiResponse } from "next";
import getConfig, { pullConfig } from "../../lib/config";
import prisma from "../../lib/prisma";

export default async function handle(req: NextApiRequest, res: NextApiResponse) {
    let config = await getConfig();

    if (config === undefined) {
        config = await pullConfig();
    }

    res.status(200).json(config);
}