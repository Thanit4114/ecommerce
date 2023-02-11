let express = require('express');
let router = express.Router();
let conn = require('./connect');
let jwt = require('jsonwebtoken');
let secretCode = 'myecom2023secret';
let session = require('express-session');
let formidable = require('formidable');
let fs = require('fs');
let numeral = require('numeral');
let dayjs = require('dayjs');
let dayFormat = 'DD/MM/YYYY';

router.use(session({
  secret: 'sessionforprojectlnw',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000
  }
}))

router.use((req, res, next) => {
  res.locals.session = req.session;
  res.locals.numeral = numeral;
  res.locals.dayjs = dayjs;
  res.locals.dayFormat = dayFormat;
  next();
});
/* GET home page. */
router.get('/', async function(req, res, next) {
  let conn = require('./connect2');
  let params = [];
  let sql = ' SELECT * FROM tb_product'; 

  if (req.query.search != undefined) {
    sql += ' WHERE name LIKE(?)'
    params.push('%' + req.query.search + '%');
  }

  if (req.query.groupProductId != undefined) {
    sql += ' WHERE group_product_id = ?';
    params.push(req.query.groupProductId);  
  }

  sql += ' ORDER BY id DESC';

  try {
  let [products, fields] = await conn.query(sql, params);
  sql = 'SELECT * FROM tb_group_product ORDER BY name ASC';
  let [groupProducts, fieldsGroupProduct] = await conn.query(sql);

    if (req.session.card == undefined) {
      req.session.card = [ ];

    }
    res.render('index', {product: products, groupProducts: groupProducts});
  } catch (e) {
    res.send('Error: ' + e); 
  }
  });

router.get('/login', (req, res) => {
  res.render('login');
})

router.post('/login', (req, res) => {
  let sql = 'SELECT * FROM tb_user WHERE usr = ? AND pwd = ?';
  let params = [
    req.body['usr'],
    req.body['pwd']
  ]

  conn.query(sql, params, (err, result) => {
    if (err) throw err;

    if (result.length > 0) {
      //login pass
    let id = result[0].id;
    let name = result[0].name;
    let token = jwt.sign({id: id, name: name}, secretCode);

    req.session.token = token;
    req.session.name = name;

    res.redirect('/home');
    } else {
      res.send('username or password Invalid');
    }
  })
})

function isLogin(req, res, next) {
  if (req.session.token != undefined) {
    next();
  } else {
    res.redirect('/login');
  }
}

router.get('/home', isLogin, (req, res, next) => {
res.render('home');
})
router.get('/logout', isLogin, (req, res) => {
  req.session.destroy();
  res.redirect('/login');
})

router.get('/changeProfile', isLogin, (req, res) => {
  let data = jwt.verify(req.session.token, secretCode);
  let sql = 'SELECT * FROM tb_user WHERE id = ?';
  let params = [data.id];
  
  conn.query(sql, params, (err, result) => {
    if (err) throw err;
    res.render('changeProfile', {user: result[0]});
  })
})

router.post('/changeProfile', isLogin, (req, res) => {
  let sql = 'UPDATE tb_user SET name = ?, usr = ?';
 let params = [
    req.body['name'],
    req.body['usr']
  ];

  if (req.body['pwd'] != undefined) {
    sql += ', pwd = ?';
    params.push(req.body['pwd']);
  }
 

  conn.query(sql, params, (err, result) => {
    if (err) throw err;
    req.session.message = 'Save Success'
    res.redirect('/changeProfile');
  })
})

router.get('/user', isLogin, (req, res) => {
  let sql = 'SELECT * FROM tb_user ORDER BY id DESC';
  conn.query(sql, (err, result) => {
    if (err) throw err;
    res.render('user', {users: result})
  })
})

router.get('/addUser', isLogin, (req, res) => {
  res.render('addUser', {user: {}});
})

router.post('/addUser', isLogin, (req, res) => {
  let sql = 'INSERT INTO tb_user SET ?';
  let params = req.body;
  conn.query(sql, params, (err, result) => {
    if (err) throw err;
    res.redirect('/user');
  })
})

