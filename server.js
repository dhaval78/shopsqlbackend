const express = require("express");
const db = require("./dbconnection.js");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin");
  res.header(
    "Access-Control-Methods",
    "GET,POST,OPTIONS,PUT,PATCH,DELETE,HEAD"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept"
  );
  next();
});
app.use(cors());
app.get("/", (req, res) => {
  res.send("Backend is working fine");
});


app.get("/shops", async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM shops`);
    let x=await db.query(`select count('x') as maxlength from shops `)
    let shopId= x.rows[0].maxlength
    console.log(parseInt(shopId)+1);
    res.json(result.rows);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post('/shops', async(req, res) => {
  try {
    const { shopname,rent } = req.body;
    let x=await db.query(`select count('x') as maxlength from shops `)
    let shopId= x.rows[0].maxlength
    const insertQuery = `
      INSERT INTO shops ( "shopid","shopname","rent")
      VALUES ( $1, $2, $3)
    `;
    const values = [ parseInt(shopId)+1,shopname,rent];

    await db.query(insertQuery, values);

    res.json({ message: `New shop created` });
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post('/purchases', async(req, res) => {
  try {
    const { shopid,productid,quantity,price } = req.body;
    let x=await db.query(`select count('x') as maxlength from purchases `)
    let purchaseid= x.rows[0].maxlength
    const insertQuery = `
      INSERT INTO purchases ( purchaseid,shopid,productid,quantity,price)
      VALUES ( $1, $2, $3 , $4, $5)
    `;
    const values = [ parseInt(purchaseid)+1,shopid,productid,quantity,price];

    await db.query(insertQuery, values);

    res.json({ message: `New purchase item created` });
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



app.get("/products", async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM products`);

    res.json(result.rows);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post('/products', async(req, res) => {
  try {
    const {productname,category,description } = req.body;
    let x=await db.query(`select count('x') as maxlength from products `)
    let productid= x.rows[0].maxlength
    const insertQuery = `
      INSERT INTO products ( "productid","productname","category","description")
      VALUES ( $1, $2, $3, $4)
    `;

    const values = [parseInt(productid)+1,productname,category,description];

    await db.query(insertQuery, values);

    res.json({ message: `New product created` });
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/products/:id", async (req, res) => {
  try {
    const id = +req.params.id;
    const { category,description } = req.body;

    const sql = `
      UPDATE products
      SET
        category= $1,
        description = $2
      WHERE productid = $3
    `;

    const values = [category,description,id];

    await db.query(sql, values);

    res.json({ message: `Product with id ${id} updated` });
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/product/:id", async (req, res) => {
  try {

    const sql = `SELECT * FROM products WHERE "productid"= $1`;
    const id=+req.params.id;
    const value=[id];
    let result= await db.query(sql,value)
    res.json(result.rows);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.get("/purchases/shops/:id", async (req, res) => {
  try {
    const shopId = +req.params.id;
    const result = await db.query(`SELECT * FROM purchases WHERE shopid = $1`, [shopId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.get("/purchases/products/:id", async (req, res) => {
  try {
    const productId = +req.params.id;
    const result = await db.query(`SELECT * FROM purchases WHERE productid = $1`, [productId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/purchases", async (req, res) => {
  try {
    const { shop, product, sort } = req.query;
    let sql = "SELECT * FROM purchases";

    let shopIds = Array.isArray(shop) ? shop.map(Number) : [Number(shop)];

    shopIds = shopIds.filter((id) => !isNaN(id));

    const conditions = [];

    if (shopIds.length > 0) {
      conditions.push(`shopid IN (${shopIds.join(",")})`);
    }

    if (product) {
      const productId = +product;
      conditions.push(`productid = ${productId}`);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    if (sort) {
      switch (sort) {
        case "QtyAsc":
          sql += ` ORDER BY "quantity" ASC`;
          break;
        case "QtyDesc":
          sql += ` ORDER BY "quantity" DESC`;
          break;
        case "ValueAsc":
          sql += ` ORDER BY (price * quantity) ASC`;
          break;
        case "ValueDesc":
          sql += ` ORDER BY (price * quantity) DESC`;
          break;
        default:
          break;
      }
    }

    let result = await db.query(sql);
    console.log(sql);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




app.get("/totalPurchase/shop/:id", async (req, res) => {
  try {
    const shopId = +req.params.id;
    const sql = `
      SELECT p.productname, SUM(pr.quantity) as total_purchase
      FROM purchases pr
      JOIN products p ON pr.productid = p.productid
      WHERE pr.shopid = $1
      GROUP BY p.productname
    `;
    const result = await db.query(sql, [shopId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/totalPurchase/product/:id", async (req, res) => {
  try {
    const productId = +req.params.id;
    const sql = `
      SELECT s.shopname, SUM(pr.quantity) as total_purchase
      FROM purchases pr
      JOIN shops s ON pr.shopid = s.shopid
      WHERE pr.productid = $1
      GROUP BY s.shopname
    `;
    const result = await db.query(sql, [productId]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


app.get("/shop/resetData", async (req, res) => {
  try {
    await db.query("TRUNCATE table shops");
    await db.query("TRUNCATE table products");
    await db.query("TRUNCATE table purchases");

    let { shops,purchases,products } = require("./testData");
    let values = shops.map((shop) => [
      shop.shopId,
      shop.name,
      shop.rent
    ]);
    let values2 = products.map((p) => [
      p.productId,
      p.productName,
      p.category,
      p.description,
    ]);
    let values3 = purchases.map((p) => [
      p.purchaseId,
      p.shopId,
      p.productid,
      p.quantity,
      p.price,
    ]);

    const placeholders = values.map(
      (_, index) =>
        `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`
    );
    const placeholders2 = values2.map(
      (_, index) =>
        `($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4})`
    );
    const placeholders3 = values3.map(
      (_, index) =>
        `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3},$${index * 5 + 4},$${index * 5 + 5})`
    );
    const sql = `
    INSERT INTO shops (shopid, shopname, rent) 
      VALUES 
        ${placeholders.join(", ")}
    `;
    const sql2 = `
    INSERT INTO products (productid, productname, category,description) 
      VALUES 
        ${placeholders2.join(", ")}
    `;
    const sql3 = `
    INSERT INTO purchases (purchaseid, shopid, productid,quantity,price) 
      VALUES 
        ${placeholders3.join(", ")}
    `;


    const flattenedValues = [].concat(...values);
    const flattenedValues2 = [].concat(...values2);
    const flattenedValues3 = [].concat(...values3);
    await db.query(sql, flattenedValues);
    await db.query(sql2, flattenedValues2);
    await db.query(sql3, flattenedValues3);

    res.json({ message: `Data reset ${values.length} rows inserted into shops`,
  message2:`Data reset ${values2.length} rows inserted into products`,
  message3:`Data reset ${values3.length} rows inserted into purchases`
  });
  } catch (error) {
    console.error("Error executing query:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



const port = process.env.PORT || 2410;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
