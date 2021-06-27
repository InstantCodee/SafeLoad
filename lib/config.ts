import { Settings } from '.prisma/client';
import prisma from './prisma';

let config: Settings | undefined;

/**
 * 
 * @returns Local config
 */
export default async function getConfig() {
    if (config === undefined) {
        return pullConfig();
    }
    
    return config;
}

/**
 * This will update the cached config.
 */
export async function pullConfig() {    
    return await prisma.settings.findFirst({ where: { id: 1 } });
}

/**
 * Replace config in database with local one.
 * @param newConfig New config that will override the old one.
 * @returns New config
 */
export async function pushConfig(newConfig: Settings) {
    return await prisma.settings.update({ where: { id: 1 }, data: newConfig });
}