router.get('/editUser/:id', isLogin, (req, res) => {
  let sql = 'SELECT * FROM tb_user WHERE id = ?';
  let params = req.params.id;
  conn.query(sql, params, (err, result) => {
    if (err) throw err;
    res.render('addUser', {user: result[0]});
  })
})
   router.post('/editUser/:id', isLogin, (req, res) => {
    let sql = 'UPDATE tb_user SET name = ?, usr = ?, pwd = ?, level = ? WHERE id = ?'
    let params =[ 
      req.body['name'],
      req.body['usr'],
      req.body['pwd'],
      req.body['level'],
      req.params.id
    ]

    conn.query(sql, params, (err, result) => {
      if (err) throw err;
      res.redirect('/user');
    })
   })

   router.get('/deleteUser/:id', isLogin, (req, res) => {
    let sql = 'DELETE FROM tb_user WHERE id = ?';
    let params = req.params.id;
    conn.query(sql, params, (err, result) => {
      if (err) throw err;
      res.redirect('/user');
    })
   })

   router.get('/groupProduct',isLogin, (req, res) => {
    let sql = 'SELECT * FROM tb_group_product ORDER BY id DESC';
    conn.query(sql, (err, result) => {
      if (err) throw err;
      res.render('groupProduct', {groupProduct: result});
    })
   
   })

   router.get('/addGroupProduct',isLogin, (req, res) => {
    res.render('addGroupProduct', { groupProduct: {} });
   }) 

   router.post('/addGroupProduct', isLogin, (req, res) => {
    let sql = 'INSERT INTO tb_group_product SET ?';
    let params = req.body;
    conn.query(sql, params, (err, result) => {
      if (err) throw err;
      res.redirect('/groupProduct');
    })
   })

   router.get('/editGroupProduct/:id', isLogin, (req, res) => {
    let sql = 'SELECT * FROM tb_group_product WHERE id = ?';
    let params = req.params.id;
    conn.query(sql, params, (err, result) => {
      if (err) throw err;
      res.render('addGroupProduct', {groupProduct: result[0] });
    })
   })

   router.post('/editGroupProduct/:id', isLogin, (req, res) => {
    let sql = 'UPDATE tb_group_product SET name = ? WHERE id = ?';
    let params = [
      req.body['name'],
      req.params.id
    ]
    conn.query(sql, params, (err, result) => {
      if(err) throw err;
      res.redirect('/groupProduct');
    })
   })

   router.get('/deletegroupProduct/:id', isLogin,(req, res) => {
    let sql = 'DELETE FROM tb_group_product WHERE id = ?';
    let params = [req.params.id];
    conn.query(sql, params, (err, result) => {
      if(err) throw err;
      res.redirect('/groupProduct');
    })
   })

   router.get('/product', isLogin, (req, res) => {
    let sql = '' +
      ' SELECT tb_product.*, tb_group_product.name AS group_product_name FROM tb_product' + 
      ' LEFT JOIN tb_group_product ON tb_group_product.id = tb_product.group_product_id'+
      ' ORDER BY tb_product.id DESC';
    conn.query (sql, (err, result) => {
      if (err) throw err;
      res.render('product', { product: result });
    })
   })

   router.get('/addProduct', isLogin, (req, res) => {
    let sql = 'SELECT * FROM tb_group_product ORDER BY name';
    conn.query(sql, (err, result) => {
      if (err) throw err;
      res.render('addProduct', { product: { }, groupProduct: result });
    })
   })

   router.post('/addProduct', isLogin, (req, res) => {
    let form = new formidable.IncomingForm();
    form.parse(req, (err, fields, file) => {
      let filePath = file.img.filepath;
      let newPath = 'D://Full stack/workshop-ecom/app/public/images/';
      newPath += file.img.originalFilename;

      fs.copyFile(filePath, newPath, () => {
      //insert to database
        let sql = 'INSERT INTO tb_product(group_product_id, barcode, name, cost, price, img) VALUE(?,?,?,?,?,?)'
        let params = [
          fields['group_product_id'],
          fields['barcode'],
          fields['name'],
          fields['cost'],
          fields['price'],
          file.img.originalFilename
        ];
         conn.query(sql, params, (err, result) => {
                  if (err) throw err;
                  res.redirect('/product');
                   })
                  }); 
                })
              })

        router.get('/editProduct/:id', isLogin, (req, res) => {
        let sql = 'SELECT * FROM tb_product WHERE id = ?';
        let params = req.params.id;
        conn.query(sql, params, (err, products) => {
      if (err) throw err;

      sql = 'SELECT * FROM tb_group_product ORDER BY name';
      conn.query(sql, (err, groupProduct) => {
        if(err) throw err;
        res.render('addProduct', { product: products[0], groupProduct: groupProduct});
      })
      
    })
   })  
   router.post('/editProduct/:id', isLogin, (req, res) => {
    let form = new formidable.IncomingForm();
    form.parse(req, (err, fields, file) => {
      let filePath = file.img.filepath;
      let newPath = 'D://Full stack/workshop-ecom/app/public/images/';
      let PathUpload = newPath + file.img.originalFilename;      
      fs.copyFile(filePath, PathUpload, () => {
        let sqlSelect = 'SELECT img FROM tb_product WHERE id = ?';
        let paramSelect = req.params.id; 
         
        conn.query(sqlSelect, paramSelect, (err, oldproduct) => {
          if (err) throw err;
          let product = oldproduct[0];
          fs.unlink(newPath + product.img, () => {
     
        //insert to database
        let sql = 'UPDATE tb_product SET group_product_id = ?, barcode = ?, name = ?, cost =?, price = ?, img = ? WHERE id = ?'
        let params = [
          fields['group_product_id'],
          fields['barcode'],
          fields['name'],
          fields['cost'],
          fields['price'],
          file.img.originalFilename,
          req.params.id
        ];
        conn.query(sql, params, (err, result) => {
          if (err) throw err;
          res.redirect('/product');
        })
      })
    })
   })
  })
})
router.get('/deleteProduct/:id/:img', isLogin, (req, res) => {
    let newPath = 'D://Full stack/workshop-ecom/app/public/images/';
    newPath += req.params.img;

    fs.unlink(newPath, (err) => {
      if (err) throw err;

      let sql = 'DELETE FROM tb_product WHERE id = ?';
      let params = req.params.id;

      conn.query(sql, params, (err, result) => {
      if (err) throw err;
     res.redirect('/product');
      })
    })
  })
  
  router.get('/addToCart/:id', (req, res) => {
    let cart = [ ];
    let order = {
      product_id: req.params.id,
      qty: 1
    }
    if (req.session.card == null) {
      // First item
      cart.push(order);
    } else{
      // second item
      cart = req.session.card;
      let newItem = true;

      for (let i = 0; i < cart.length; i++) {
        if (cart[i].product_id == req.params.id) {
        cart[i].qty = cart[i].qty + 1 ;
        newItem = false;
        }
      }

      if (newItem) {
        cart.push(order);
      }
    }

    req.session.card = cart;
    res.redirect('/');
  })

  router.get('/mycart', async (req, res) => {
    let conn = require('./connect2');
    let cart = req.session.card;
    let products = [];
    let totalQty = 0;
    let totalPrice = 0;

    if (cart.length > 0) {
      for (let i = 0; i < cart.length; i++) {
        let c = cart[i];
        let sql = 'SELECT * FROM tb_product WHERE id = ?';
        let params = [c.product_id];
        let [rows, fileds] = await conn.query(sql, params);
        let product = rows[0];


        let p = {
          qty: c.qty,
          id: product.id,
          barcode: product.barcode,
          name: product.name,
          price: product.price,
          img: product.img
        }

        products.push(p);

        totalQty += parseInt(c.qty);
        totalPrice += (c.qty * product.price);
    }
  }
    res.render('mycart', { 
      products: products, 
      totalQty: totalQty, 
      totalPrice: totalPrice 
    });
  })

  router.get('/deleteItemInCart/:id', (req, res) => {
    let cart = req.session.card;

    for (i = 0; i < cart.length; i++) {
      if (cart [i].product_id == req.params.id) {
        cart.splice(i, 1);
      }
    }

    req.session.card = cart;
    res.redirect('/mycart');
  })

  router.get('/editInCart/:id', (req, res) => {
    let sql = 'SELECT * FROM tb_product WHERE id = ?';
    let params = req.params.id;
    conn.query(sql, params, (err, result) => {
      if(err) throw err;
      let product = result[0];
      let cart = req.session.card;

      for(let i = 0; i < cart.length; i++) {
        if (cart[i].product_id == product.id) {
          product.qty = cart[i].qty;
        }
      }

      res.render('editInCart', { product: product});
    })
  })

  router.post('/editIncart/:id', (req, res) => {
    let cart = req.session.card;

    for (let i = 0; i < cart.length; i++) {
      if (cart[i].product_id == req.params.id) {
        cart[i].qty = req.body['qty'];
      }
    }

    req.session.card = cart;
    res.redirect('/mycart')
  })

  router.get('/confirmOrder', (req, res) => {
    res.render('confirmOrder');
  })

  router.post('/confirmOrder', async (req, res) => {
    let conn = require('./connect2');

    // insert order
    let sql = 'INSERT INTO tb_order(name, address, phone, created_date) VALUE(?, ?, ?, NOW())';
    let params = [
    req.body['name'],
    req.body['address'],
    req.body['phone']
    ]

   try {
      let [rows, fields] = await conn.query(sql, params);
      let lastId = rows.insertId;
      let carts = req.session.card;
     
      for (let i = 0; i < carts.length; i++) {
        let cart = carts[i];

        // find product data
        let sqlFindProduct = 'SELECT price FROM tb_product WHERE id = ?';
        params = [cart.product_id];
        let [rows, fields] = await conn.query(sqlFindProduct, params);
        let price = rows[0].price;
        let sqlOrderDetail = 'INSERT INTO tb_order_detail(order_id, product_id, qty, price) VALUES(?, ?, ?, ?)';
        params = [
          lastId,
          cart.product_id,
          cart.qty,
          price
        ]
      await conn.query(sqlOrderDetail, params);
      }
    } catch(err) {
      res.send(err);
    }
req.session.card = [ ];

     res.redirect('/confirmOrderSuccess');
  })

  router.get('/confirmOrderSuccess', (req, res) => {
    res.render('confirmOrderSuccess');
  })

  router.get('/order', isLogin, (req, res) => {
    let sql = 'SELECT * FROM tb_order ORDER BY id DESC';
    conn.query(sql, (err, result) => {
      if(err) throw err;
      res.render('order', {orders: result});
    })
  })

  router.get('/orderInfo/:id', isLogin, (req, res) => {
    let sql = '';
    sql += ' SELECT tb_order_detail.*,tb_product.barcode, tb_product.name, tb_product.img FROM tb_order_detail';
    sql += ' LEFT JOIN tb_product ON tb_product.id = tb_order_detail.product_id'; 
    sql += ' WHERE tb_order_detail.order_id = ?';
    sql += ' ORDER BY tb_order_detail.id DESC';

    let params = [req.params.id];
    let totalQty = 0;
    let totalPrice = 0;

    conn.query(sql,  params, (err, result) => {
      if(err) throw err;

      for (let i = 0; i < result.length; i++) {
        let orderInfo = result[i];
        totalQty += orderInfo.qty;
        totalPrice += (orderInfo.qty * orderInfo.price);
      }
      res.render('orderInfo', { 
        orderDetails: result, 
        totalQty: totalQty, 
        totalPrice: totalPrice
      });
    })
  })

  router.get('/deleteOrder/:id', isLogin, (req, res) => {
    let sql = 'DELETE FROM tb_order WHERE id = ?';
    let params = [req.params.id];

    conn.query(sql, params, (err, result) => {
      if (err) throw err;


      sql = 'DELETE FROM tb_order_detail WHERE order_id = ?';
      conn.query(sql, params, (err, result) => {
        if (err) throw err;
        res.redirect('/order');
      })
    })
  })

  router.get('/payOrder/:id', isLogin, (req, res) => {
    res.render('payOrder', { orderId: req.params.id })
  })

  router.post('/payOrder/:id', isLogin, (req, res) => {
    let sql = 'UPDATE tb_order SET pay_date = ?, pay_remark = ? WHERE id = ?';
    let params = [
      req.body['pay_date'],
      req.body['pay_remark'],
      req.params.id
    ]

    conn.query(sql, params, (err, result) => {
      if (err) throw err;
      res.render('payOrderSuccess');
    })
  })

  router.get('/sendOrder/:id', isLogin, (req, res) => {
    res.render('sendOrder', { orderId: req.params.id });
  })

  router.post('/sendOrder/:id', isLogin, (req, res) => {
    let sql = 'UPDATE tb_order SET send_date = ?, track_name = ?, track_code = ?, send_remark = ? WHERE id = ?';
    let params = [
      req.body['send_date'],
      req.body['track_name'],
      req.body['track_code'],
      req.body['send_remark'],
      req.params.id
    ]

    conn.query(sql, params, (err, result) => {
      if(err) throw err;
      res.render('sendOrderSuccess');
    })
  })

  router.get('/reportSalePerDay', isLogin, async (req, res) => {
    let conn = require('./connect2');
    let y = dayjs().year();
    let yForLoop = dayjs().year();
    let m = dayjs().month() + 1;
    let daysInMonth = dayjs(y + '/' + m + '/1').daysInMonth();
    let arr = [];
    let arrYears = [];
    let arrMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤษจิกายน', 'ธันวาคม'];


    // ค่ามาจาก url ไม่ได้มาจาก form ใช้ req.query

    if (req.query['year'] != undefined) {
      y = req.query['year'];
      m = req.query['month'];
    }

    for (i = 1; i <= daysInMonth; i++) {
      let sql = '';
      sql += ' SELECT SUM(qty * price) AS totalPrice FROM tb_order_detail';
      sql += ' LEFT JOIN tb_order ON tb_order.id = tb_order_detail.order_id';
      sql += ' WHERE DAY(tb_order.pay_date) = ?';
      sql += ' AND MONTH(tb_order.pay_date) = ?';
      sql += ' AND YEAR(tb_order.pay_date) = ?';

      let params = [i, m, y];
      let [rows, fileds] = await conn.query(sql, params);
      arr.push(rows[0].totalPrice);
    }

    for (let i = yForLoop - 5; i <= yForLoop; i++){
      arrYears.push(i);
    }
    res.render('reportSalePerDay', { 
      arr: arr, 
      y: y, 
      m: m, 
      arrYears: arrYears, 
      arrMonths: arrMonths
    });
  })

  router.get('/reportSalePerMonth', isLogin, async (req, res) => {
    let conn = require('./connect2');
    let y = dayjs().year();
    let yForLoop = dayjs().year();
    let arr = [];
    let arrYears = [];


    if (req.query['year'] != undefined) {
      y = req.query['year'];
    }
    for (let i = 1; i <= 12; i++){
      let sql = '';
      sql += ' SELECT SUM(qty * price) AS totalPrice FROM tb_order_detail';
      sql += ' LEFT JOIN tb_order ON tb_order.id = tb_order_detail.order_id';
      sql += ' WHERE MONTH(tb_order.pay_date) = ?';
      sql += ' AND YEAR(tb_order.pay_date) = ?';

      let params = [i, y];
      let [rows, fields] = await conn.query(sql, params);

      arr.push(rows[0].totalPrice);
    }

    for (let i = yForLoop - 4 ; i <= yForLoop; i++){
      arrYears.push(i);
    }

    res.render('reportSalePerMonth', {arr: arr, y: y, arrYears: arrYears});

  })

  router.get('/reportSalePerProduct', isLogin, async (req, res) => {
    let conn = require('./connect2');
    let sql = 'SELECT * FROM tb_product';
    let [rows, fields] = await conn.query(sql);
    let arr = []

    for (let i = 0; i < rows.length; i++){
      let product = rows[i];
      let barcode = product.barcode;
      let name = product.name;
      let id = product.id;

      sql = ' SELECT SUM(qty * price) AS totalPrice FROM tb_order_detail';
      sql += ' LEFT JOIN tb_order ON tb_order.id = tb_order_detail.order_id';
      sql += ' WHERE tb_order_detail.product_id = ?';
      sql += ' AND tb_order.pay_date IS NOT NULL';

      let [rows2, fields2] = await conn.query(sql, [id]);
      let totalPrice = rows2[0].totalPrice;
      let p = {
        totalPrice: totalPrice,
        barcode: barcode,
        id: id,
        name: name
      }

      arr.push(p);
    }

    res.render('reportSalePerProduct', { arr: arr});
  })

  router.get('/trackOrder', (req, res) => {
    res.render('trackOrder', { orders: [] })
  })

  router.post('/trackOrder', (req, res) => {
    let sql = 'SELECT * FROM tb_order WHERE phone = ? AND pay_date IS NOT NULL';
    let params = req.body['phone'];
    conn.query(sql, params, (err, results) => {
      if (err) throw err;
      res.render('trackOrder', { orders: results })
    })
  })

  router.get('/importToStock',isLogin, (req, res) => {
    let sql = '';
    sql += ' SELECT tb_product.barcode, tb_product.name, '; 
    sql += ' tb_stock_in.qty, tb_stock_in.created_date, tb_stock_in.id, tb_stock_in.remark';
    sql += ' FROM tb_stock_in';
    sql += ' LEFT JOIN tb_product ON tb_stock_in.product_id = tb_product.id';

    conn.query(sql, (err, result) => {
      if (err) throw err;
      res.render('importToStock', { stockIns: result });
    })
  })

  router.post('/importToStock', isLogin, async (req, res) => {
    let barcode = req.body['product_barcode'];
    let conn = require('./connect2');

    let sql = 'SELECT id FROM tb_product WHERE barcode = ?';
    let params = [barcode];
    
    try {

    let [product, fields] = await conn.query(sql, params);

    if (product.length > 0){
      let id = product[0].id;

      sql = 'INSERT INTO tb_stock_in(product_id, qty, created_date, remark) VALUES(?, ?, NOW(), ?)';
      params = [id, req.body['qty'], req.body['remark']];

      conn.query(sql, params);
      res.redirect('/importToStock');

    } else {
      res.send('Barcode not found');
    }
  } catch (e) {
    res.send('Error: ' + e);
  }
  })

  router.get('/deleteImportStock/:id', isLogin, (req, res) => {
    let sql = 'DELETE FROM tb_stock_in WHERE id = ?'
    let params = [req.params.id];

    conn.query(sql, params, (err, result) => {
      if (err) throw err;
      res.redirect('/importToStock')
    })
  })
  router.get('/exportFromStock', isLogin, (req, res) => {
    let sql = '';
    sql += ' SELECT tb_product.barcode, tb_product.name, '; 
    sql += ' tb_stock_out.qty, tb_stock_out.created_date, tb_stock_out.id, tb_stock_out.remark';
    sql += ' FROM tb_stock_out';
    sql += ' LEFT JOIN tb_product ON tb_stock_out.product_id = tb_product.id';

    conn.query(sql, (err, result) => {
      if (err) throw err;
      res.render('exportFromStock', { stockOuts: result });
  })
})

  router.post('/exportFromStock',isLogin, async (req, res) => {
    let barcode = req.body['product_barcode'];
    let conn = require('./connect2')

    try {
    let sql = 'SELECT id FROM tb_product WHERE barcode = ?';
    let params = [barcode];

    let [product, fields] = await conn.query(sql, params);

    if(product.length > 0){
      let id = product[0].id;

      sql = 'INSERT INTO tb_stock_out (product_id, qty, created_date, remark) VALUES(?, ?, NOW(), ?)';
      params = [id, req.body['qty'],req.body['remark']];

      conn.query(sql, params);
      res.redirect('/exportFromStock')

    } else {
      res.send('Barcode not found');
    }
  } catch (e) {
    res.send('Error: ' + e);
  }
  })

  router.get('/deleteExportStock/:id', (req, res) => {
    let sql = 'DELETE FROM tb_stock_out WHERE id = ?'
    let params = [req.params.id];

    conn.query(sql, params, (err, result) => {
      if (err) throw err;
      res.redirect('/exportFromStock')
  })
})

router.get('/reportStock', isLogin, async (req, res) => {
  let sql = 'SELECT * FROM tb_product ORDER BY name ASC';
  let conn = require('./connect2');
  let arr = [];

  try {
  let [products, fields] = await conn.query(sql);

    for (let i = 0; i < products.length; i++) {
      let product = products[i];
      let params = [product.id];

      sql = 'SELECT SUM(qty) AS qtyIn FROM tb_stock_in WHERE product_id = ?';
      let [stockIn] = await conn.query(sql, params);

      sql = 'SELECT SUM(qty) AS qtyOut FROM tb_stock_out WHERE product_id = ?';
      let [stockOut] = await conn.query(sql, params);

     
      let objProduct = {
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        qtyIn: stockIn[0].qtyIn,
        qtyOut: stockOut[0].qtyOut
      }
      
      arr.push(objProduct);
    }
    res.render('reportStock', {arr: arr});
  } catch (e) {
    res.send('Error: ' + e);
  }
})

module.exports = router;
