/// <reference types="vite/client" />

// Declaración para importar CSS como string (Vite inline import)
declare module '*.css?inline' {
  const content: string;
  export default content;
}
