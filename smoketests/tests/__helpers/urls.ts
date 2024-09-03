import assert from "assert";

assert(process.env.SMOKETESTS_SUBMIT_LAYER_URL, 'SMOKETESTS_SUBMIT_LAYER_URL is not set');
assert(process.env.SMOKETESTS_DIRECT_SUBMIT_URL, 'SMOKETESTS_DIRECT_SUBMIT_URL is not set');

const SUBMIT_LAYER_URL = process.env.SMOKETESTS_SUBMIT_LAYER_URL;
const DIRECT_SUBMIT_URL = process.env.SMOKETESTS_DIRECT_SUBMIT_URL;

export { DIRECT_SUBMIT_URL, SUBMIT_LAYER_URL };
