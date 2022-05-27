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
async function sendTrackingMessage(data) {
  //Ensure the producer is connected
  await producer.connect();

  //Send message
  let result = await producer.send({
    topic: "test-topic",
    messages: [
      { value: JSON.stringify(data) },
    ],
  });

  console.log("Send result:", result);
  return result;
}

setInterval(() => {
  sendTrackingMessage({
    msg: "Hello there!",
    timestamp: Math.floor(new Date() / 1000),
  });
}, 1000);
