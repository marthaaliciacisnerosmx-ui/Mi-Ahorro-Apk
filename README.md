# Mi Ahorro

Aplicación móvil de control de dinero y ahorros con múltiples fondos, transferencias, reportes y respaldos. Funciona completamente sin internet.

## Tecnologías

- React + TypeScript
- Vite
- Tailwind CSS
- Lucide React (iconos)
- IndexedDB (almacenamiento local)
- jsPDF (generación de PDF)
- Web Share API (compartir nativo)

## Desarrollo

```bash
npm install
npm run dev
```

## Construcción

```bash
npm run build
```

## Conversión a APK con Capacitor

### 1. Instalar Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/share @capacitor/filesystem
npx cap init "Mi Ahorro" "com.miahorro.app" --web-dir=dist
```

### 2. Construir el proyecto web

```bash
npm run build
```

### 3. Agregar plataforma Android

```bash
npx cap add android
npx cap sync
```

### 4. Abrir el proyecto en Android Studio

```bash
npx cap open android
```

### 5. Generar APK de prueba

En Android Studio:
- Build > Build Bundle(s) / APK(s) > Build APK(s)

### 6. Generar versión firmada

1. Generar keystore:
```bash
keytool -genkey -v -keystore mi-ahorro.keystore -alias miahorro -keyalg RSA -keysize 2048 -validity 10000
```

2. Configurar el archivo `android/app/build.gradle` con signingConfig
3. Build > Generate Signed Bundle / APK

### 7. Sincronizar cambios futuros

```bash
npm run build
npx cap sync
npx cap open android
```

## Estructura del proyecto

```
src/
  components/    Componentes de UI
  hooks/          Lógica de estado (useStore)
  storage/        Capa de almacenamiento (IndexedDB, migrable a SQLite)
  types/          Tipos TypeScript
  utils/          Utilidades de formato y generación de reportes
```

## Almacenamiento

Los datos se guardan en IndexedDB. La capa de almacenamiento está separada en `src/storage/storage.ts` para facilitar la migración a SQLite con Capacitor.

## Privacidad

- Sin servidores externos
- Sin rastreadores
- Sin anuncios
- Opcional: bloqueo con PIN
- Todo se guarda localmente en el dispositivo
