# Multi-Vendor Marketplace Backend

A **Node.js + Express + MongoDB** backend for a multi-vendor marketplace platform.
Supports vendors, buyers, products, reviews, role-based access control, and secure authentication.

---

## Table of Contents

* [Features](#features)
* [Tech Stack](#tech-stack)
* [Installation](#installation)
* [Environment Variables](#environment-variables)
* [Database Setup](#database-setup)
* [Running the App](#running-the-app)
* [API Endpoints](#api-endpoints)
* [Authentication & Authorization](#authentication--authorization)
* [Indexes & Performance](#indexes--performance)
* [Testing](#testing)
* [Contributing](#contributing)
* [License](#license)

---

## Features

* Multi-vendor product management
* Role-based access control: **Admin, Vendor, Buyer**
* Product CRUD operations
* Product reviews and ratings
* Product tags and search/filtering
* Quantity tracking
* Automatic timestamps (`createdAt`, `updatedAt`)
* Vendor and buyer authentication
* Efficient indexing for high-performance queries
* Image handling for products (main + gallery images)

---

## Tech Stack

* **Node.js** with **Express.js**
* **MongoDB** with **Mongoose ODM**
* **JWT** for authentication
* **bcrypt** for password hashing
* **Cloudinary / ImageKit** for image storage (optional)
* **dotenv** for environment variables
* **cors**, **helmet**, **morgan** for security & logging

---

## Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/multi-vendor-backend.git
cd multi-vendor-backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file at the root directory (see below).

---

## Environment Variables

Create `.env` with:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=30d
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/Yourusername
```

---

## Database Setup

1. Ensure MongoDB is running locally or use MongoDB Atlas.
2. Mongoose will automatically create collections (`Users`, `Products`, `Reviews`, etc.) on first use.
3. Indexes are defined in models for **vendorId, status, tags, price, createdAt** for optimal performance.

---

## Running the App

```bash
# Development with auto-restart
npm run dev

# Production
npm start
```

By default, the backend will run on `http://localhost:5000`.

---

## API Endpoints

### Users

| Method | Route               | Description         | Access        |
| ------ | ------------------- | ------------------- | ------------- |
| POST   | `/api/users/signup` | Register a new user | Public        |
| POST   | `/api/users/login`  | User login          | Public        |
| GET    | `/api/users/me`     | Get current user    | Authenticated |

### Products

| Method | Route                            | Description                | Access       |
| ------ | -------------------------------- | -------------------------- | ------------ |
| POST   | `/api/products`                  | Create a new product       | Vendor       |
| GET    | `/api/products/:id`              | Get product by ID          | Vendor/Buyer |
| GET    | `/api/products/vendor/:vendorId` | Get all products by vendor | Vendor/Buyer |
| GET    | `/api/products`                  | Get all products           | Public       |
| POST   | `/api/products/:id/reviews`      | Add a review to product    | Buyer        |
| GET    | `/api/products/:id/reviews`      | Get reviews for product    | Public       |

### Admin

| Method | Route                     | Description      | Access |
| ------ | ------------------------- | ---------------- | ------ |
| GET    | `/api/admin/users`        | List all users   | Admin  |
| DELETE | `/api/admin/products/:id` | Delete a product | Admin  |

---

## Authentication & Authorization

* Uses **JWT tokens**.
* `protect` middleware verifies authentication.
* `restrictTo(...)` middleware ensures **role-based access** (Admin, Vendor, Buyer).

**Example: Protect route for Vendor and Buyer:**

```js
router.get(
  '/vendor/product/:id', 
  protect, 
  restrictTo('Vendor', 'Buyer'), 
  getProductById
);
```

---

## Indexes & Performance

* Indexed fields for faster queries:

  * `vendorId`, `status`, `tags`, `price`, `createdAt`
* Compound indexes for common queries:

  ```js
  productSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
  ```
* Use `.explain('executionStats')` in Mongoose to verify index usage.

---

## Testing

1. Use **Postman** or **Insomnia** to test endpoints.
2. For automated testing, integrate **Jest** or **Mocha/Chai**.
3. Example request with Postman:

```http
GET /api/products/vendor/64f1a1b2c3d4e5f6a7b8c9d0
Authorization: Bearer <JWT_TOKEN>
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "Add feature"`
4. Push: `git push origin feature/my-feature`
5. Open a pull request

---

## License

MIT License © 2025 — Your Name

---
