# Instrucciones para Implementar Marquees en Webflow

## Cómo usar el código en Webflow

### Paso 1: Agregar un elemento Embed
1. En tu proyecto de Webflow, arrastra un elemento **"Embed"** donde quieras que aparezca el marquee
2. Haz doble clic en el elemento Embed para abrirlo

### Paso 2: Copiar el código
Copia todo el contenido del archivo `webflow-embed-marquee.html` y pégalo en el elemento Embed.

### Paso 3: Personalizar el contenido
Modifica los textos dentro de los `<span class="wf-marquee-text">` para mostrar tu propio contenido:

```html
<span class="wf-marquee-text">🚀 Tu mensaje aquí</span>
<span class="wf-marquee-text">✨ Otro mensaje</span>
```

## Variaciones disponibles

### 1. Marquee básico (izquierda a derecha)
- Gradiente morado/azul
- Velocidad: 25 segundos por ciclo
- Se pausa al hacer hover

### 2. Marquee derecha a izquierda
- Cambia `wf-marquee` por `wf-marquee wf-marquee-right`
- Gradiente rosa
- Animación en dirección opuesta

### 3. Diferentes gradientes
Agrega estas clases adicionales al div principal:
- `wf-marquee-pink` - Gradiente rosa
- `wf-marquee-blue` - Gradiente azul
- `wf-marquee-green` - Gradiente verde

## Personalización

### Cambiar velocidad
Modifica el valor en la animación CSS:
```css
animation: wf-scroll-left 25s linear infinite;
```
- Número menor = más rápido
- Número mayor = más lento

### Cambiar colores
Modifica el gradiente en la propiedad `background`:
```css
background: linear-gradient(135deg, #color1 0%, #color2 100%);
```

### Cambiar tamaño de texto
Modifica `font-size` en `.wf-marquee-text`:
```css
font-size: 18px; /* Cambia este valor */
```

## Características técnicas

✅ **Sin JavaScript** - Solo HTML y CSS  
✅ **Responsive** - Se adapta a móviles  
✅ **Compatible con Webflow** - Prefijos únicos para evitar conflictos  
✅ **Animación suave** - Usa CSS transforms para mejor rendimiento  
✅ **Hover para pausar** - Se detiene al pasar el mouse  

## Notas importantes

- El marquee se repite automáticamente para crear un efecto continuo
- Los prefijos `wf-` evitan conflictos con otros estilos de Webflow
- El código es completamente autónomo y no requiere librerías externas
- Funciona en todos los navegadores modernos
