# SURF ARCADE

Juego arcade de surf en HTML5 Canvas, pensado para iPhone en horizontal. La dirección visual actual usa pixel art de 8 bits, paleta cálida retro, ola escalonada con tubo y un surfista dibujado como sprite, inspirados en los juegos deportivos de 8 bits de la era California Games. Una partida contiene exactamente tres olas, cuatro trucos, combos, caídas, resultados por ola y récord local.

## Jugar localmente
Abre `index.html` en un navegador moderno o sirve la carpeta con cualquier servidor estático. No requiere Node.js, compilación ni claves de API.

## Publicación en GitHub Pages
El workflow `.github/workflows/pages.yml` publica automáticamente el contenido de la rama `main` al hacer push. En el repositorio, abre **Settings → Pages** y selecciona **GitHub Actions** como fuente de despliegue si aún no está configurada. Después revisa **Actions** para comprobar que el workflow termina correctamente. La URL habitual del proyecto es `https://adriangg-beep.github.io/Surf-arcade/` (el nombre conserva la capitalización del repositorio).

## Controles
- **Zona izquierda:** arrastra en horizontal para cambiar tu línea y en vertical para subir o bajar por la pared de la ola. Subir aumenta la velocidad; bajar ayuda a recuperar equilibrio.
- **Zona derecha:** pulsa Carve, Cutback, Snap o Aéreo. El tipo de truco, la altura en la ola, la velocidad y el equilibrio influyen en el aterrizaje.
- **Pausa:** botón superior derecho.
- **Sonido:** botón musical superior izquierdo.

## Mecánicas
- Tres olas de 30 segundos cada una.
- Cuatro trucos con puntuación base distinta y zonas de ejecución específicas.
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
- La ola frontal, el labio que rompe, el hueco del tubo, la espuma y el surfista se dibujan en Canvas sin recursos externos esenciales.
- No hay clasificación global ni backend: se omite Supabase para mantener el juego autónomo y evitar exponer puntuaciones no verificadas.
- La puntuación es arcade y determinista respecto a los parámetros y estado del juego, pero la calidad incorpora un factor de estado para simular dificultad; no es una simulación física realista.
