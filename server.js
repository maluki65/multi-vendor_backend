const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const UserRoutes = require('./routes/usersRoute.js');
const AdminRoutes = require('./routes/adminRoute.js');
const VendorRoutes = require('./routes/vendorRoute.js');
const BuyerRoutes = require('./routes/buyerRoute.js');
const CartRoutes = require('./routes/cartRoute.js');
const OrderRoutes = require('./routes/orderRoute.js');
const globalErrorHandler = require('./middlewares/errorController.js');
const ImgKitAuth = require('./utils/imagekitAuth.js');

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));

const PORT = 5000;

const corsOptions = {
  origin: ['http://localhost:5173'],
  credentials: true,
};

app.use(cors(corsOptions));

app.use('/v1/api/user', UserRoutes);
app.use('/v1/api/admin', AdminRoutes);
app.use('/v1/api/buyer', BuyerRoutes);
app.use('/v1/api/vendor', VendorRoutes);
app.use('/v1/api/cart', CartRoutes);
app.use('/v1/api/orders', OrderRoutes);
app.use('/v1/api/imgAuth', ImgKitAuth);



app.use(globalErrorHandler);

mongoose.connect(process.env.MONGO_URI).then(() => console.log(`Database connected to ${mongoose.connection.name} at port ${PORT}`)).catch((error) => console.log('Failed to connect to database', error));

app.listen(process.env.PORT || PORT, () => {
  console.log(`Server started at port: ${PORT}`);
})