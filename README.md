# DHBW W3M20018.1 Data Science & Big Data: App

This application is supposed to showcase the a big data setup for predictive maintenance.

## Use Case

The use case for this project is to collect sensor data of hydraulic machines, analyze them, and provide warnings of potential machine failure based on simple thresholds.
Since there is no hydraulic test rig available for this project, the data will be simulated using pseudo-random generators.
The generated data and chosen thresholds are based on the data set for condition monitoring of hydraulic systems by ZeMA gGmbH ([source](https://archive.ics.uci.edu/ml/datasets/Condition+monitoring+of+hydraulic+systems)).

## Application

This application consists of multiple Big Data applications such as:

- Apache Kafka
- Apache Hadoop
- Apache Spark
- MariaDB
- Memcached

besides two NodeJS applications to implement a Big Data processing setup according to the Kappa architecture.

- The simulator-app generates temperature sensor readings and publishes them to a Kafka cluster.
- These messages are processed by a Spark job that groups the incoming readings in 30s time windows and checks if the maximum reading of the window exceeds the threshold of 66 °C.
- If so, it produces a message containing the time window and maximum temperature reading to a dedicated topic.
- These messages are consumed by the web-app, which persists them in a MariaDB and serves them via a simple RESTful API.
- The web-app also caches data base results in Memcached instances to improve the latency of API calls.

## Setup

### Prerequisites

1. A Kubernetes installation like [Minikube](https://minikube.sigs.k8s.io/docs/).

    > If you are using Minikube, make sure that the ingress addon is enabled.

2. The [Strimzi.io](https://strimzi.io/) Kafka operator.

    ```bash
    helm repo add strimzi http://strimzi.io/charts/
    helm install strimzi-kafka-operator strimzi/strimzi-kafka-operator
    kubectl apply -f kafka-cluster-def.yaml
    ```

3. A Hadoop cluster with YARN.

    ```bash
    helm repo add stable https://charts.helm.sh/stable
    helm install --namespace=default --set hdfs.dataNode.replicas=1 --set yarn.nodeManager.replicas=1 --set hdfs.webhdfs.enabled=true my-hadoop-cluster stable/hadoop
    ```

### Deploy

You can deploy the application to your local Kubernetes cluster using [Skaffold](https://skaffold.dev/).

```bash
skaffold dev
```

### Use

After all the components have started, you should see log messages from the `supervizor-simulator` indicating that it is regularly publishing messages.
A little later the Spark job should start running and produce Kafka messages.
Please note, it can take a couple of minutes until the simulator has acutally produced a temperature reading above the threshold and the spark job has processed the information.
The `supervizor-web` application will log when it consumes a Kafka message, as well as when it accesses the data base and caches.

The web-app's API is available via the Kubernetes cluster's load balancer.
If you are using Minikube, you can find your loadbalancer's IP via `minikube service list`.

The `/warnings` endpoint will return all warnings that the app has recorded so far.
To access a specific warning, you can call the `/warnings/{id}` endpoint.
The results are cached for five seconds.
If you issue the same request multiple times, you will see that the application has read the value from the cache in the `supervizor-web` logs.

