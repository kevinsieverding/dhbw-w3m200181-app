const express = require("express");
const process = require("process");
const { Kafka } = require("kafkajs");

// Catch interrupt signals to make the docker container killable via ctrl+c
process.on("SIGNIT", () => {
  console.log("Interrupted.");
  process.exit(0);
});

const kafka = new Kafka({
  clientId: `supervizor-simulator`,
  brokers: ["my-cluster-kafka-bootstrap:9092"],
  retry: {
    retries: 0,
  },
});

const consumer = kafka.consumer({
  groupId: `supervizor-simulator`,
});

const warnings = [];

consumer.connect();
consumer.subscribe({
  topics: [
    "de.kevinsieverding.supervizor.temperature-warnings",
  ],
  fromBeginning: true,
});
consumer.run({
  eachMessage: async ({ topic, message }) => {
    if (topic === "de.kevinsieverding.supervizor.temperature-warnings") {
      const payload = JSON.parse(message.value.toString());
      console.log(
        `Received temperature warning: ${JSON.stringify(payload)}`,
      );
      warnings.push({
        start: payload.start,
        end: payload.end,
        temperature: payload.temperature,
      });
    }
  },
});

const app = express();

app.get("/warnings", (req, res) => {
  res.send(JSON.stringify(warnings));
});

const port = 8080;

app.listen(port, () => {
  console.log(
    `Web server listening at ${port}!`,
  );
});
