/**
 * This function capitalizes the very first char in a string.
 */
export function capitalizeFirst(str: string) {
    return str.replace(/^\w/, c => c.toUpperCase());
};