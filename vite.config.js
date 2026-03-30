import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import javascriptObfuscator from 'vite-plugin-javascript-obfuscator';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Obfusca solo los archivos del motor en producción (no afecta dev)
    javascriptObfuscator({
      apply: 'build',        // solo en `npm run build`, nunca en dev
      debugProtection: false,
      include: [
        '**/src/engine/optimizer.js',
        '**/src/engine/maxrects.js',
        '**/src/engine/stripPacker.js',
        '**/src/engine/optimizer.worker.js',
      ],
      options: {
        // Renombra variables, funciones y clases con nombres ilegibles
        identifierNamesGenerator: 'hexadecimal',
        // Ofusca strings literales
        stringArray: true,
        stringArrayThreshold: 0.75,
        // NO activar rotateStringArray ni selfDefending → rompe Web Workers
        rotateStringArray: false,
        selfDefending: false,
        // Agrega código basura para confundir el análisis
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.2,
        // Shuffle el orden de propiedades y declaraciones
        transformObjectKeys: true,
        // Ofusca números literales
        numbersToExpressions: true,
        // Elimina comentarios
        disableConsoleOutput: false,
        compact: true,
      },
    }),
  ],
});

