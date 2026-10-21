import packageJson from "../../package.json";

/**
 * Application package version.
 * This is independent of the deployed contract version, schema, and evaluation policy.
 */
export const APP_VERSION: string = packageJson.version;
