const express = require("express");
const process = require("process");

// Catch interrupt signals to make the docker container killable via ctrl+c
process.on("SIGNIT", () => {
  console.log("Interrupted.");
  process.exit(0);
});

const app = express();

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

const port = 8080;

app.listen(port, () => {
  console.log(
    `Web server listening at ${port}!`,
  );
});
