import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import remarkToc from "remark-toc";
import sitemap from "@astrojs/sitemap";
import { SITE } from "./src/config";
import * as fs from 'fs';

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
    sitemap(),
  ],
  markdown: {
    remarkPlugins: [
      remarkToc,
      () => {
        return (tree) => {
          tree.children.forEach((heading, i) => {
            if (heading.type === 'heading' && 'value' in heading.children[0] && heading.children[0].value === 'Development Calculator') { // TODO: ensure that this child is of type text to supress error (logically it always should be)
              const content = fs.readFileSync('./src/widgets/development_calculator.html', 'utf8');
              tree.children[i] = {
                type: 'html',
                value: content,
              };
            }
          });
        }
      },
    ],
    shikiConfig: {
      // For more themes, visit https://shiki.style/themes
      themes: { light: "min-light", dark: "night-owl" },
      wrap: true,
    },
  },
  vite: {
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  scopedStyleStrategy: "where",
  experimental: {
    contentLayer: true,
  },
});
