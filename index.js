const express = require("express");
const bodyParser = require("body-parser");
const lowdb = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync("db.json");
const db = lowdb(adapter);

// Add sensible defaults in case the db file is empty
db.defaults({
  nodes: [],
  config: {}
}).write();

// COLOR CODES:
// Flash blue: Connected to API but no config set
// Flash yellow: Connected to API but error in config
// Flash red: No connection to API

// Logical default to send if we don't have a defined config
const defaultNode = {
  id: null,
  state: 1, // 0 = Off, 1 = On
  name: "default",
  r0: 20, // Red value for color 0
  g0: 100, // Green value for color 0
  b0: 200, // Blue value for color 0
  pattern: "static",
  brightness: 200, // Brightness can be 0 - 255
  delay: 1000
};

const app = express();

// Configure server to user body-parser for post requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Root test endpoint
app.get("/", (req, res) => {
  res.send("Flux API online.\n");
});

// Endpoint requested by LED node to get its own config
app.get("/config/node", (req, res) => {
  const ID = req.param("id") || null;
  const stringify = req.param("stringify") || null; // Stringify double encodes the JSON for the C++ Node

  const nodeConfig = db
    .get("nodes")
    .find({ id: ID })
    .value();

  if (stringify) {
    // eg ...&stringify=true
    res.send(JSON.stringify(JSON.stringify(nodeConfig || defaultNode))); // Double encode to escape quotes for use with arduinoJSON library
  } else {
    // Send the default config if we don't have id listed for that value
    res.send(nodeConfig || defaultNode);
  }
});

// Endpoint requested by flux app when updating an LED node config
app.post("/config/node", (req, res) => {
  const existingNode = db
    .get("nodes")
    .find({ id: req.body.id })
    .value();

  // Node doesnt exist, add a new one to database
  if (!existingNode) {
    // Capture parameters
    let node = {};
    node.id = req.body.id; // Required
    node.state = req.body.state; // Required
    node.name = req.body.name; // Required
    node.r0 = req.body.r0; // Required
    node.g0 = req.body.g0; // Required
    node.b0 = req.body.b0; // Required
    node.pattern = req.body.pattern || "static";
    node.brightness = req.body.brightness || 200;
    node.delay = req.body.delay || 1000;

    // Add new config to db
    db.get("nodes")
      .push(node)
      .write();
    res.send({
      message: `New node added to DB successfully`,
      node: node
    });
  } else {
    // Node does exist, update existing
    db.get("nodes")
      .find({ id: req.body.id })
      .assign({
        state: req.body.state, // Required
        name: req.body.name, // Required
        r0: req.body.r0, // Required
        g0: req.body.g0, // Required
        b0: req.body.b0, // Required
        pattern: req.body.pattern || "static",
        brightness: req.body.brightness || 200,
        delay: req.body.delay || 1000
      })
      .write();

    newNode = db
      .get("nodes")
      .find({ id: req.body.id })
      .value();

    res.send({
      message: `Existing node updated successfully`,
      node: newNode
    });
  }
});

// Run the server
const PORT = process.env.PORT || 5000;
app.listen(PORT);
console.log(`Server running on localhost:${PORT}...`);
