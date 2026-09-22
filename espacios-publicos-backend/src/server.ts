import "dotenv/config";
import { createApp } from "./app";
import { configureServerSecurity } from "./shared/http/configureServerSecurity";
import { logger } from "./shared/logging/logger";
import { getListenHost } from "./shared/runtime/runtimeMode";

const port = Number(process.env.PORT || 3000);
const host = getListenHost();
const app = createApp();

const onListening = () => {
  logger.info(
    { host: host || "la interfaz configurada", port },
    "CityPass+ Espacios y Cultura escuchando"
  );
};

const server = host
  ? app.listen(port, host, onListening)
  : app.listen(port, onListening);

configureServerSecurity(server);
