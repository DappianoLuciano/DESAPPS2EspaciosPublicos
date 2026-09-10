import "dotenv/config";
import { createApp } from "./app";
import { configureServerSecurity } from "./shared/http/configureServerSecurity";
import { getListenHost } from "./shared/runtime/runtimeMode";

const port = Number(process.env.PORT || 3000);
const host = getListenHost();
const app = createApp();

const onListening = () => {
  console.log(
    `CityPass+ Espacios y Cultura escuchando en ${host || "la interfaz configurada"}:${port}`
  );
};

const server = host
  ? app.listen(port, host, onListening)
  : app.listen(port, onListening);

configureServerSecurity(server);
