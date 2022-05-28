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

consumer.connect();
consumer.subscribe({
  topics: [
    "de.kevinsieverding.supervizor.temperature-warnings",
    "de.kevinsieverding.supervizor.pressure-warnings",
  ],
  // fromBeginning: true,
});
consumer.run({
  eachMessage: async ({ topic, message }) => {
    if (topic === "de.kevinsieverding.supervizor.temperature-warnings") {
      console.log(
        `Received temperature warning! Temperature was ${message.value.toString()} °C at ${message.key.toString()}`,
      );
    } else if (topic === "de.kevinsieverding.supervizor.pressure-warnings") {
      console.log(
        `Received pressure warning! Pressure was ${message.value.toString()} bar at ${message.key.toString()}`,
      );
    }
  },
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
