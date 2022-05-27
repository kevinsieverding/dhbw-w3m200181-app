from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import (DecimalType, IntegerType, StringType,
                               StructType, TimestampType)

windowDuration = "5 minutes"
windowOffset = "1 minute"

spark = SparkSession.builder.appName("supervizor-spark").getOrCreate()

spark.sparkContext.setLogLevel("WARN")

# Read temperature readings from Kafka
df = spark \
    .readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers",
            "my-cluster-kafka-bootstrap:9092") \
    .option("subscribe", "de.kevinsieverding.supervizor.temperature") \
    .option("startingOffsets", "earliest") \
    .load()

tempSchema = StructType()  \
    .add("temperature", DecimalType(precision=5, scale=3)) \
    .add("timestamp", IntegerType())

df = df.select(
    from_json(
        column("value").cast("string"),
        tempSchema
    ).alias("json")
).select(
    from_unixtime(column("json.timestamp"))
    .cast(TimestampType())
    .alias("parsed_timestamp"),
    column("json.*")
) \
    .withColumnRenamed("json.temperature", "temperature") \
    .withWatermark("parsed_timestamp", windowDuration)

df = df.groupBy(
    window(
        column("parsed_timestamp"),
        windowDuration,
        windowOffset
    )
).max("temperature")

consoleDump = df \
    .writeStream \
    .trigger(processingTime=windowOffset) \
    .outputMode("update") \
    .format("console") \
    .option("truncate", "false") \
    .start()

spark.streams.awaitAnyTermination()
