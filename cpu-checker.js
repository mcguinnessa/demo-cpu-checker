const db_tools = require('./mongo_tools');
const {MongoClient} = require('mongodb');

const DAY_S = 24 * 60 * 60;
const DAY_MS = DAY_S * 1000;
const HOUR_MS = 60 * 60 * 1000;
const INTERVAL_S = 60 * 60;
const INTERVAL_MS = INTERVAL_S * 1000;

const max_cpu = 99;
const min_cpu = 4;
const normal_high = 21;
const spike_norm = 30;
const spike_peak = 70;


//nst hourly_weighting = [1, 2, 3, 4, 5, 6, 7, 8, 9 10, 11, 12, 13, 14 ,15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
const hourly_weighting = [1, 2, 1, 1, 1, 1, 2, 2, 5,  7,  8,  9, 10, 10, 10,  9,  7,  5,  5,  5,  5,  3,  2,  1]


function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getValue(a_timestamp){
  var record_hour = a_timestamp.getHours();
  weighting = hourly_weighting[record_hour % 24];

  var spike = 0;
//  if (spike == 0 ) {
  rand = Math.floor(Math.random() * 100)
  if (95 <= rand){
    console.log("Spike CPU");
    spike = Math.floor(Math.random() * spike_norm)
  } else if (1 >= rand){
    console.log("High Spike CPU");
    spike = Math.floor(Math.random() * spike_peak)
  }

//  } else if (spike > 0){
//     spike = 0 - spike;
//  } else {
//     spike = 0
//  }
  cpu_usage = min_cpu + (Math.floor(Math.random() * (((normal_high - min_cpu) / 10 ) * weighting)))
  cpu_usage += spike

  if (cpu_usage > max_cpu) {cpu_usage = max_cpu;}
  if (cpu_usage < min_cpu) {cpu_usage = min_cpu;}

  console.log("TIME:" + a_timestamp + " HOUR:" + record_hour + " WEIGHTING:" + weighting +" SPIKE:" + spike + " CPU:" + cpu_usage);
  return cpu_usage;
}


//async function getValue(a_timestamp){
//  var record_hour = a_timestamp.getHours();
//  weighting = hourly_weighting[record_hour % 24];
//
////  const ceiling = (max_cpu / 10) * weighting;
////  var cpu_usage = min_cpu + Math.floor(Math.random() * ceiling);
//  cpu_usage = min_cpu + Math.floor(Math.random() * (((max_cpu - min_cpu) / 10) * weighting))
//
//  //console.log("TIME:" + a_timestamp + " HOUR:" + record_hour + " WEIGHTING:" + weighting + " CEILING:" + ceiling + " CPU:" + cpu_usage);
//  console.log("TIME:" + a_timestamp + " HOUR:" + record_hour + " WEIGHTING:" + weighting + " CPU:" + cpu_usage);
//  return cpu_usage;
//}

async function run(){

  const uri = await db_tools.get_url();
  console.log("URI");
  console.log(uri);
  const client = new MongoClient(uri);


  try {
    const database = client.db(db_tools.DB_NAME);
    const metric_record = database.collection(db_tools.COLLECTION_NAME);
    var now = new Date();

    const d_res = await metric_record.deleteMany({"$and": [{timestamp: {"$lt": now }}, { "cpuUsage": {$exists : true } }]} )
    console.log("Delete:" + d_res.deletedCount);

//    metric_record.deleteMany({"$and": [{timestamp: {"$lt": now }}, { "cpuUsage": {$exists : true } }]} , (err, d_res) => {
//      if (err) throw err;
//      console.log("Delete:" + d_res.deleteCount);
//    })

    var last_week = new Date(now - (DAY_MS * 7));
    var date_record = last_week;
    console.log("Last Week:" + last_week)

    while (date_record <= now){

      cpu_usage = await getValue(date_record); 
//      var record_hour = date_record.getHours();
//      weighting = hourly_weighting[record_hour];

 //     const ceiling = (max_cpu / 10) * weighting;
//      var cpu_usage = min_cpu + Math.floor(Math.random() * ceiling);
//      cpu_usage = (max_cpu / 10) * random_num;

      const doc = {
        timestamp: date_record,
        "cpuUsage": cpu_usage,
      }  

      const result = await metric_record.insertOne(doc);
//      console.log(`A document was inserted with the _id: ${result.insertedId}` + " CPU:" + cpu_usage);
      //date_record = new Date(date_record.getTime() + INTERVAL_MS);
	    
      date_record = new Date(date_record.getTime() + INTERVAL_MS);
      //date_record.setMinutes(date_record.getMinutes() + 10);
      //console.log("DATE:" + date_record)
    }

    while (true) {
       console.log("Sleeping for " + INTERVAL_MS)
       await sleep(INTERVAL_MS);
       var right_now = new Date();
       cpu_usage = await getValue(right_now);
       const doc = {
         timestamp: right_now,
         "cpuUsage": cpu_usage,
       }  

       const result = await metric_record.insertOne(doc);
       console.log(`A document was inserted with the _id: ${result.insertedId}` + " CPU:" + cpu_usage);
    }

  } finally {
    await client.close();
  }
}
run().catch(console.dir);
