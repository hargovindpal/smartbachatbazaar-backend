const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");
const streamifier = require("streamifier");

const app = express();

// ✅ IMPORTANT FOR RENDER
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ---------------------------------------------------
// ✅ CLOUDINARY CONFIG
// ---------------------------------------------------
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage instead of disk
const upload = multer({ storage: multer.memoryStorage() });

// ---------------------------------------------------
// ✅ DATA PATH
// ---------------------------------------------------
const dataPath = path.join(__dirname, "data", "products.json");

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
// ✅ ADD Product (Cloudinary Upload)
// ---------------------------------------------------
app.post("/products", upload.single("image"), async (req, res) => {
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

    // Upload image to Cloudinary
    const uploadFromBuffer = () =>
      new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "smartbachatbazaar" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });

    const result = await uploadFromBuffer();

    // Ensure JSON file exists
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
      item_image: result.secure_url,  // 🔥 Cloudinary URL
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