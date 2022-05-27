from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import (IntegerType, StringType, StructType,
                               TimestampType)

windowDuration = "5 minutes"
windowOffset = "1 minute"

spark = SparkSession.builder.appName("supervizor-spark").getOrCreate()

spark.sparkContext.setLogLevel("WARN")

kafkaMessages = spark \
    .readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers",
            "my-cluster-kafka-bootstrap:9092") \
    .option("subscribe", "test-topic") \
    .option("startingOffsets", "earliest") \
    .load()

schema = StructType().add("mission", StringType()).add("timestamp", IntegerType())

messages = kafkaMessages.select(
    from_json(
        column("value").cast("string"),
        schema
    ).alias("json")
).select(
    from_unixtime(column("json.timestamp"))
    .cast(TimestampType())
    .alias("parsed_timestamp"),
    column("json.*")
).withColumnRenamed("json.mission", "mission").withWatermark("parsed_timestamp", windowDuration)

groupedMessages = messages.groupBy(
    window(
        column("parsed_timestamp"),
        windowDuration,
        windowOffset
    ),
    column("mission")
).count().withColumnRenamed("count", "views")

consoleDump = groupedMessages \
    .writeStream \
    .trigger(processingTime=windowOffset) \
    .outputMode("update") \
    .format("console") \
    .option("truncate", "false") \
    .start()

spark.streams.awaitAnyTermination()
