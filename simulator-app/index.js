const { Kafka } = require("kafkajs");

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
    messages: [
      { value: JSON.stringify(data) },
    ],
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
  producer.connect();
  producer.send({
    topic: temperatureTopic,
    messages: [
      {
        value: JSON.stringify({
          temperature: (Math.random() * (maxTemp - minTemp) + minTemp).toFixed(
            3,
          ),
          timestamp: Math.floor(new Date() / 1000),
        }),
      },
    ],
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
          pressure: (Math.random() * (maxPressure - minPressure) + minPressure)
            .toFixed(
              2,
            ),
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
          pressure:
            (Math.random() * (maxVibration - minVibration) + minVibration)
              .toFixed(
                3,
              ),
          timestamp: Math.floor(new Date() / 1000),
        }),
      },
    ],
  });
}, vibrationInterval);
