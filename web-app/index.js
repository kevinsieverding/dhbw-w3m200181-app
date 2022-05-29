const express = require("express");
const process = require("process");
const { Kafka } = require("kafkajs");
const mariadb = require("mariadb");
const MemcachePlus = require("memcache-plus");
const dns = require("dns").promises;

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

const cacheTimeSecs = 5;

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

// MEMCACHE

let memcached = null;
let memcachedServers = [];

async function getMemcachedServersFromDns() {
  try {
    // Query all IP addresses for this hostname
    let queryResult = await dns.lookup("my-memcached-service", {
      all: true,
    });

    // Create IP:Port mappings
    let servers = queryResult.map((el) => el.address + ":" + 11211);

    // Check if the list of servers has changed
    // and only create a new object if the server list has changed
    if (memcachedServers.sort().toString() !== servers.sort().toString()) {
      console.log("Updated memcached server list to ", servers);
      memcachedServers = servers;

      //Disconnect an existing client
      if (memcached) {
        await memcached.disconnect();
      }

      memcached = new MemcachePlus(memcachedServers);
    }
  } catch (e) {
    console.log("Unable to get memcache servers", e);
  }
}

getMemcachedServersFromDns();
setInterval(() => getMemcachedServersFromDns(), 5000);

//Get data from cache if a cache exists yet
async function getFromCache(key) {
  if (!memcached) {
    console.log(
      `No memcached instance available, memcachedServers = ${memcachedServers}`,
    );
    return null;
  }
  return await memcached.get(key);
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

const cacheKey = "warnings";

async function findAllWarnings() {
  const key = cacheKey;
  let data = await getFromCache(key);

  if (data) {
    console.log(`Cache hit for key=${key}, cachedata = `, data);
    return data;
  }

  console.log(`Cache miss for key=${key}, querying database`);

  data = await executeQuery("SELECT * FROM warnings;");

  if (data) {
    console.log("Got result=", data, "storing in cache");
    if (memcached) {
      await memcached.set(key, data, cacheTimeSecs);
      data.forEach(async (warning) => {
        const id = warning[0];
        console.log(`Caching ${key}-${id}:${warning}`);
        await memcached.set(`${key}-${id}`, warning, cacheTimeSecs);
      });
    }
  }

  return data;
}

async function findWarning(id) {
  const key = `${cacheKey}-${id}`;
  let data = await getFromCache(key);

  if (data) {
    console.log(`Cache hit for key=${key}, cachedata = `, data);
    return data;
  }

  console.log(`Cache miss for key=${key}, querying database`);

  data = await executeQuery("SELECT * FROM warnings WHERE id = ?;", [id]);

  if (data) {
    console.log("Got result=", data, "storing in cache");
    if (memcached) {
      await memcached.set(key, data, cacheTimeSecs);
    }
  }

  return data;
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
