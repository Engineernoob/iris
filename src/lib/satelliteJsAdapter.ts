import { twoline2satrec } from "../../node_modules/satellite.js/dist/io.js";
import { gstime, propagate } from "../../node_modules/satellite.js/dist/propagation.js";
import type { SatRec } from "../../node_modules/satellite.js/dist/propagation/SatRec.js";
import { degreesLat, degreesLong, eciToGeodetic } from "../../node_modules/satellite.js/dist/transforms.js";

/*
 * satellite.js v7 only exports a top-level barrel that re-exports its WASM runtime.
 * In the browser bundle that pulls node:module and node:worker_threads, so keep
 * the JS-only deep imports isolated here until the package exposes a browser-safe
 * subpath or we replace/pin the dependency.
 */
export { degreesLat, degreesLong, eciToGeodetic, gstime, propagate, twoline2satrec };
export type { SatRec };
