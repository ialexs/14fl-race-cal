import { stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const csvPath = fileURLToPath(new URL("./public/races.csv", import.meta.url));
const moduleId = "virtual:race-data-updated";
const resolvedModuleId = `\0${moduleId}`;

export default defineConfig({
  plugins: [
    {
      name: "race-data-updated",
      resolveId(id) {
        if (id === moduleId) return resolvedModuleId;
      },
      async load(id) {
        if (id !== resolvedModuleId) return;
        this.addWatchFile(csvPath);
        const { mtime } = await stat(csvPath);
        return `export default ${JSON.stringify(mtime.toISOString())};`;
      },
      handleHotUpdate({ file, server }) {
        if (file !== csvPath) return;
        const module = server.moduleGraph.getModuleById(resolvedModuleId);
        if (module) server.moduleGraph.invalidateModule(module);
        server.ws.send({ type: "full-reload" });
        return [];
      },
    },
  ],
});
