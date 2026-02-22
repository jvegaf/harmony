export type Lang = 'en' | 'es';

export const translations = {
  en: {
    // Navbar
    nav: {
      features: 'Features',
      screenshots: 'Screenshots',
      download: 'Download',
    },
    // Hero
    hero: {
      tagline: 'Music Manager for Old-School DJs',
      description:
        'Harmony is a powerful desktop music manager built for DJs who love their craft. Organize your collection, auto-tag tracks, detect duplicates, and stay in sync with Traktor — all from one fast, keyboard-friendly app.',
      cta_download: 'Download',
      cta_github: 'View on GitHub',
    },
    // Features
    features: {
      title: 'Everything you need to manage your collection',
      subtitle:
        'Built by a DJ, for DJs. Every feature is designed to save time and keep your library in perfect shape.',
      items: [
        {
          title: 'Music Library',
          description:
            'Manage your entire collection with a high-performance grid, waveform player, star ratings, and instant Ctrl+K search.',
        },
        {
          title: 'Smart Auto-Tagging',
          description:
            'Automatically tag tracks from Beatport, Traxsource, and Bandcamp with intelligent fuzzy matching and confidence scoring.',
        },
        {
          title: 'Audio Analysis',
          description:
            'Detect BPM and musical key automatically using parallel worker threads powered by essentia.js — fast and accurate.',
        },
        {
          title: 'Duplicate Finder',
          description:
            'Find and clean duplicate tracks with side-by-side waveform comparison, smart suggestions, and bulk deletion.',
        },
        {
          title: 'Traktor Integration',
          description:
            'Bidirectional sync with Traktor NML files. Import and export tracks, hot cues, loops, and full playlist hierarchies.',
        },
        {
          title: 'Set Preparation',
          description:
            'Keyboard-driven workflow to rapidly curate tracks for your next set. Press K to keep, D to skip — that simple.',
        },
        {
          title: 'Beatport Recommendations',
          description:
            'Discover new music similar to tracks in your collection directly from Beatport, right inside the app.',
        },
        {
          title: 'Cross-Platform',
          description:
            'Native desktop app for Windows, Linux, and macOS. Runs fast and offline — no cloud, no subscriptions.',
        },
      ],
    },
    // Screenshots
    screenshots: {
      title: 'See it in action',
      subtitle: 'A modern interface designed for speed and efficiency, with full light and dark mode support.',
      items: [
        {
          title: 'Music Library',
          description:
            'Browse your entire collection in a high-performance data grid. The waveform player at the top lets you preview tracks instantly, while the sidebar keeps your playlists organized and accessible.',
        },
        {
          title: 'Track Editor',
          description:
            'Edit all your track metadata in one place. Full cover art display, filename-to-tag extraction, direct links to Beatport and Traxsource, and quick actions to clean up your tags in seconds.',
        },
        {
          title: 'Smart Auto-Tagging',
          description:
            'Search across Beatport, Traxsource, and Bandcamp simultaneously. Review match candidates with scores, cover art, BPM, key, and label — then confirm with one click.',
        },
        {
          title: 'Duplicate Finder',
          description:
            'Detect duplicates across your collection using configurable fuzzy matching. Compare waveforms side by side, let the system suggest which to keep, and free up disk space in bulk.',
        },
        {
          title: 'Traktor Sync',
          description:
            'Deep integration with Traktor Pro. Preview changes before applying, choose your merge strategy, and keep hot cues, loops, and playlists perfectly in sync between both libraries.',
        },
        {
          title: 'Beatport Recommendations',
          description:
            'Find new tracks to add to your sets. Harmony fetches similar track recommendations from Beatport based on tracks already in your collection and lets you open them directly.',
        },
      ],
    },
    // Download
    download: {
      title: 'Ready to organize your collection?',
      subtitle: 'Download Harmony for free and take control of your music library today.',
      button: 'Download Latest Release',
      platforms: 'Available for Windows, Linux and macOS',
      github_link: 'View releases on GitHub →',
    },
    // Footer
    footer: {
      tagline: 'Music Manager for Old-School DJs',
      built_by: 'Built with ♥ by',
      author: 'Jose Vega',
      license: 'MIT License',
      github: 'GitHub',
      issues: 'Report an Issue',
    },
  },
  es: {
    // Navbar
    nav: {
      features: 'Características',
      screenshots: 'Capturas',
      download: 'Descargar',
    },
    // Hero
    hero: {
      tagline: 'Gestor de música para DJs de toda la vida',
      description:
        'Harmony es un potente gestor de música para escritorio diseñado para DJs que aman su trabajo. Organiza tu colección, etiqueta tracks automáticamente, detecta duplicados y mantén la sincronía con Traktor — todo desde una app rápida y accesible desde el teclado.',
      cta_download: 'Descargar',
      cta_github: 'Ver en GitHub',
    },
    // Features
    features: {
      title: 'Todo lo que necesitas para gestionar tu colección',
      subtitle:
        'Creado por un DJ, para DJs. Cada función está diseñada para ahorrar tiempo y mantener tu librería en perfectas condiciones.',
      items: [
        {
          title: 'Librería Musical',
          description:
            'Gestiona toda tu colección con una tabla de alto rendimiento, reproductor de forma de onda, valoraciones por estrellas y búsqueda instantánea con Ctrl+K.',
        },
        {
          title: 'Auto-Etiquetado Inteligente',
          description:
            'Etiqueta tracks automáticamente desde Beatport, Traxsource y Bandcamp con coincidencia difusa inteligente y puntuación de confianza.',
        },
        {
          title: 'Análisis de Audio',
          description:
            'Detecta BPM y tonalidad musical automáticamente usando hilos de trabajo paralelos con essentia.js — rápido y preciso.',
        },
        {
          title: 'Buscador de Duplicados',
          description:
            'Encuentra y limpia tracks duplicados con comparación de formas de onda en paralelo, sugerencias inteligentes y eliminación masiva.',
        },
        {
          title: 'Integración con Traktor',
          description:
            'Sincronización bidireccional con archivos NML de Traktor. Importa y exporta tracks, hot cues, loops y jerarquías completas de playlists.',
        },
        {
          title: 'Preparación de Sets',
          description:
            'Flujo de trabajo guiado por teclado para preparar rápidamente los tracks de tu próximo set. Pulsa K para quedártelo, D para saltarlo — así de simple.',
        },
        {
          title: 'Recomendaciones de Beatport',
          description:
            'Descubre nueva música similar a los tracks de tu colección directamente desde Beatport, dentro de la propia app.',
        },
        {
          title: 'Multiplataforma',
          description:
            'App de escritorio nativa para Windows, Linux y macOS. Rápida y sin conexión — sin nube ni suscripciones.',
        },
      ],
    },
    // Screenshots
    screenshots: {
      title: 'Mírala en acción',
      subtitle:
        'Una interfaz moderna diseñada para la velocidad y la eficiencia, con soporte completo de modo claro y oscuro.',
      items: [
        {
          title: 'Librería Musical',
          description:
            'Navega por toda tu colección en una tabla de datos de alto rendimiento. El reproductor de forma de onda en la parte superior te permite preescuchar tracks al instante, mientras la barra lateral mantiene tus playlists organizadas y accesibles.',
        },
        {
          title: 'Editor de Tracks',
          description:
            'Edita todos los metadatos de tus tracks en un solo lugar. Portada completa, extracción de nombre de archivo a etiqueta, enlaces directos a Beatport y Traxsource, y acciones rápidas para limpiar etiquetas en segundos.',
        },
        {
          title: 'Auto-Etiquetado Inteligente',
          description:
            'Busca simultáneamente en Beatport, Traxsource y Bandcamp. Revisa candidatos con puntuaciones, portadas, BPM, tonalidad y sello — luego confirma con un clic.',
        },
        {
          title: 'Buscador de Duplicados',
          description:
            'Detecta duplicados en tu colección con coincidencia difusa configurable. Compara formas de onda en paralelo, deja que el sistema sugiera cuál conservar y libera espacio en disco masivamente.',
        },
        {
          title: 'Sincronización con Traktor',
          description:
            'Integración profunda con Traktor Pro. Previsualiza los cambios antes de aplicarlos, elige tu estrategia de fusión y mantén hot cues, loops y playlists perfectamente sincronizados entre ambas librerías.',
        },
        {
          title: 'Recomendaciones de Beatport',
          description:
            'Encuentra nuevos tracks para añadir a tus sets. Harmony obtiene recomendaciones de tracks similares desde Beatport basándose en tu colección y te permite abrirlos directamente.',
        },
      ],
    },
    // Download
    download: {
      title: '¿Listo para organizar tu colección?',
      subtitle: 'Descarga Harmony gratis y toma el control de tu librería musical hoy mismo.',
      button: 'Descargar última versión',
      platforms: 'Disponible para Windows, Linux y macOS',
      github_link: 'Ver versiones en GitHub →',
    },
    // Footer
    footer: {
      tagline: 'Gestor de música para DJs de toda la vida',
      built_by: 'Hecho con ♥ por',
      author: 'Jose Vega',
      license: 'Licencia MIT',
      github: 'GitHub',
      issues: 'Reportar un problema',
    },
  },
} as const;

export type Translations = typeof translations.en;
