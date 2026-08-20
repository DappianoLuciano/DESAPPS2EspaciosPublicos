import "dotenv/config";
import { createApp } from "./app";

const port = Number(process.env.PORT || 3000);
const app = createApp();

app.listen(port, () => {
  console.log(`CityPass+ Espacios y Cultura escuchando en puerto ${port}`);
});
