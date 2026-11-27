type ImportMetaWithEnv = ImportMeta & { env?: { DEV?: boolean; VITE_BUILD?: string } };

const env = (import.meta as ImportMetaWithEnv).env;
const isDev = env?.DEV === true;
const isCanary = env?.VITE_BUILD === 'canary';

export const APP_ID = isCanary ? 'com.emdash.canary' : 'com.emdash.stable';
export const PRODUCT_NAME = isCanary ? 'ply Canary' : 'ply';
export const APP_NAME_LOWER = isCanary ? 'ply-canary' : 'ply';
export const LINUX_DESKTOP_ID = isCanary ? 'ply-canary' : 'ply';
// Keep existing profiles and databases discoverable after the product rename.
export const USER_DATA_DIR_NAME = isDev ? 'emdash-dev' : isCanary ? 'emdash-canary' : 'emdash';
export const UPDATE_CHANNEL = isCanary ? 'v1-canary' : 'v1-stable';
export const ARTIFACT_PREFIX = isCanary ? 'ply-canary' : 'ply';
export const IS_CANARY = isCanary;
