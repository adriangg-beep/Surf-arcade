# SURF ARCADE

Juego arcade de surf en HTML5 Canvas, pensado para iPhone en horizontal. Una partida contiene exactamente tres olas, ocho trucos, combos, caídas, resultados por ola y récord local.

## Jugar localmente
Abre `index.html` en un navegador moderno o sirve la carpeta con cualquier servidor estático. No requiere Node.js, compilación ni claves de API.

## Publicación en GitHub Pages
El workflow `.github/workflows/pages.yml` publica automáticamente el contenido de la rama `main` al hacer push. En el repositorio, abre **Settings → Pages** y selecciona **GitHub Actions** como fuente de despliegue si aún no está configurada. Después revisa **Actions** para comprobar que el workflow termina correctamente. La URL habitual del proyecto es `https://adriangg-beep.github.io/Surf-arcade/` (el nombre conserva la capitalización del repositorio).

## Controles
- **Zona izquierda:** arrastra lateralmente para ajustar la línea. Arrastra hacia arriba para ganar velocidad y hacia abajo para reducirla y recuperar equilibrio.
- **Zona derecha:** pulsa uno de los ocho botones de truco. Los aéreos y giros avanzados requieren más velocidad y equilibrio.
- **Pausa:** botón superior derecho.
- **Sonido:** botón musical superior izquierdo.

## Mecánicas
- Tres olas de 30 segundos cada una.
- Ocho trucos con puntuación base distinta.
- Multiplicador por combo, bonificación por variedad, penalización por repetición y caída.
- Récord personal y preferencias guardados en `localStorage`.
- El juego no necesita conexión ni Supabase para jugar.

## Arquitectura
- `index.html`: estructura y pantallas.
- `styles.css`: interfaz responsive y paleta cromática.
- `js/game.js`: ciclo del juego, escena Canvas, controles, trucos, puntuación, audio y almacenamiento local.

## Pruebas
Lista manual en `tests/TEST_PLAN.md`. Las pruebas físicas en iPhone Safari deben confirmarse en el dispositivo; no se consideran verificadas por una prueba de escritorio.

## Limitaciones de esta primera versión
- Los gráficos se dibujan en Canvas y no usan recursos externos esenciales.
- No hay clasificación global ni backend: se omite Supabase para mantener el juego autónomo y evitar exponer puntuaciones no verificadas.
- La puntuación es arcade y determinista respecto a los parámetros y estado del juego, pero la calidad incorpora un factor de estado para simular dificultad; no es una simulación física realista.
