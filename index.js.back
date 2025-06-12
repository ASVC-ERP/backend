const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "db_ims",
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed: ", err);
    return;
  }
  console.log("Connected to MySQL database");
});

//get all items from tbl_items
app.get("/items", (req, res) => {
  const sql = `
    SELECT 
      i.itemCode,
      i.itemName,
      i.brand,
      i.origin,
      i.photo,
      i.stock,
      p.original,
      p.markup1,
      p.markup2
    FROM tbl_items i
    JOIN tbl_prices p ON i.priceID = p.priceID
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching items with prices:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(results);
  });
});

//get all orders from tbl_orders
app.get("/orders", (req, res) => {
  const sql = `
    SELECT 
      o.orderId, o.date, o.customerName, o.customerNumber, o.customerAddress,
      o.delivery, o.salesAgent, o.status, o.totalPrice,
      oi.itemCode, i.itemName, i.stock, i.photo,
      p.original, p.markup1, p.markup2,
      oi.selectedMarkup, oi.quantity
    FROM tbl_orders o
    JOIN tbl_orderItems oi ON o.orderId = oi.orderID
    JOIN tbl_items i ON oi.itemCode = i.itemCode
    JOIN tbl_prices p ON oi.priceID = p.priceID
    ORDER BY o.orderId, oi.itemCode
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching orders:", err);
      return res.status(500).json({ error: "Database error" });
    }

    // Transform rows into nested order object
    const orders = {};

    results.forEach((row) => {
      if (!orders[row.orderId]) {
        orders[row.orderId] = {
          orderId: row.orderId,
          date: row.date,
          customerName: row.customerName,
          customerNumber: row.customerNumber,
          customerAddress: row.customerAddress,
          delivery: row.delivery,
          salesAgent: row.salesAgent,
          status: row.status,
          totalPrice: row.totalPrice,
          orderItems: [],
        };
      }

      orders[row.orderId].orderItems.push({
        itemCode: row.itemCode,
        itemName: row.itemName,
        stock: row.stock,
        photo: row.photo,
        price: {
          original: row.original,
          markup1: row.markup1,
          markup2: row.markup2,
        },
        selectedMarkup: row.selectedMarkup,
        quantity: row.quantity,
      });
    });

    res.json(orders);
  });
});

//post new item to tbl_items and tbl_prices
app.post("/add_item", (req, res) => {
  const {
    itemCode,
    itemName,
    brand,
    origin,
    photo,
    stock,  
    price, // object with original, markup1, markup2
  } = req.body;

  // First insert into tbl_prices
  const priceSql = `INSERT INTO tbl_prices (original, markup1, markup2) VALUES (?, ?, ?)`;
  db.query(
    priceSql,
    [price.original, price.markup1, price.markup2],
    (err, priceResult) => {
      if (err) {
        console.error("Error inserting price:", err);
        return res
          .status(500)
          .json({ error: "Database error inserting price" });
      }

      const priceID = priceResult.insertId;

      // Then insert into tbl_items with priceID
      const itemSql = `INSERT INTO tbl_items (itemCode, itemName, brand, origin, photo, priceID, stock) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      db.query(
        itemSql,
        [itemCode, itemName, brand, origin, photo, priceID, stock],
        (err, itemResult) => {
          if (err) {
            console.error("Error inserting item:", err);
            return res
              .status(500)
              .json({ error: "Database error inserting item" });
          }

          res.json({
            message: "Item inserted successfully",
            itemID: itemResult.insertId,
          });
        }
      );
    }
  );
});

app.get("/", (req, res) => {
  res.send("Hello, Node.js Server!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
