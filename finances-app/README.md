# Finances App

Aplicacio web per gestionar finances personals o familiars amb comptes, transaccions, categories, persones, esdeveniments i analisi mensual.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS + components UI basats en Radix
- Zustand per estat global lleuger
- Turso/libSQL com a base de dades sincronitzada
- Vercel Functions per retornar el token de connexio a Turso
- Recharts per visualitzacions

## Funcionalitats principals

- Dashboard mensual amb KPIs i grafics
- Gestio de transaccions, comptes i categories
- Seguiment de deutes i repartiment de despeses entre persones
- Esdeveniments per agrupar moviments relacionats
- Importacio de CSV amb regles d'assignacio
- PWA instal·lable
- Autenticacio en dues capes: contrasenya familiar i PIN d'usuari

## Requisits

- Node.js 20 o superior
- npm
- Base de dades Turso disponible

## Variables d'entorn

### Client

Definir a `.env.local`:

```bash
VITE_TURSO_DATABASE_URL=
VITE_TURSO_AUTH_TOKEN=
VITE_FAMILY_PASSWORD=
```

Aquestes variables serveixen com a fallback local quan es treballa sense `vercel dev`.

### Servidor / Vercel

Definir a Vercel o al teu entorn de servidor:

```bash
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
FAMILY_PASSWORD=
```

L'endpoint [api/getToken.ts](api/getToken.ts) valida la contrasenya familiar i retorna el token i la URL de Turso al client.

## Desenvolupament local

Instal·lar dependencies:

```bash
npm install
```

Executar el frontend amb Vite:

```bash
npm run dev
```

Executar el projecte amb la capa API de Vercel:

```bash
npm run dev:vercel
```

## Scripts

- `npm run dev`: servidor de desenvolupament de Vite
- `npm run dev:vercel`: executa l'app amb Vercel dev
- `npm run build`: typecheck i build de produccio
- `npm run lint`: lint del projecte
- `npm run lint:fix`: correccio automatica del lint
- `npm run format`: format de fitxers `src`
- `npm run format:check`: comprovacio de format
- `npm run preview`: previsualitzacio del build

## Flux d'autenticacio

1. L'usuari introdueix la contrasenya familiar.
2. El client crida `/api/getToken` per obtenir credencials de Turso.
3. Es crea el client local de libSQL i es sincronitza.
4. L'usuari selecciona el seu perfil.
5. L'usuari valida el PIN de 4 digits.

L'estat d'autenticacio viu principalment a [src/store/authStore.ts](src/store/authStore.ts).

## Estructura rellevant

- [src/pages](src/pages): pagines principals
- [src/components/features](src/components/features): UI per domini funcional
- [src/lib/db/queries](src/lib/db/queries): acces a dades i operacions SQL
- [src/store](src/store): estat global amb Zustand
- [src/types/database.d.ts](src/types/database.d.ts): tipus del model de dades
- [api/getToken.ts](api/getToken.ts): endpoint per obtenir el token de Turso

## Desplegament

- El routing SPA es resol a [vercel.json](vercel.json).
- Les crides a `/api/*` es mantenen al backend de Vercel.
- El service worker es configura a [vite.config.ts](vite.config.ts).

## Estat actual

- La ruta interna de test de base de dades ja no esta muntada al router principal.
- El projecte ha de mantenir imports amb el mateix casing exacte dels fitxers per evitar errors en Linux i CI.
