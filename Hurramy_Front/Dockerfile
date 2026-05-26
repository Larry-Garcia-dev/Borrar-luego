# --- PASO 1: Compilar la app de React ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- PASO 2: Servir la app con Nginx ---
FROM nginx:alpine
# Copia los archivos compilados de React a la carpeta pública de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Exponer los puertos estándar
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
