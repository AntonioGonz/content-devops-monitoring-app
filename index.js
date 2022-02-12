// Require and call Express
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

// Collect default
var responseTime = require('response-time');

const client = require('prom-client');
const { process_params } = require('express/lib/router');
const { response } = require('express');
const collectDefaultMetrics = client.collectDefaultMetrics;
const prefix = 'app';
collectDefaultMetrics({ prefix });

// Metrics list
const todocounter = new client.Counter({
  name: 'app_number_of_new_todos',
  help: 'The number of new tasks added to our app'
});

const todogauge = new client.Gauge({
  name: 'app_current_todos',
  help: 'amount_of_incomplete_tasks'
});

const tasksumm = new client.Summary({
  name: 'app_requests_summary',
  help: 'Latency in percentiles'

})

const taskhist = new client.Histogram({
  name: 'app_requests_histogram',
  help: 'Latency in histogram form',
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10]
})

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// use css
app.use(express.static("public"));

// placeholder tasks
var task = [];
var complete = [];

// add a task
app.post("/addtask", function(req, res) {
  var newTask = req.body.newtask;
  task.push(newTask);
  res.redirect("/");
  todocounter.inc();
  todogauge.inc();
});

// remove a task
app.post("/removetask", function(req, res) {
  var completeTask = req.body.check;
  if (typeof completeTask === "string") {
    complete.push(completeTask);
    task.splice(task.indexOf(completeTask), 1);
  }
  else if (typeof completeTask === "object") {
    for (var i = 0; i < completeTask.length; i++) {
      complete.push(completeTask[i]);
      task.splice(task.indexOf(completeTask[i]), 1);
    }
  }
  res.redirect("/");
  todogauge.dec();
});

// track response time
app.use(responseTime(function (req, res, time) {
  tasksumm.observe(time);
  taskhist.observe(time);
}))

// get website files
app.get("/", function (req, res) {
  res.render("index", { task: task, complete: complete });
});

app.get("/metrics", async function (req,res) {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// listen for connections
app.listen(8080, function() {
  console.log('Testing app listening on port 8080')
});
