require("dotenv").config();
const express = require("express");
const cors = require("cors");

const researchRoutes = require("./routes/research");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Ananta research backend is running.",
    endpoints: [
      "POST /api/search        { query, num? }",
      "POST /api/fetch-content { url }",
      "POST /api/find-term     { url? , text?, term }",
      "POST /api/summarize     { url?, text? }",
    ],
  });
});

app.use("/api", researchRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Ananta backend running on http://localhost:${PORT}`);
});
