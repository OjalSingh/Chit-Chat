import "./app.js"; // registers middleware and routes on the shared Express app
import { server } from "./lib/socket.js";
import { connectDB } from "./lib/db.js";
import { ENV } from "./lib/env.js";

const PORT = ENV.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();
});
