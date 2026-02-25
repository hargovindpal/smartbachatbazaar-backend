const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v2: cloudinary } = require("cloudinary");
const streamifier = require("streamifier");

const app = express();
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

const upload = multer({ storage: multer.memoryStorage() });

// ---------------------------------------------------
// ✅ DATA PATH
// ---------------------------------------------------
const dataPath = path.join(__dirname, "data", "products.json");

// Utility: Ensure JSON exists
function ensureDataFile() {
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, "[]");
  }
}

// Utility: Read products
function readProducts() {
  ensureDataFile();
  const raw = fs.readFileSync(dataPath);
  return raw.length ? JSON.parse(raw) : [];
}

// Utility: Save products
function saveProducts(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// ---------------------------------------------------
// ✅ GET ALL PRODUCTS
// ---------------------------------------------------
app.get("/products", (req, res) => {
  try {
    const products = readProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------
// ✅ ADD PRODUCT (Cloudinary Upload)
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

    if (!category) return res.status(400).json({ error: "Category required" });
    if (!req.file) return res.status(400).json({ error: "Image required" });

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

    const data = readProducts();

    const maxId =
      data.length > 0
        ? Math.max(...data.map((p) => Number(p.id) || 199))
        : 199;

    const newProduct = {
      id: (maxId + 1).toString(),
      item_info,
      seller: "Sanjay Smart Gadgets",
      current_price: Number(current_price),
      actual_price: Number(actual_price),
      discount: Number(discount),
      delivery: Number(delivery),
      offer,
      category,
      item_image: result.secure_url,
    };

    data.push(newProduct);
    saveProducts(data);

    res.json({ message: "Product added", product: newProduct });
  } catch (error) {
    console.error("SERVER ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------
// ✅ DELETE PRODUCT
// ---------------------------------------------------
app.delete("/products/:id", (req, res) => {
  try {
    const { id } = req.params;

    let data = readProducts();
    const filtered = data.filter((p) => p.id !== id);

    if (data.length === filtered.length) {
      return res.status(404).json({ error: "Product not found" });
    }

    saveProducts(filtered);
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------
// ✅ UPDATE PRODUCT (EDIT)
// ---------------------------------------------------
app.put("/products/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    let data = readProducts();

    const index = data.findIndex((p) => p.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Product not found" });
    }

    const {
      item_info,
      current_price,
      actual_price,
      discount,
      delivery,
      category,
      offer,
    } = req.body;

    let imageUrl = data[index].item_image;

    // If new image uploaded → update in Cloudinary
    if (req.file) {
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
      imageUrl = result.secure_url;
    }

    data[index] = {
      ...data[index],
      item_info,
      current_price: Number(current_price),
      actual_price: Number(actual_price),
      discount: Number(discount),
      delivery: Number(delivery),
      category,
      offer,
      item_image: imageUrl,
    };

    saveProducts(data);
    res.json({ message: "Product updated successfully", product: data[index] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});