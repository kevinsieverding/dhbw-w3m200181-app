const express = require("express");
const process = require("process");
const { Kafka } = require("kafkajs");
const mariadb = require("mariadb");

// Catch interrupt signals to make the docker container killable via ctrl+c
process.on("SIGNIT", () => {
  console.log("Interrupted.");
  process.exit(0);
});

// CONSTANTS

const unitsOfMeasure = {
  degreeCelsius: {
    code: "CEL",
    text: "°C",
  },
};

const warningTypes = {
  temperature: {
    code: "TEMPERATURE",
  },
};

// DATABASE

const pool = mariadb.createPool({
  host: "my-app-mariadb-service",
  port: 3306,
  database: "supervizor",
  user: "root",
  password: "mysecretpw",
  connectionLimit: 5,
});

async function executeQuery(query, data) {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log("Executing query:", query);
    let res = await connection.query({ rowsAsArray: true, sql: query }, data);
    return res;
  } finally {
    if (connection) {
      connection.end();
    }
  }
}

// KAFKA

const kafka = new Kafka({
  clientId: `supervizor-simulator`,
  brokers: ["my-cluster-kafka-bootstrap:9092"],
  retry: {
    retries: 0,
  },
});

// CONSUMER FOR TEMPERATURE WARNINGS

const consumer = kafka.consumer({
  groupId: `supervizor-simulator`,
});

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
      await createWarning({
        type: warningTypes.temperature.code,
        value: payload.temperature,
        unitOfMeasure: unitsOfMeasure.degreeCelsius.code,
        start: payload.start,
        end: payload.end,
      });
    }
  },
});

// LOGIC

async function createWarning(warning) {
  return await executeQuery(
    "INSERT INTO warnings (type, value, unitOfMeasure, start, end) " +
      "VALUES (?, ?, ?, ?, ?);",
    [
      warning.type,
      warning.value,
      warning.unitOfMeasure,
      warning.start,
      warning.end,
    ],
  );
}

async function findAllWarnings() {
  return await executeQuery("SELECT * FROM warnings;");
}

async function findWarning(id) {
  return await executeQuery("SELECT * FROM warnings WHERE id = ?;", [id]);
}

// WEBAPP

const app = express();

app.get("/warnings", async (req, res) => {
  res.send(JSON.stringify(await findAllWarnings(), null, 2));
});

app.get("/warnings/:warning", async (req, res) => {
  res.send(JSON.stringify(await findWarning(req.params.warning)));
});

const port = 8080;

app.listen(port, () => {
  console.log(
    `Web server listening at ${port}!`,
  );
});
