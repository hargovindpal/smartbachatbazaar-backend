const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();

// ✅ IMPORTANT FOR RENDER
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------
// ✅ Proper Paths
// ---------------------------------------------------
const publicPath = path.join(__dirname, "../public");
const dataPath = path.join(__dirname, "data", "products.json");

// Serve React static if needed (optional for Render backend)
app.use(express.static(publicPath));

// ---------------------------------------------------
// ✅ MULTER SETUP
// ---------------------------------------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const category = req.body.category;

    const uploadPath = path.join(
      publicPath,
      "item-category",
      category
    );

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ---------------------------------------------------
// ✅ GET All Products
// ---------------------------------------------------
app.get("/products", (req, res) => {
  try {
    if (!fs.existsSync(dataPath)) {
      return res.json([]);
    }

    const data = fs.readFileSync(dataPath);
    res.json(JSON.parse(data));

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------
// ✅ ADD Product
// ---------------------------------------------------
app.post("/products", upload.single("image"), (req, res) => {
  try {
    const {
      item_info,
      current_price,
      actual_price,
      discount,
      delivery,
      category,
      offer,
    } = req.body;

    if (!category) {
      return res.status(400).json({ error: "Category required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Image required" });
    }

    if (!fs.existsSync(dataPath)) {
      fs.writeFileSync(dataPath, "[]");
    }

    const raw = fs.readFileSync(dataPath);
    const data = raw.length ? JSON.parse(raw) : [];

    let maxId = 199;
    if (data.length > 0) {
      maxId = Math.max(...data.map(p => Number(p.id) || 199));
    }

    const newId = (maxId + 1).toString();

    const newProduct = {
      id: newId,
      item_info,
      seller: "Sanjay Smart Gadgets",
      current_price: Number(current_price),
      actual_price: Number(actual_price),
      discount: Number(discount),
      delivery: Number(delivery),
      offer,
      category,
      item_image: `/item-category/${category}/${req.file.filename}`,
    };

    data.push(newProduct);

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    res.json({ message: "Product added", product: newProduct });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});