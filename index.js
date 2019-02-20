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
  name: "default",
  color0: "#42b0f4",
  color1: "",
  color2: "",
  pattern: "flash",
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

  const nodeConfig = db
    .get("nodes")
    .find({ id: ID })
    .value();

  // Send the default config if we don't have id listed for that value
  res.send(nodeConfig || defaultNode);
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
    node.name = req.body.name; // Required
    node.color0 = req.body.color0; // Required
    node.color1 = req.body.color1 || null;
    node.color2 = req.body.color2 || null;
    node.pattern = req.body.pattern || "static";
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
        name: req.body.name, // Required
        color0: req.body.color0, // Required
        color1: req.body.color1 || null,
        color2: req.body.color2 || null,
        pattern: req.body.pattern || "static",
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
