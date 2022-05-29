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
