# Plan de pruebas — SURF ARCADE

## Pruebas funcionales
- [ ] El botón SURFEAR muestra el tutorial la primera vez y empieza la partida.
- [ ] La partida avanza por tres olas, cada una con su pantalla de resultados.
- [ ] Los cuatro botones (Carve, Cutback, Snap y Aéreo) activan su truco y muestran feedback.
- [ ] La posición vertical en la ola, la velocidad y el equilibrio determinan si un truco aterriza o termina en caída.
- [ ] Un truco exitoso incrementa el combo; una caída lo rompe.
- [ ] El marcador total suma los resultados de las tres olas.
- [ ] Al finalizar, aparece la clasificación arcade y se guarda el récord local.
- [ ] Otra partida empieza con puntuaciones, temporizadores y combos reiniciados.
- [ ] Pausar/continuar y volver al inicio funcionan.
- [ ] El sonido se puede desactivar y la preferencia persiste.

## Pruebas táctiles
- [ ] En Safari iOS horizontal, los controles responden a una sola pulsación.
- [ ] Arrastrar arriba/abajo permite recorrer la pared de la ola; el movimiento lateral cambia la línea.
- [ ] Rotar la pantalla o cambiar de aplicación pausa la partida.
- [ ] La página no se desplaza al arrastrar los controles.
- [ ] La interfaz y los botones quedan dentro de las zonas seguras.

## Pruebas técnicas
- [ ] Consola sin errores críticos.
- [ ] CSS y JavaScript cargan desde la ruta del proyecto GitHub Pages y la ola frontal se dibuja sin recursos externos.
- [ ] Jugar no genera solicitudes de red necesarias para la mecánica.
- [ ] Récord y sonido sobreviven a una recarga.
- [ ] Varias partidas seguidas no acumulan eventos ni temporizadores de juego.

## Estado de verificación
Esta lista es un plan de pruebas, no un registro de pruebas ejecutadas. Completarla en escritorio no sustituye una comprobación en iPhone físico.
