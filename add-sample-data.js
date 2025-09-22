// add-sample-data.js
// Run this ONCE: node add-sample-data.js
// Then delete this file after running

const mongoose = require("mongoose");
require("dotenv").config();

// Connect to MongoDB
const mongoUrl =
  process.env.MONGODB_URL || "mongodb://localhost:27017/parsswim";

// Define schemas (must match server.js exactly)
const classSchema = new mongoose.Schema({
  title: String,
  classType: String,
  description: String,
  duration: Number,
  date: Date,
  time: String,
  maxStudents: Number,
  currentStudents: { type: Number, default: 0 },
  price: Number,
  instructor: String,
  location: { type: String, default: "استخر اصلی" },
  isActive: { type: Boolean, default: true },
});

const productSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  description: String,
  image: String,
  inStock: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
});

const Class = mongoose.model("Class", classSchema);
const Product = mongoose.model("Product", productSchema);

async function addSampleData() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUrl);
    console.log("Connected!");

    // Add 2 new products
    const products = [
      {
        name: "کلاه شنای حرفه‌ای سیلیکونی",
        price: 85000,
        category: "swimequipment",
        description: "کلاه شنای سیلیکونی ضد آب با کیفیت عالی",
        image: "/images/products/swim-cap.jpg",
        inStock: true,
        isActive: true,
      },
      {
        name: "عینک شنای ضد بخار Speedo",
        price: 320000,
        category: "swimgoggles",
        description: "عینک شنای حرفه‌ای با تکنولوژی ضد بخار و محافظ UV",
        image: "/images/products/speedo-goggles.jpg",
        inStock: true,
        isActive: true,
      },
    ];

    console.log("Adding products...");
    for (const product of products) {
      const newProduct = new Product(product);
      await newProduct.save();
      console.log(`Added product: ${product.name}`);
    }

    // Add 1 new class (set for next week)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const newClass = {
      title: "کلاس آموزش شنای پروانه",
      classType: "کلاس آمادگی مسابقات",
      description: "آموزش تخصصی شنای پروانه برای شناگران متوسط و حرفه‌ای",
      duration: 90,
      date: nextWeek,
      time: "18:00",
      maxStudents: 8,
      currentStudents: 2,
      price: 450000,
      instructor: "مربی اول",
      location: "استخر اصلی",
      isActive: true,
    };

    console.log("Adding class...");
    const classDoc = new Class(newClass);
    await classDoc.save();
    console.log(`Added class: ${newClass.title}`);

    console.log("\n✅ Successfully added sample data!");
    console.log("You can now delete this file.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed.");
    process.exit(0);
  }
}

// Run the function
addSampleData();
