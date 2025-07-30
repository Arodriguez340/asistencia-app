# ASISTI GESTIÓN S.A.

Un sistema de asistencia en tiempo real diseñado para pequeñas empresas.

ASISTI GESTIÓN S.A. es una solución robusta y fácil de usar que permite a las pequeñas empresas llevar un control preciso y en tiempo real de la asistencia de sus empleados, optimizando la gestión de personal y la toma de decisiones.

---

## 🚀 Desarrolladores

Este proyecto fue desarrollado por estudiantes de la Universidad Tecnológica de Panamá, Centro Regional de Colón:

* **José Díaz**
* **Zamir Holland**
* **Abdiel Sánchez**
* **Milagro Lan**

---

## ✨ Características Principales

* **Control de Asistencia en Tiempo Real:** Monitorea la presencia de los empleados al instante.
* **Interfaz Intuitiva:** Diseño amigable para una fácil navegación y uso.
* **Gestión de Empleados:** Permite agregar, editar y eliminar información de los empleados.
* **Generación de Informes:** Exporta datos de asistencia para análisis y reportes.
* **Seguridad:** Autenticación de usuarios para proteger la información.

---

## 💻 Tecnologías Utilizadas

ASISTI GESTIÓN S.A. está construido con las siguientes tecnologías clave:

* **Node.js:** Entorno de ejecución de JavaScript del lado del servidor.
* **Express:** Framework web para Node.js, utilizado para construir la API.
* **MongoDB:** Base de datos NoSQL para el almacenamiento de datos.

### Dependencias del Proyecto

El proyecto utiliza las siguientes dependencias:

* `bcrypt`: Para el hashing de contraseñas.
* `body-parser`: Para el análisis del cuerpo de las solicitudes HTTP.
* `chart.js`: Para la visualización de datos (gráficos).
* `connect-flash`: Para mensajes flash basados en sesiones.
* `dotenv`: Para la gestión de variables de entorno.
* `ejs`: Motor de plantillas incrustadas de JavaScript.
* `exceljs`: Para la creación y lectura de archivos Excel.
* `express-session`: Middleware de sesión para Express.
* `fullcalendar`: Un calendario JavaScript con todas las funciones.
* `moment`: Para el manejo y formato de fechas.
* `mongoose`: Modelado de objetos MongoDB para Node.js.
* `passport`: Middleware de autenticación para Node.js.
* `passport-local`: Estrategia de autenticación de nombre de usuario y contraseña para Passport.

---

## ⚙️ Instalación

Sigue estos pasos para configurar y ejecutar el proyecto en tu máquina local:

1.  **Clona el repositorio:**
    ```bash
    git clone [URL_DE_TU_REPOSITORIO]
    cd ASISTI-GESTION-SA
    ```
    *(**Nota:** Reemplaza `[URL_DE_TU_REPOSITORIO]` con el enlace real de tu repositorio de GitHub o donde esté alojado.)*

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Configura las variables de entorno:**
    Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido (o similar, según tu configuración):

    ```
    MONGO_URI=mongodb://localhost:27017/asisti_gestion_db
    PORT=3000
    SESSION_SECRET=tu_secreto_muy_seguro_aqui
    ```
    *(**Importante:** Cambia `tu_secreto_muy_seguro_aqui` por una cadena de caracteres única y compleja para la seguridad de tus sesiones.)*

---

## 🚀 Ejecución del Servidor

Para iniciar la aplicación, simplemente ejecuta el siguiente comando en tu terminal:

```bash
npm start
