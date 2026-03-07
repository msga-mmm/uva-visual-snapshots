import { defineConfig } from "vite";
import { createReportUiBuildConfig } from "./src/report-ui-vite.js";

export default defineConfig(createReportUiBuildConfig(process.cwd()));
