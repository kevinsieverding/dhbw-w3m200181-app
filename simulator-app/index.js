const { Kafka } = require("kafkajs");
const process = require("process");

// Catch interrupt signals to make the docker container killable via ctrl+c
process.on("SIGNIT", () => {
  console.log("Interrupted.");
  process.exit(0);
});

const kafka = new Kafka({
  clientId: `simulator-${Math.random() * 10000}`,
  brokers: ["my-cluster-kafka-bootstrap:9092"],
  retry: {
    retries: 0,
  },
});

const producer = kafka.producer();

// Send tracking message to Kafka
async function sendMessage(data) {
  //Ensure the producer is connected
  await producer.connect();

  //Send message
  let result = await producer.send({
    topic: "test-topic",
    messages: [{ value: JSON.stringify(data) }],
  });

  // console.log("Send result:", result);
  return result;
}

missions = ["sts-1", "sts-2", "sts-3", "sts-4"];

setInterval(() => {
  sendMessage({
    mission: missions[Math.floor(Math.random() * (missions.length - 1))],
    timestamp: Math.floor(new Date() / 1000),
  });
}, 1000);

const temperatureTopic = "de.kevinsieverding.supervizor.temperature";
const minTemp = 30;
const maxTemp = 80;
const tempInterval = 1000;

setInterval(() => {
  const message = {
    value: JSON.stringify({
      temperature: randn_bm(minTemp, maxTemp, 0.8).toFixed(
        3,
      ),
      timestamp: Math.floor(new Date() / 1000),
    }),
  };
  console.log(`Sending message: ${JSON.stringify(message)}`);
  producer.connect();
  producer.send({
    topic: temperatureTopic,
    messages: [message],
  });
}, tempInterval);

const pressureTopic = "de.kevinsieverding.supervizor.pressure";
const minPressure = 80;
const maxPressure = 160;
const pressureInterval = 100;

setInterval(() => {
  producer.connect();
  producer.send({
    topic: pressureTopic,
    messages: [
      {
        value: JSON.stringify({
          pressure: (
            Math.random() * (maxPressure - minPressure) +
            minPressure
          ).toFixed(2),
          timestamp: Math.floor(new Date() / 1000),
        }),
      },
    ],
  });
}, pressureInterval);

const vibrationTopic = "de.kevinsieverding.supervizor.vibration";
const minVibration = 0.5;
const maxVibration = 0.7;
const vibrationInterval = 1000;

setInterval(() => {
  producer.connect();
  producer.send({
    topic: vibrationTopic,
    messages: [
      {
        value: JSON.stringify({
          pressure: (
            Math.random() * (maxVibration - minVibration) +
            minVibration
          ).toFixed(3),
          timestamp: Math.floor(new Date() / 1000),
        }),
      },
    ],
  });
}, vibrationInterval);

// generate values with normal distribution
// https://stackoverflow.com/a/49434653
function randn_bm(min, max, skew) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();
  let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);

  num = num / 10.0 + 0.5; // Translate to 0 -> 1
  if (num > 1 || num < 0) {
    num = randn_bm(min, max, skew); // resample between 0 and 1 if out of range
  } else {
    num = Math.pow(num, skew); // Skew
    num *= max - min; // Stretch to fill range
    num += min; // offset to min
  }

  return num;
}
