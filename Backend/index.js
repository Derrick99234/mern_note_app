require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./src/app");

mongoose.connect(process.env.DBURI);

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

module.exports = app;
