# DHBW W3M20018.1 Data Science & Big Data: App

This application is supposed to showcase the a big data setup for predictive maintenance.

## Use Case

The use case for this project is to collect sensor data of hydraulic machines, analyze them, and provide warnings of potential machine failure based on simple thresholds.
Since there is no hydraulic test rig available for this project, the data will be simulated using pseudo-random generators.
The generated data and chosen thresholds are based on the data set for condition monitoring of hydraulic systems by ZeMA gGmbH ([source](https://archive.ics.uci.edu/ml/datasets/Condition+monitoring+of+hydraulic+systems)).

## Setup

### Prerequisites

1. A Kubernetes installation like [Minikube](https://minikube.sigs.k8s.io/docs/).
2. The [Strimzi.io](https://strimzi.io/) Kafka operator

    ```bash
    helm repo add strimzi http://strimzi.io/charts/
    helm install strimzi-kafka-operator strimzi/strimzi-kafka-operator
    kubectl apply -f kafka-cluster-def.yaml
    ```

3. A Hadoop cluster with YARN

    ```bash
    helm repo add stable https://charts.helm.sh/stable
    helm install --namespace=default --set hdfs.dataNode.replicas=1 --set yarn.nodeManager.replicas=1 --set hdfs.webhdfs.enabled=true my-hadoop-cluster stable/hadoop
    ```

### Deploy

You can deploy the application to your local Kubernetes cluster using [Skaffold](https://skaffold.dev/).

```bash
skaffold dev
```