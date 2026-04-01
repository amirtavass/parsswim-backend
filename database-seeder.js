const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();

const User = require("./models/user");
const Class = require("./models/class");
const Product = require("./models/product");

const mongoUrl =
  process.env.MONGODB_URL || "mongodb://localhost:27017/parsswim";

const sampleClasses = [
  {
    title: "Beginner Swimming Class",
    classType: "Free Trial Session",
    description:
      "Free session for newcomers to learn basic swimming techniques",
    duration: 60,
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    time: "10:00",
    maxStudents: 8,
    currentStudents: 0,
    price: 0,
    instructor: "Primary Coach",
    location: "Main Pool",
    requiresRegistration: true,
    isActive: true,
  },
  {
    title: "Professional Private Class",
    classType: "Private 12-Session",
    description: "Specialized and personalized swimming instruction",
    duration: 90,
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    time: "14:00",
    maxStudents: 1,
    currentStudents: 0,
    price: 850000,
    instructor: "Primary Coach",
    location: "Main Pool",
    requiresRegistration: true,
    isActive: true,
  },
  {
    title: "Parent & Child Swimming",
    classType: "Parent & Child",
    description: "Family swimming experience for parents and children",
    duration: 75,
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    time: "16:30",
    maxStudents: 6,
    currentStudents: 2,
    price: 450000,
    instructor: "Both Coaches",
    location: "Main Pool",
    requiresRegistration: true,
    isActive: true,
  },
  {
    title: "Competition Training",
    classType: "Competition Prep",
    description: "Advanced training for competitive swimming techniques",
    duration: 120,
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
    time: "18:00",
    maxStudents: 4,
    currentStudents: 1,
    price: 650000,
    instructor: "Secondary Coach",
    location: "Main Pool",
    requiresRegistration: true,
    isActive: true,
  },
];

const sampleProducts = [
  {
    name: "Professional Nike Swimsuit",
    price: 450000,
    category: "swimwear",
    description:
      "High-quality athletic swimsuit suitable for training and competition",
    image: "/images/swimwear/swimwear-1.jpg",
    inStock: true,
    quantity: 15,
    brand: "Nike",
    isActive: true,
  },
  {
    name: "Speedo Swimming Goggles",
    price: 180000,
    category: "swimgoggles",
    description: "Anti-fog swimming goggles with adjustable strap",
    image: "/images/swimgoggles/goggles-1.jpg",
    inStock: true,
    quantity: 25,
    brand: "Speedo",
    isActive: true,
  },
  {
    name: "Arena Swimming Fins",
    price: 320000,
    category: "swimfins",
    description: "Flexible fins for strengthening leg muscles",
    image: "/images/swimfin/fin-1.jpg",
    inStock: true,
    quantity: 12,
    brand: "Arena",
    isActive: true,
  },
  {
    name: "Silicone Swimming Cap",
    price: 85000,
    category: "swimequipment",
    description: "Waterproof and comfortable swimming cap",
    image: "/images/equipment/cap-1.jpg",
    inStock: true,
    quantity: 30,
    brand: "Speedo",
    isActive: true,
  },
  {
    name: "Sports Swimming Bag",
    price: 125000,
    category: "swimequipment",
    description: "Water-resistant bag with multiple compartments",
    image: "/images/equipment/backpack-1.jpg",
    inStock: true,
    quantity: 8,
    brand: "Nike",
    isActive: true,
  },
];

// Sample Users for testing
const sampleUsers = [
  {
    name: "testuser",
    email: "testuser@parsswim.ir",
    phone: "+989123456789",
    password: bcrypt.hashSync("password123", 8), // Pre-hash password
    age: 25,
    balance: 1000000,
    swimmingType: "normal",
    skillLevel: "beginner",
    role: "student",
  },
  {
    name: "testadmin",
    email: "admin@parsswim.ir",
    phone: "+989198765432",
    password: bcrypt.hashSync("admin123456", 8), // Pre-hash password
    age: 35,
    balance: 0,
    swimmingType: "competition",
    skillLevel: "advanced",
    role: "admin",
  },
  {
    name: "john_swimmer",
    email: "john@parsswim.ir",
    phone: "+989101111111",
    password: bcrypt.hashSync("john123456", 8),
    age: 30,
    balance: 2500000,
    swimmingType: "normal",
    skillLevel: "intermediate",
    role: "student",
  },
];

async function seedDatabase() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(mongoUrl);
    console.log("✅ Connected to MongoDB");

    // Clear existing data
    console.log("🔄 Clearing existing data...");
    await User.deleteMany({});
    await Class.deleteMany({});
    await Product.deleteMany({});
    console.log("✅ Existing data cleared");

    // Add sample users
    console.log("🔄 Adding sample users...");
    await User.insertMany(sampleUsers);
    console.log(`✅ Added ${sampleUsers.length} users`);

    // Add sample classes
    console.log("🔄 Adding sample classes...");
    await Class.insertMany(sampleClasses);
    console.log(`✅ Added ${sampleClasses.length} classes`);

    // Add sample products
    console.log("🔄 Adding sample products...");
    await Product.insertMany(sampleProducts);
    console.log(`✅ Added ${sampleProducts.length} products`);

    console.log("🎉 Database seeded successfully!");

    // Verify data
    const userCount = await User.countDocuments();
    const classCount = await Class.countDocuments();
    const productCount = await Product.countDocuments();
    console.log(`📊 Total users: ${userCount}`);
    console.log(`📊 Total classes: ${classCount}`);
    console.log(`📊 Total products: ${productCount}`);

    // Display test credentials
    console.log("\n🔑 Test Credentials:");
    console.log("━".repeat(50));
    console.log("👤 Student: testuser / password123");
    console.log("👤 Alternate: john_swimmer / john123456");
    console.log("🔐 Admin: testadmin / admin123456");
    console.log("━".repeat(50));
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔒 Database connection closed");
    process.exit(0);
  }
}

// Run the seeder
seedDatabase();
