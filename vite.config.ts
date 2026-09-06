import * as fsPromises from "fs/promises";
import copy from "rollup-plugin-copy";
import { defineConfig, mergeConfig, Plugin } from "vite";
import { fileURLToPath, URL } from 'node:url'
import vueAppConfig from './src/vue/vite.config.ts'

const moduleVersion = process.env.MODULE_VERSION;
const githubProject = process.env.GH_PROJECT;
const githubTag = process.env.GITHUB_REF_NAME;

export default mergeConfig(

  defineConfig({
    build: {
      // minify: false,
      sourcemap: true,
      rollupOptions: {
        input: "src/ts/module.ts",
        // we build a single file with vite
        output: {
          // asset/entry file names below are relative to `dir`, and Rollup
          // won't allow "../" in them, so `dir` has to be the dist root
          // (not dist/scripts) for the CSS asset to land at dist/style.css.
          dir: "dist",
          format: "es",
          entryFileNames: "scripts/module.js",
          // Vite handles the "../styles/main.scss" import natively (via the
          // `sass` package) and emits it as a CSS asset alongside module.js.
          // rollup-plugin-scss used to be relied on to write dist/style.css
          // (which module.json references), but Vite's own CSS pipeline runs
          // first and produces its own hashed asset instead - the plugin's
          // output was silently going stale. Force the CSS asset's name/path
          // directly so it lands where module.json expects it.
          assetFileNames: (assetInfo) =>
            assetInfo.names?.[0]?.endsWith(".css") ? "style.css" : "scripts/assets/[name]-[hash][extname]",
        },
      },
    },
    plugins: [
      updateModuleManifestPlugin(),
      copy({
        targets: [
          { src: "src/languages", dest: "dist" },
          { src: "src/templates", dest: "dist" },
          { src: "src/img", dest: "dist" },
          { src: "src/font", dest: "dist" },
          { src: "src/data", dest: "dist" }
        ],
        hook: "writeBundle",
      })
    ],
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
  }),
  vueAppConfig
)

function updateModuleManifestPlugin(): Plugin {
  return {
    name: "update-module-manifest",
    async writeBundle(): Promise<void> {
      const packageContents = JSON.parse(
        await fsPromises.readFile("./package.json", "utf-8")
      ) as Record<string, unknown>;
      const version = moduleVersion || (packageContents.version as string);
      const manifestContents: string = await fsPromises.readFile(
        "src/module.json",
        "utf-8"
      );
      const manifestJson = JSON.parse(manifestContents) as Record<string, unknown>;
      manifestJson["version"] = version;
      if (githubProject) {
        const baseUrl = `https://github.com/${githubProject}/releases`;
        manifestJson["manifest"] = `${baseUrl}/latest/download/module.json`;
        if (githubTag) {
          manifestJson[
            "download"
          ] = `${baseUrl}/download/${githubTag}/module.zip`;
        }
      }
      await fsPromises.writeFile(
        "dist/module.json",
        JSON.stringify(manifestJson, null, 4)
      );
    },
  };
}