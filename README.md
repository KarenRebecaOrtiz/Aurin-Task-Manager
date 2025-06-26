This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Task App Sodio

## Funcionalidades

### Drag & Reply en Mensajes

La aplicación incluye una funcionalidad de drag & reply que funciona tanto en desktop como en móvil:

#### Cómo usar:
1. **Desktop**: Haz clic y arrastra cualquier mensaje hacia la izquierda
2. **Móvil**: Toca y arrastra cualquier mensaje hacia la izquierda
3. **Umbral**: Cuando arrastres más de 60px hacia la izquierda, se activará la respuesta
4. **Indicadores visuales**: 
   - Una barra azul aparece en el lado izquierdo del mensaje mientras lo arrastras
   - La barra cambia a verde cuando alcanzas el umbral para activar la respuesta
   - El mensaje se escala ligeramente para dar feedback visual

#### Características:
- **Drag horizontal**: Solo se activa cuando el movimiento es principalmente horizontal
- **Prevención de scroll**: El drag no interfiere con el scroll vertical
- **Feedback visual**: Animaciones suaves y indicadores de estado
- **Cancelación**: Suelta el mensaje antes del umbral para cancelar la respuesta
- **Consistencia**: Funciona igual en ChatSidebar y MessageSidebar

#### Estilos:
- Cursor cambia a `grab`/`grabbing` en desktop
- Efecto hover que mueve ligeramente el mensaje
- Animaciones CSS para transiciones suaves
- Indicadores de color para diferentes estados del drag

## Instalación y Uso

[Resto del README...]
