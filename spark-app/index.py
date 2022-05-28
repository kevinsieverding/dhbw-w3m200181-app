from pyspark.sql import SparkSession
from pyspark.sql.functions import *
from pyspark.sql.types import (DecimalType, IntegerType, StringType,
                               StructType, TimestampType)

windowDuration = "1 minute"
windowInterval = "1 minute"

spark = SparkSession.builder.appName("supervizor-spark").getOrCreate()

spark.sparkContext.setLogLevel("WARN")

kafkaBootstrap = "my-cluster-kafka-bootstrap:9092"

###############################################################################
# TEMPERATURE
###############################################################################

# Read temperature readings from Kafka
temperatureDf = spark \
    .readStream \
    .format("kafka") \
    .option("kafka.bootstrap.servers", kafkaBootstrap) \
    .option("subscribe", "de.kevinsieverding.supervizor.temperature") \
    .load()

temperatureSchema = StructType()  \
    .add("temperature", DecimalType(precision=5, scale=3)) \
    .add("timestamp", IntegerType())

temperatureDf = temperatureDf.select(
    from_json(
        column("value").cast("string"),
        temperatureSchema
    ).alias("json")
).select(
    from_unixtime(column("json.timestamp"))
    .cast(TimestampType())
    .alias("parsed_timestamp"),
    column("json.*")
) \
    .withColumnRenamed("json.temperature", "temperature") \
    .withWatermark("parsed_timestamp", windowDuration)

temperatureDf = temperatureDf.groupBy(
    window(
        column("parsed_timestamp"),
        windowDuration,
        windowInterval
    )
).max("temperature").withColumnRenamed("max(temperature)", "max-temp")

temperatureDf = temperatureDf.where(col("max-temp") > 66)

temperatureStream = temperatureDf \
    .withColumnRenamed("window", "key").withColumnRenamed("max-temp", "value") \
    .selectExpr("CAST(key AS STRING)", "CAST(value AS STRING)") \
    .writeStream \
    .trigger(processingTime=windowInterval) \
    .format("kafka") \
    .option("kafka.bootstrap.servers", kafkaBootstrap) \
    .option("topic", "de.kevinsieverding.supervizor.temperature-warnings") \
    .option("checkpointLocation", "/tmp/checkpoints") \
    .start()

###############################################################################
# END
###############################################################################

spark.streams.awaitAnyTermination()
