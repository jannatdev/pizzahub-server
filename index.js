
import express from "express";
import cors from "cors";
import "dotenv/config";
import Stripe from "stripe";

import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.ts";


import imageRoutes from "./route/image.route.ts";
import menuRoutes from "./route/menu.route.ts";

import vendorMenuRoutes from "./route/vendor/vendorManageMenu.route.ts";
import vendorOrdersRoutes from "./route/vendor/vendorManageOrder.route.ts";

import paymentRoutes from "./route/payment.route.ts";
import adminUserRoutes from "./route/admin/adminUsers.route.ts";
import browseMenuRoutes from "./route/browseMenu.route.ts";
import adminOverviewRoutes from "./route/admin/adminOverview.route.ts";
import adminTransactionsRoutes from "./route/admin/adminTransactions.route.ts";
import singleMenuRoutes from "./route/singleMenu.route.ts";
import orderRoutes from "./route/order.route.ts";
import vendorSubscriptionRoutes from "./route/vendor/subscription.route.ts";
import vendorOverviewRoutes from "./route/vendor/vendorOverview.route.ts";
import adminMenuRoutes from "./route/admin/adminMenu.route.ts";


const app = express();
const PORT = 8000;


// The browser may reach the dev server as localhost OR 127.0.0.1; both origins
// (plus CLIENT_URL) must be allowed or cross-origin API calls — including
// every fetch with `credentials: "include"` — are blocked by the browser.
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
].filter(Boolean);

app.use(
  cors({
    origin: [...new Set(allowedOrigins)],
    credentials: true,
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));



app.use(express.json());

// Image and menu routes
app.use("/images", imageRoutes);

app.use("/api/menu", menuRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminMenuRoutes);
app.use("/api/admin", adminUserRoutes);
app.use("/api/browse-menu", browseMenuRoutes);
app.use("/api/admin", adminOverviewRoutes);
app.use("/api/admin", adminTransactionsRoutes);
app.use("/api/menu", singleMenuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/vendor", vendorMenuRoutes);
app.use("/api/vendor", vendorOrdersRoutes);
app.use("/api/vendor", vendorSubscriptionRoutes);
app.use("/api/vendor", vendorOverviewRoutes);


app.get("/", (req, res) => {
  res.send({ message: "Server is running" });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PizzaHub server is running!",
  });
});

app.use((err, req, res, next) => {
  console.error("Backend error:", err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(400).json({
    success: false,
    message: err.message || "Something went wrong",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running at port ${PORT}`);
});
