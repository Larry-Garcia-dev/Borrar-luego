```python?code_reference&code_event_index=5
content = """# 🎬 Hurammy (ShortVideo Platform)

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-005C84?style=for-the-badge&logo=mysql&logoColor=white)

Hurammy es una plataforma moderna y completa para compartir videos cortos, participar en campañas interactivas y generar contenido audiovisual mediante Inteligencia Artificial.

---

## ✨ Características Principales

* **🎥 Reproducción y Subida de Videos:** Soporte para subida de videos con procesamiento (FFmpeg), vistas previas y miniaturas personalizadas.
* **🤖 Generador de Videos con IA:** Integración con la API de DashScope para convertir texto e imágenes en videos de alta calidad (720p/1080p).
* **🪙 Sistema de Economía (WAi Coins):** Monedas virtuales utilizadas para la generación de videos con IA, gestionables desde el panel de administración.
* **🏆 Campañas y Retos:** Participación en campañas temáticas con tablas de clasificación (leaderboards) en tiempo real basadas en likes.
* **👥 Interacción Social:** Sistema de seguidores (Follow/Unfollow), me gusta, comentarios y perfiles de usuario.
* **🔐 Autenticación Segura:** Inicio de sesión local con JWT y encriptación Bcrypt, además de integración con **Google OAuth**.
* **🛡️ Panel de Administración:** Gestión integral de usuarios, asignación de WAi Coins, moderación y control de campañas.
* **🌐 Soporte Multilingüe:** Interfaz disponible en Inglés, Español y Chino.

---

## 🛠️ Tecnologías Utilizadas

### Frontend (`/client/client`)
* **React 19** + **Vite**
* React Router DOM (Enrutamiento)
* Axios (Peticiones HTTP)
* Google OAuth (Autenticación social)

### Backend (`/server`)
* **Node.js** + **Express.js**
* **Sequelize** (ORM) + **MySQL**
* JWT & Bcryptjs (Seguridad)
* Multer (Manejo de archivos)
* FFmpeg / FFprobe (Procesamiento de video)
* Nodemailer (Recuperación de contraseñas)

---

## 🚀 Guía de Instalación y Despliegue

Sigue estos pasos para levantar el proyecto en tu entorno local.

### 1. Requisitos Previos
* [Node.js](https://nodejs.org/) (v18 o superior)
* [MySQL Server](https://dev.mysql.com/downloads/mysql/) en ejecución
* Credenciales de API: Google OAuth Client ID y DashScope API Key (para la IA).

### 2. Clonar el Repositorio
```
```text?code_stdout&code_event_index=5
Archivo README.md generado exitosamente.

```bash
git clone <url-del-repositorio>
cd shortvideo
```

### 3. Instalación de Dependencias
El proyecto está configurado para instalar todo y correr simultáneamente desde la raíz.
Desde la carpeta principal del proyecto, ejecuta:
```bash
# Instala las dependencias de la raíz (concurrently, etc)
npm install

# Instala las dependencias del servidor
cd server
npm install

# Instala las dependencias del cliente
cd ../client/client
npm install
cd ../..
```

### 4. Configuración de Base de Datos y Variables de Entorno

**En el Backend (`/server`):**
Crea un archivo llamado `.env` en la carpeta `server/` con las siguientes variables:
```env
# Puerto del servidor
PORT=5000

# Base de Datos (MySQL)
DB_HOST=localhost
DB_USER=root
DB_PASS=tu_contraseña_mysql
DB_NAME=hurammy_db

# Seguridad
JWT_SECRET=tu_super_secreto_jwt

# Correo (Nodemailer para recuperar contraseñas)
USER=tu_correo@gmail.com
PASS=tu_contraseña_de_aplicacion_gmail

# Inteligencia Artificial (DashScope)
DASHSCOPE_API_KEY=tu_api_key_de_dashscope
```
*Nota: Asegúrate de crear la base de datos `hurammy_db` en tu gestor MySQL antes de iniciar el servidor. Sequelize creará las tablas automáticamente.*

**En el Frontend (`/client/client`):**
Asegúrate de que la configuración de la API apunte correctamente a tu entorno local. 
En `client/client/src/main.jsx`, configura tu **Google Client ID**:
```javascript
const GOOGLE_CLIENT_ID = "TU_CLIENT_ID_DE_GOOGLE";
```

### 5. Iniciar la Aplicación

Gracias a la configuración de la raíz, puedes levantar tanto el Frontend como el Backend con un solo comando.
Desde la carpeta raíz del proyecto, ejecuta:
```bash
npm run dev
```

* El **Backend** correrá en: `http://localhost:5000`
* El **Frontend** correrá en: `http://localhost:5173` (o el puerto que asigne Vite)

---

## 📂 Estructura del Proyecto

```text
📦 shortvideo
 ┣ 📂 client
 ┃ ┗ 📂 client          # Frontend (React + Vite)
 ┃   ┣ 📂 public        # Assets estáticos (Logos, íconos)
 ┃   ┗ 📂 src           # Código fuente (Componentes, Páginas, Servicios)
 ┣ 📂 server            # Backend (Node.js + Express)
 ┃ ┣ 📂 config          # Configuración de DB y Multer
 ┃ ┣ 📂 controllers     # Lógica de negocio (Auth, Videos, IA, Admin)
 ┃ ┣ 📂 middleware      # Verificación de JWT y Roles
 ┃ ┣ 📂 models          # Modelos de Sequelize (User, Video, Campaign...)
 ┃ ┣ 📂 routes          # Definición de rutas API
 ┃ ┗ 📂 uploads         # Almacenamiento local de archivos (Videos, Thumbnails)
 ┣ 📜 package.json      # Scripts concurrentes de la raíz
 ┗ 📜 README.md         # Documentación del proyecto
```

---

## 🛡️ Panel de Administración

Para acceder al Panel de Administración:
1. Regístrate como un usuario normal en la plataforma.
2. Entra a tu base de datos MySQL y cambia manualmente el `role` de tu usuario de `'user'` a `'admin'`.
3. Inicia sesión nuevamente; verás la opción **"Panel Admin"** en la barra lateral.
4. Desde ahí podrás gestionar **WAi Coins**, congelar cuentas y administrar **Campañas**.

---

**Hurammy** © 2026 - Desarrollado para revolucionar la creación y el consumo de videos.
"""

with open("README.md", "w", encoding="utf-8") as f:
    f.write(content)
print("Archivo README.md generado exitosamente.")


```
Your markdown file is ready
[file-tag: code-generated-file-0-1777516001684149792]

He creado el archivo `README.md` con un diseño profesional y detallado. Incluye insignias (badges) de las tecnologías utilizadas, una descripción clara, las características principales, y un paso a paso muy preciso para configurar, instalar y levantar tanto el backend como el frontend de **Hurammy (ShortVideo)**. 

También agregué instrucciones sobre cómo configurar las variables de entorno necesarias (Base de datos, JWT, Nodemailer, Google OAuth, y DashScope API) y cómo obtener acceso al Panel de Administración. ¡Espero que te sea de gran utilidad para el proyecto!