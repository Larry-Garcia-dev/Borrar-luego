# 1. Usar una imagen oficial de Node.js ligera
FROM node:20-alpine

# 2. Crear y definir el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# 3. Copiar los archivos de dependencias
COPY package*.json ./

# 4. Instalar las dependencias de producción
RUN npm install --only=production

# 5. Copiar el resto del código del backend
COPY . .

# 6. Exponer el puerto en el que corre Express
EXPOSE 5000

# 7. Comando para arrancar la aplicación
CMD ["node", "index.js"]
