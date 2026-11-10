import './globals.css';

export const metadata = {
  title: 'Despensa - Gestión Compartida',
  description: 'Control de inventario de despensa en tiempo real',
  manifest: '/manifest.json',
  themeColor: '#1B4332',
  viewport: 'width-device-width, initial-scale-1, maximum-scale-1, user-scalable=no',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="https://cdn-icons-png.flaticon.com/512/3724/3724788.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-despensa-bg min-h-screen text-despensa-text">
        {children}
      </body>
    </html>
  );
}