# Landing Page (Astro) — Resumen

Este documento resume la implementación de la landing page para **Harmony** (desktop music manager), alojada en `page/` dentro del repositorio principal.

## Objetivo

- Crear un sitio estático moderno y responsive con **Astro**
- Soportar **ES/EN** con toggle de idioma en cliente
- Soportar **modo claro/oscuro** con persistencia
- Publicar en **GitHub Pages**: `https://jvegaf.github.io/harmony/`
- Enlazar descargas a **GitHub Releases**

## Estructura principal

```
page/
├── src/
│   ├── pages/index.astro
│   ├── layouts/Layout.astro
│   ├── components/
│   │   ├── Navbar.astro
│   │   ├── Hero.astro
│   │   ├── Features.astro
│   │   ├── Screenshots.astro
│   │   ├── Download.astro
│   │   └── Footer.astro
│   ├── styles/global.css
│   └── i18n/translations.ts
├── public/assets/ (screenshots + logo)
├── astro.config.mjs
└── postcss.config.mjs
```

## Funcionalidades clave

- **Bilingüe ES/EN**: strings centralizados en `src/i18n/translations.ts`
- **Modo claro/oscuro**: CSS variables + `data-theme` con persistencia en `localStorage`
- **Responsive**: diseño mobile-first con breakpoints 640/768/1024
- **Secciones**: hero, features, screenshots, download CTA, footer
- **Accesibilidad básica**: contraste, navegación clara, CTA visibles

## Configuración y despliegue

- `astro.config.mjs` usa `base: '/harmony/'` para GitHub Pages
- Workflow: `.github/workflows/deploy-pages.yml` publica en GH Pages al hacer push a `main` cuando cambie `page/**`

### Comandos

```bash
cd page
npm run dev       # desarrollo local
npm run build     # build estático
```

## Assets

Los assets se sirven desde `page/public/assets/`.

## Notas importantes

- **AIDEV-NOTE:** Se añadió `page/postcss.config.mjs` vacío para evitar que Vite/Astro hereden el `postcss-preset-mantine` del proyecto raíz, lo cual rompía el build de la landing.
- `page/dist/` y `page/node_modules/` están ignorados por el `.gitignore` global.
