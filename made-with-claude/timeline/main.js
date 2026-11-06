// Boot: wait for fonts, build every scene, then draw whatever time Hyperframes seeks to.
import { createEngine } from "./engine.js";
import voidScene from "../scenes/01-void.js";
import title from "../scenes/02-title.js";
import build from "../scenes/03-build.js";
import hero from "../scenes/04-hero.js";
import stack from "../scenes/05-stack.js";
import data from "../scenes/06-data.js";
import climax from "../scenes/07-climax.js";
import end from "../scenes/08-end.js";

const modules = { void: voidScene, title, build, hero, stack, data, climax, end };

let engine = null;
let pending = 0;

window.addEventListener("hf-seek", (e) => {
  pending = e.detail.time;
  if (engine) engine.renderAt(pending);
});

(async () => {
  try {
    await Promise.all([
      document.fonts.load('700 100px "MWC Display"'),
      document.fonts.load('500 100px "MWC Display"'),
      document.fonts.load('400 100px "MWC Mono"'),
      document.fonts.load('700 100px "MWC Mono"'),
    ]);
    const dom = {
      tagline: document.getElementById("tagline"),
      taglineText: document.querySelector("#tagline .text"),
      taglineCursor: document.querySelector("#tagline .cursor"),
      flash: document.getElementById("flash"),
      black: document.getElementById("black"),
    };
    engine = await createEngine({
      canvas: document.getElementById("stage"),
      modules,
      dom,
      stats: window.MWC_STATS,
    });
    window.__mwc = engine;
    engine.renderAt(pending);
    window.__mwcReady();
  } catch (err) {
    console.error(err);
    window.__mwcFail(err);
  }
})();
