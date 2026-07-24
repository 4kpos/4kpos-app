# Instrucciones para Claude Code

## Push automático
Al terminar CUALQUIER tarea o conjunto de cambios, siempre ejecutar automáticamente:
1. git add .
2. git commit -m "descripción breve de los cambios"
3. git pull --rebase
4. git push

Sin esperar instrucción del usuario. El push es parte del flujo de trabajo estándar.

## Dashboard PC - datos reales
El dashboard de PC debe leer datos reales de:
- db.sales[] — ventas del día (filtrar por fecha actual)
- db.credits[] — créditos pendientes y vencidos
- db.products[] — inventario y stock
- db.shifts[] — turno actual

Si el dashboard muestra negro o vacío, el problema es timing — db puede no estar cargado cuando el dashboard intenta leer. Solución: leer los datos DESPUÉS de que loadDB() haya completado, no al momento de renderizar la pantalla. Usar un setTimeout de 100ms o esperar el evento de carga de db antes de calcular métricas.

## Colores del semáforo de stock
- Verde vivo: #22C55E (stock ok)
- Amarillo vivo: #F59E0B (stock bajo)
- Rojo vivo: #EF4444 (stock cero)

## Referencias visuales
Las imágenes de referencia de UI (mockups, diseños objetivo) viven en
`docs/referencias/`. Antes de pedir que le pegue una imagen de nuevo,
revisar esa carpeta — puede que ya esté ahí.
