import * as fsPromises from "fs/promises";
import copy from "rollup-plugin-copy";
import scss from "rollup-plugin-scss";
import { defineConfig, normalizePath, Plugin } from "vite";
import * as path from 'path'
import * as url from 'url'

const moduleVersion = process.env.MODULE_VERSION;
const githubProject = process.env.GH_PROJECT;
const githubTag = process.env.GH_TAG;

console.log(process.env.VSCODE_INJECTION);

export default defineConfig({
  build: {
    sourcemap: true,
    rollupOptions: {
      input: "src/ts/module.ts",
      // we build a single file with vite
      output: {
        dir: "dist/scripts",
        format: "es",
        entryFileNames: "module.js",
      },
    },
  },
  /**
  server: {
    watch: {
      ignored: (p) => {
        console.log("HERE")
        const relativePath = path.relative(
          path.resolve(url.fileURLToPath(import.meta.url), 'src'),
          p
        )
        return (
          relativePath !== '' &&
          relativePath !== 'src' &&
          !normalizePath(relativePath).startsWith('src/')
        )
      }
    }
  }, */
  plugins: [
    updateModuleManifestPlugin(),
    scss({
      output: "dist/style.css",
      sourceMap: true,
      watch: ["src/styles/*.scss"],
    }),
    copy({
      targets: [
        { src: "src/languages", dest: "dist" },
        { src: "src/templates", dest: "dist" },
        { src: "src/img", dest: "dist" },
      ],
      hook: "writeBundle",
    }),
  ],
});

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
      const manifestJson = JSON.parse(manifestContents) as Record<
        string,
        unknown
      >;
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