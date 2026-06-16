import { Hono } from "hono";
import { logger } from "hono/logger";
import { createClient } from "@supabase/supabase-js";
import * as kv from "./kv_store";
import "dotenv/config";

const app = new Hono();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle ALL requests with CORS
app.use('*', async (c, next) => {
  // Handle preflight
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  // Continue to route handler
  await next();
  
  // Add CORS headers to response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    c.res.headers.set(key, value);
  });
});

app.use("*", logger(console.log));

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const supabase = createClient(supabaseUrl, supabaseServiceRole);

const superAdminEmail = "ahmadmasoodpk0@gmail.com";
const Roles = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MANAGER: "manager",
  SALES_MAN: "salesman",
};

const APPROVAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

async function getAuthenticatedShop(request: Request) {
  const accessToken = request.headers.get("Authorization")?.split(" ")[1];

  if (!accessToken) {
    return { error: "No authorization token provided", status: 401 };
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(accessToken);

  if (authError || !user) {
    return { error: "Invalid authorization token", status: 401 };
  }

  if (user.email === superAdminEmail) {
    let shopData = await kv.get(`shop:${user.id}`);
    if (!shopData) {
      const superAdminShop = {
        id: user.id,
        shopName: "SUPER ADMIN",
        ownerName: user.email,
        email: user.email,
        phone: "",
        address: "",
        role: Roles.SUPER_ADMIN,
        date: new Date().toISOString(),
      };
      await kv.set(`shop:${user.id}`, JSON.stringify(superAdminShop));
      shopData = JSON.stringify(superAdminShop);
    }
    const shop = JSON.parse(shopData);
    shop.role = Roles.SUPER_ADMIN;
    return { user, shop, shopId: user.id };
  }

  const userShopId = await kv.get(`user:shop:${user.id}`);
  const shopId = userShopId || user.id;

  const shopData = await kv.get(`shop:${shopId}`);
  if (!shopData) {
    const pendingData = await kv.get(`pending:${user.id}`);
    if (pendingData) {
      const pending = JSON.parse(pendingData);
      return {
        error: `Your account is ${pending.status}. Please wait for admin approval.`,
        status: 403,
        isPending: true,
      };
    }
    return { error: "Shop not found for user", status: 404 };
  }

  const shop = JSON.parse(shopData);

  if (userShopId) {
    const userData = await kv.get(`users:${shopId}`);
    const users = userData ? JSON.parse(userData) : [];

    const teamMember = users.find((u: any) => u.id === user.id);

    if (teamMember) {
      shop.role = teamMember.role;
    }
  }

  return { user, shop, shopId };
}
app.post("/auth/signup", async (c) => {
  try {
    const { email, password, shopName, ownerName, phone, address } =
      await c.req.json();
    if (!email || !password || !shopName || !ownerName) {
      return c.json({ error: "Missing Required Fields" }, 401);
    }
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { shopName, ownerName, phone, address },
      });
    if (authError) {
      console.log("Sign Up error during user creation", authError);
      return c.json({ error: authError.message }, 400);
    }

    const userId = authData.user.id;
    if (email === superAdminEmail) {
      const superAdminShop = {
        id: userId,
        shopName: shopName || "Super Admin",
        ownerName: ownerName || "Super Admin",
        email,
        phone: phone || "",
        address: address || "",
        role: Roles.SUPER_ADMIN,
        createdAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      };

      await kv.set(`shop:${userId}`, JSON.stringify(superAdminShop));
      await kv.set(`products:${userId}`, JSON.stringify([]));
      await kv.set(`customers:${userId}`, JSON.stringify([]));
      await kv.set(`sales:${userId}`, JSON.stringify([]));
      await kv.set(`ledger:${userId}`, JSON.stringify([]));
      await kv.set(`users:${userId}`, JSON.stringify([]));

      // Create default Cash account for super admin
      const superAdminCashAccount = {
        id: `cash_${userId}_${Date.now()}`,
        name: 'Cash',
        type: 'cash',
        category: 'Assets',
        balance: 0,
        description: 'Default cash account for daily transactions',
        createdAt: new Date().toISOString(),
      };
      const superAdminBanks = [superAdminCashAccount];
      await kv.set(`banks:${userId}`, JSON.stringify(superAdminBanks));

      // Create default Shop Expense account for super admin
      const superAdminExpenseAccount = {
        id: `expense_${userId}_${Date.now()}`,
        name: 'Shop Expense',
        type: 'expense',
        category: 'Expenses',
        balance: 0,
        description: 'Default shop expense account',
        createdAt: new Date().toISOString(),
      };
      const superAdminAccounts = [superAdminExpenseAccount];
      await kv.set(`accounts:${userId}`, JSON.stringify(superAdminAccounts));

      return c.json({
        message:
          "Super Admin account created successfully! You can now sign in.",
        status: "approved",
        userId,
      });
    }
    const pendingRequest = {
      id: userId,
      shopName,
      ownerName,
      email,
      phone: phone || "",
      address: address || "",
      status: APPROVAL_STATUS.PENDING,
      role: Roles.ADMIN,
      createdAt: new Date().toISOString(),
      approvedAt: null,
      approvedBy: null,
    };
    await kv.set(`pending:${userId}`, JSON.stringify(pendingRequest));
    console.log("✅ Stored pending request in database for user:", userId);

    const pendingListData = await kv.get("pending:list");
    const pendingList = pendingListData ? JSON.parse(pendingListData) : [];

    pendingList.unshift(userId);
    await kv.set("pending:list", JSON.stringify(pendingList));
    console.log(
      "✅ Updated pending list in database. Total pending:",
      pendingList.length,
    );
    const verifyRequest = await kv.get(`Pending:${userId}`);
    const verifyList = await kv.get("pending:list");

    return c.json({
      message:
        "Registration successful! Your account is pending approval. You will be notified once approved.",
      status: "pending",
      userId,
    });
  } catch (err) {
    console.log("Signup error:", err);
    return c.json({ error: "Failed to create shop account" }, 500);
  }
});

app.get("/api/auth/approval-status/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const shopData = await kv.get(`shop:${userId}`);
    if (shopData) {
      return c.json({ APPROVAL_STATUS: APPROVAL_STATUS.APPROVED });
    }

    const pendingData = await kv.get(`pending:${userId}`);
    if (pendingData) {
      const pending = JSON.parse(pendingData);
      return c.json({ status: pending.status });
    }

    return c.json({ status: "not found" }, 404);
  } catch (error) {
    console.log("Approval status check error:", error);
    return c.json({ error: "Failed to check status" }, 500);
  }
});

app.post("/api/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.log("Sign In error:", error);
      return c.json({ error: error.message }, 401);
    }

    if (data.user.email === superAdminEmail) {
      let shopData = await kv.get(`shop:${data.user.id}`);
      if (!shopData) {
        const superAdminShop = {
          id: data.user.id,
          shopName: "Super Admin",
          ownerName: data.user.email,
          email: data.user.email,
          phone: "",
          address: "",
          role: Roles.SUPER_ADMIN,
          createdAt: new Date().toISOString(),
        };
        await kv.set(`shop:${data.user.id}`, JSON.stringify(superAdminShop));

        await kv.set(`products:${data.user.id}`, JSON.stringify([]));
        await kv.set(`customers:${data.user.id}`, JSON.stringify([]));
        await kv.set(`sales:${data.user.id}`, JSON.stringify([]));
        await kv.set(`ledger:${data.user.id}`, JSON.stringify([]));
        await kv.set(`users:${data.user.id}`, JSON.stringify([]));
        shopData = JSON.stringify(superAdminShop);
      }
      return c.json({
        accessToken: data.session.access_token,
        user: data.user,
        shop: JSON.parse(shopData),
      });
    }
    const userShopId = await kv.get(`user:shop:${data.user.id}`);
    if (userShopId) {
      const shopData = await kv.get(`shop:${userShopId}`);
      if (shopData) {
        return c.json({
          accessToken: data.session.access_token,
          user: data.user,
          shop: JSON.parse(shopData),
        });
      }
    }
   const shopData = await kv.get(`shop:${data.user.id}`);
    if (!shopData) {
      const pendingData = await kv.get(`Pending:${data.user.id}`);
      if (pendingData) {
        const pending = JSON.parse(pendingData);
        return c.json(
          {
            error: `Your account is ${pending.status}. Please wait for admin approval.`,
            isPending: true,
            status: pending.status,
          },
          403,
        );
      }
      return c.json({ error: "Account not found" }, 404);
    }
    return c.json({
      accessToken: data.session.access_token,
      user: data.user,
      shop: JSON.parse(shopData),
    });
  } catch (error) {
    console.log("Signin error:", error);
    return c.json({ error: "Failed to sign in" }, 500);
  }
});

app.get("/api/auth/session", async (c) => {
  try {
    const auth = await getAuthenticatedShop(c.req.raw);
    if ("error" in auth && !auth.isPending) {
      return c.json({ session: null });
    }

    return c.json({
      accessToken: c.req.header("Authorization")?.split(" ")[1],
      user: auth.user,
      shop: auth.shop,
    });
  } catch (error) {
    console.log("Session check error:", error);
    return c.json({ session: null });
  }
});

app.post("/api/auth/signout", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (accessToken) {
      await supabase.auth.admin.signOut(accessToken);
    }
    return c.json({
      message: "Signed Out Successfully",
    });
  } catch (error) {
    console.log("Signout error:", error);
    return c.json({ error: "Failed to sign out" }, 500);
  }
});

app.get("/api/auth/shop", async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ("error" in auth) {
    return c.json({ error: auth.error }, (auth.status || 500) as any);
  }
  return c.json({
    shop: auth.shop,
  });
});

app.put("/api/auth/shop", async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ("error" in auth) {
    return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  try {
    const updates = await c.req.json();
    const updatedShop = { ...auth.shop, ...updates };
    await kv.set(`shop:${auth.shopId}`, JSON.stringify(updatedShop));
    return c.json({
      shop: updatedShop,
    });
  } catch (error) {
    console.log("Shop update error:", error);
    return c.json({ error: "Failed to update shop" }, 500);
  }
});

app.get('/api/products', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  const productsData = await kv.get(`products:${auth.shopId}`);
  return c.json({ products: productsData ? JSON.parse(productsData) : [] });
});

app.post('/api/products', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  try {
    const product = await c.req.json();
    const productsData = await kv.get(`products:${auth.shopId}`);
    const products = productsData ? JSON.parse(productsData) : [];
    
    const newProduct = { ...product, id: Date.now().toString() };
    products.push(newProduct);
    
    await kv.set(`products:${auth.shopId}`, JSON.stringify(products));
    return c.json({ product: newProduct });
  } catch (error) {
    console.log('Product creation error:', error);
    return c.json({ error: 'Failed to create product' }, 500);
  }
});

app.put('/api/products/:id', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  try {
    const productId = c.req.param('id');
    const updates = await c.req.json();
    
    const productsData = await kv.get(`products:${auth.shopId}`);
    const products = productsData ? JSON.parse(productsData) : [];
    
    const index = products.findIndex((p: any) => p.id === productId);
    if (index === -1) {
      return c.json({ error: 'Product not found' }, 404);
    }
    
    products[index] = { ...products[index], ...updates };
    await kv.set(`products:${auth.shopId}`, JSON.stringify(products));
    
    return c.json({ product: products[index] });
  } catch (error) {
    console.log('Product update error:', error);
    return c.json({ error: 'Failed to update product' }, 500);
  }
});

app.delete('/api/products/:id', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  try {
    const productId = c.req.param('id');
    const productsData = await kv.get(`products:${auth.shopId}`);
    const products = productsData ? JSON.parse(productsData) : [];
    
    const filtered = products.filter((p: any) => p.id !== productId);
    await kv.set(`products:${auth.shopId}`, JSON.stringify(filtered));
    
    return c.json({ message: 'Product deleted' });
  } catch (error) {
    console.log('Product deletion error:', error);
    return c.json({ error: 'Failed to delete product' }, 500);
  }
});

// ==================== CUSTOMER ROUTES ====================

app.get('/api/customers', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  const customersData = await kv.get(`customers:${auth.shopId}`);
  return c.json({ customers: customersData ? JSON.parse(customersData) : [] });
});

app.post('/api/customers', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  try {
    const customer = await c.req.json();
    const customersData = await kv.get(`customers:${auth.shopId}`);
    const customers = customersData ? JSON.parse(customersData) : [];
    
    const newCustomer = { ...customer, id: Date.now().toString(), balance: 0 };
    customers.push(newCustomer);
    
    await kv.set(`customers:${auth.shopId}`, JSON.stringify(customers));
    return c.json({ customer: newCustomer });
  } catch (error) {
    console.log('Customer creation error:', error);
    return c.json({ error: 'Failed to create customer' }, 500);
  }
});

app.put('/api/customers/:id', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  try {
    const customerId = c.req.param('id');
    const updates = await c.req.json();
    
    const customersData = await kv.get(`customers:${auth.shopId}`);
    const customers = customersData ? JSON.parse(customersData) : [];
    
    const index = customers.findIndex((c: any) => c.id === customerId);
    if (index === -1) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    customers[index] = { ...customers[index], ...updates };
    await kv.set(`customers:${auth.shopId}`, JSON.stringify(customers));
    
    return c.json({ customer: customers[index] });
  } catch (error) {
    console.log('Customer update error:', error);
    return c.json({ error: 'Failed to update customer' }, 500);
  }
});

app.delete('/api/customers/:id', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  try {
    const customerId = c.req.param('id');
    const customersData = await kv.get(`customers:${auth.shopId}`);
    const customers = customersData ? JSON.parse(customersData) : [];
    
    const filtered = customers.filter((c: any) => c.id !== customerId);
    await kv.set(`customers:${auth.shopId}`, JSON.stringify(filtered));
    
    return c.json({ message: 'Customer deleted' });
  } catch (error) {
    console.log('Customer deletion error:', error);
    return c.json({ error: 'Failed to delete customer' }, 500);
  }
});

// ==================== SALES ROUTES ====================

app.get('/api/sales', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  const salesData = await kv.get(`sales:${auth.shopId}`);
  return c.json({ sales: salesData ? JSON.parse(salesData) : [] });
});

app.post('/api/sales', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  try {
    const sale = await c.req.json();
    
    // Get all related data
    const salesData = await kv.get(`sales:${auth.shopId}`);
    const sales = salesData ? JSON.parse(salesData) : [];
    
    const productsData = await kv.get(`products:${auth.shopId}`);
    const products = productsData ? JSON.parse(productsData) : [];
    
    const customersData = await kv.get(`customers:${auth.shopId}`);
    const customers = customersData ? JSON.parse(customersData) : [];
    
    const ledgerData = await kv.get(`ledger:${auth.shopId}`);
    const ledger = ledgerData ? JSON.parse(ledgerData) : [];
    
    // Create new sale
    const newSale = {
      ...sale,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };
    sales.unshift(newSale);
    
    // Update product stock
    sale.items.forEach((item: any) => {
      const productIndex = products.findIndex((p: any) => p.id === item.productId);
      if (productIndex !== -1) {
        products[productIndex].stock -= item.quantity;
      }
    });
    
    // Update customer balance if credit sale
    if (sale.paymentMethod === 'credit' && sale.balance > 0) {
      const customerIndex = customers.findIndex((c: any) => c.id === sale.customerId);
      if (customerIndex !== -1) {
        customers[customerIndex].balance += sale.balance;
      }
    }
    
    // Add ledger entry
    const currentBalance = ledger.length > 0 ? ledger[0].balance : 0;
    const newLedgerEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: 'sale',
      customerId: sale.customerId,
      customerName: sale.customerName,
      description: `Sale Invoice #${newSale.id.slice(-6)}`,
      debit: 0,
      credit: sale.amountPaid,
      balance: currentBalance + sale.amountPaid,
    };
    ledger.unshift(newLedgerEntry);
    
    // Save all updates
    await kv.set(`sales:${auth.shopId}`, JSON.stringify(sales));
    await kv.set(`products:${auth.shopId}`, JSON.stringify(products));
    await kv.set(`customers:${auth.shopId}`, JSON.stringify(customers));
    await kv.set(`ledger:${auth.shopId}`, JSON.stringify(ledger));
    
    return c.json({ sale: newSale });
  } catch (error) {
    console.log('Sale creation error:', error);
    return c.json({ error: 'Failed to create sale' }, 500);
  }
});

// ==================== LEDGER ROUTES ====================

app.get('/api/ledger', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  const ledgerData = await kv.get(`ledger:${auth.shopId}`);
  return c.json({ ledger: ledgerData ? JSON.parse(ledgerData) : [] });
});

app.post('/api/ledger/entry', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  try {
    const entry = await c.req.json();
    const ledgerData = await kv.get(`ledger:${auth.shopId}`);
    const ledger = ledgerData ? JSON.parse(ledgerData) : [];
    
    const currentBalance = ledger.length > 0 ? ledger[0].balance : 0;
    const newEntry = {
      ...entry,
      id: Date.now().toString(),
      date: new Date().toISOString(),
      balance: currentBalance + entry.credit - entry.debit,
    };
    
    ledger.unshift(newEntry);
    await kv.set(`ledger:${auth.shopId}`, JSON.stringify(ledger));
    
    return c.json({ entry: newEntry });
  } catch (error) {
    console.log('Ledger entry creation error:', error);
    return c.json({ error: 'Failed to create ledger entry' }, 500);
  }
});

app.post('/api/ledger/payment', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  try {
    const { customerId, amount, description } = await c.req.json();
    
    const customersData = await kv.get(`customers:${auth.shopId}`);
    const customers = customersData ? JSON.parse(customersData) : [];
    
    const ledgerData = await kv.get(`ledger:${auth.shopId}`);
    const ledger = ledgerData ? JSON.parse(ledgerData) : [];
    
    const customerIndex = customers.findIndex((c: any) => c.id === customerId);
    if (customerIndex === -1) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    // Update customer balance
    customers[customerIndex].balance -= amount;
    
    // Add ledger entry
    const currentBalance = ledger.length > 0 ? ledger[0].balance : 0;
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: 'payment',
      customerId,
      customerName: customers[customerIndex].name,
      description: description || `Payment received from ${customers[customerIndex].name}`,
      debit: 0,
      credit: amount,
      balance: currentBalance + amount,
    };
    
    ledger.unshift(newEntry);
    
    await kv.set(`customers:${auth.shopId}`, JSON.stringify(customers));
    await kv.set(`ledger:${auth.shopId}`, JSON.stringify(ledger));
    
    return c.json({ entry: newEntry, customer: customers[customerIndex] });
  } catch (error) {
    console.log('Payment recording error:', error);
    return c.json({ error: 'Failed to record payment' }, 500);
  }
});

// ==================== ADMIN APPROVAL ROUTES ====================

// Get all pending approval requests (Super Admin Only)
app.get('/api/admin/pending-approvals', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
    console.log('Admin pending-approvals auth error:', auth.error);
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  // Check if user is super admin
  console.log('Checking super admin access. Shop email:', auth.shop.email, 'Shop role:', auth.shop.role, 'SUPER_ADMIN_EMAIL:', superAdminEmail);
  if (auth.shop.email !== superAdminEmail && auth.shop.role !== Roles.SUPER_ADMIN) {
    console.log('Access denied. Not a super admin.');
    return c.json({ error: 'Unauthorized. Super admin access required.' }, 403);
  }

  try {
    const pendingListData = await kv.get('pending:list');
    console.log('Pending list data:', pendingListData);
    const pendingList = pendingListData ? JSON.parse(pendingListData) : [];
    console.log('Pending list:', pendingList);
    
    const requests = [];
    for (const userId of pendingList) {
      const requestData = await kv.get(`pending:${userId}`);
      console.log(`Pending request for ${userId}:`, requestData);
      if (requestData) {
        requests.push(JSON.parse(requestData));
      }
    }
    
    console.log('Total pending requests found:', requests.length);
    return c.json({ pendingRequests: requests });
  } catch (error) {
    console.log('Get pending approvals error:', error);
    return c.json({ error: 'Failed to get pending approvals' }, 500);
  }
});

// Approve shop registration (Super Admin Only)
app.post('/api/admin/approve/:userId', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  // Check if user is super admin
  if (auth.shop.email !== superAdminEmail && auth.shop.role !== Roles.SUPER_ADMIN) {
    return c.json({ error: 'Unauthorized. Super admin access required.' }, 403);
  }

  try {
    const userId = c.req.param('userId');
    const { paymentConfirmed } = await c.req.json();

    if (!paymentConfirmed) {
      return c.json({ error: 'Payment confirmation required' }, 400);
    }

    // Get pending request
    const pendingData = await kv.get(`pending:${userId}`);
    if (!pendingData) {
      return c.json({ error: 'Pending request not found' }, 404);
    }

    const pendingRequest = JSON.parse(pendingData);

    // Create shop record
    const shop = {
      id: userId,
      shopName: pendingRequest.shopName,
      ownerName: pendingRequest.ownerName,
      email: pendingRequest.email,
      phone: pendingRequest.phone,
      address: pendingRequest.address,
      role: Roles.ADMIN, // Primary shop owner gets admin role
      createdAt: pendingRequest.createdAt,
      approvedAt: new Date().toISOString(),
      approvedBy: auth.user.id,
    };

    await kv.set(`shop:${userId}`, JSON.stringify(shop));

    // Initialize empty data for the shop
    await kv.set(`products:${userId}`, JSON.stringify([]));
    await kv.set(`customers:${userId}`, JSON.stringify([]));
    await kv.set(`sales:${userId}`, JSON.stringify([]));
    await kv.set(`ledger:${userId}`, JSON.stringify([]));
    await kv.set(`users:${userId}`, JSON.stringify([])); // For team members
    
    // Create default Cash account (in banks)
    const cashAccount = {
      id: `cash_${userId}_${Date.now()}`,
      name: 'Cash',
      type: 'cash',
      category: 'Assets',
      balance: 0,
      description: 'Default cash account for daily transactions',
      createdAt: new Date().toISOString(),
    };
    const banksData = await kv.get(`banks:${userId}`);
    const banks = banksData ? JSON.parse(banksData) : [];
    banks.push(cashAccount);
    await kv.set(`banks:${userId}`, JSON.stringify(banks));

    // Create default Shop Expense account (in accounts)
    const expenseAccount = {
      id: `expense_${userId}_${Date.now()}`,
      name: 'Shop Expense',
      type: 'expense',
      category: 'Expenses',
      balance: 0,
      description: 'Default shop expense account',
      createdAt: new Date().toISOString(),
    };
    const accountsData = await kv.get(`accounts:${userId}`);
    const accounts = accountsData ? JSON.parse(accountsData) : [];
    accounts.push(expenseAccount);
    await kv.set(`accounts:${userId}`, JSON.stringify(accounts));

    // Update pending status
    pendingRequest.status = APPROVAL_STATUS.APPROVED;
    pendingRequest.approvedAt = shop.approvedAt;
    pendingRequest.approvedBy = auth.user.id;
    await kv.set(`pending:${userId}`, JSON.stringify(pendingRequest));

    // Remove from pending list
    const pendingListData = await kv.get('pending:list');
    const pendingList = pendingListData ? JSON.parse(pendingListData) : [];
    const updatedList = pendingList.filter((id: string) => id !== userId);
    await kv.set('pending:list', JSON.stringify(updatedList));

    return c.json({ 
      message: 'Shop approved successfully',
      shop,
    });
  } catch (error) {
    console.log('Approval error:', error);
    return c.json({ error: 'Failed to approve shop' }, 500);
  }
});

// Reject shop registration (Super Admin Only)
app.post('/api/admin/reject/:userId', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  // Check if user is super admin
  if (auth.shop.email !== superAdminEmail && auth.shop.role !== Roles.SUPER_ADMIN) {
    return c.json({ error: 'Unauthorized. Super admin access required.' }, 403);
  }

  try {
    const userId = c.req.param('userId');
    const { reason } = await c.req.json();

    // Get pending request
    const pendingData = await kv.get(`pending:${userId}`);
    if (!pendingData) {
      return c.json({ error: 'Pending request not found' }, 404);
    }

    const pendingRequest = JSON.parse(pendingData);
    pendingRequest.status = APPROVAL_STATUS.REJECTED;
    pendingRequest.rejectedAt = new Date().toISOString();
    pendingRequest.rejectedBy = auth.user.id;
    pendingRequest.rejectionReason = reason;

    await kv.set(`pending:${userId}`, JSON.stringify(pendingRequest));

    // Remove from pending list
    const pendingListData = await kv.get('pending:list');
    const pendingList = pendingListData ? JSON.parse(pendingListData) : [];
    const updatedList = pendingList.filter((id: string) => id !== userId);
    await kv.set('pending:list', JSON.stringify(updatedList));

    return c.json({ message: 'Shop registration rejected' });
  } catch (error) {
    console.log('Rejection error:', error);
    return c.json({ error: 'Failed to reject shop' }, 500);
  }
});

// ==================== USER MANAGEMENT ROUTES (Admin can create Manager/Salesman) ====================

// Get all users in shop
app.get('/api/users', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  try {
    const usersData = await kv.get(`users:${auth.shopId}`);
    const users = usersData ? JSON.parse(usersData) : [];
    
    // Add shop owner as first user
    const allUsers = [
      {
        id: auth.shopId,
        name: auth.shop.ownerName,
        email: auth.shop.email,
        role: auth.shop.role,
        isOwner: true,
      },
      ...users,
    ];
    
    return c.json({ users: allUsers });
  } catch (error) {
    console.log('Get users error:', error);
    return c.json({ error: 'Failed to get users' }, 500);
  }
});

// Create new user (Manager or Salesman) - Admin only
app.post('/api/users', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  // Check if user is admin
  if (auth.shop.role !== Roles.ADMIN && auth.shop.role !== Roles.SUPER_ADMIN) {
    return c.json({ error: 'Unauthorized. Admin access required.' }, 403);
  }

  try {
    const { email, password, name, role, phone } = await c.req.json();

    if (!email || !password || !name || !role) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    if (role !== Roles.MANAGER && role !== Roles.SALES_MAN) {
      return c.json({ error: 'Invalid role. Can only create Manager or Salesman' }, 400);
    }

    // Create Supabase user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        shopId: auth.shopId,
        shopName: auth.shop.shopName,
        name,
        role,
      },
    });

    if (authError) {
      console.log('User creation error:', authError);
      return c.json({ error: authError.message }, 400);
    }

    const newUserId = authData.user.id;

    // Create user record
    const newUser = {
      id: newUserId,
      shopId: auth.shopId,
      name,
      email,
      phone: phone || '',
      role,
      createdAt: new Date().toISOString(),
      createdBy: auth.user.id,
    };

    // Add to shop's users list
    const usersData = await kv.get(`users:${auth.shopId}`);
    const users = usersData ? JSON.parse(usersData) : [];
    users.push(newUser);
    await kv.set(`users:${auth.shopId}`, JSON.stringify(users));

    // Store user's shop association
    await kv.set(`user:shop:${newUserId}`, auth.shopId);

    return c.json({ 
      message: 'User created successfully',
      user: newUser,
    });
  } catch (error) {
    console.log('User creation error:', error);
    return c.json({ error: 'Failed to create user' }, 500);
  }
});

// Update user role
app.put('/api/users/:userId/role', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  // Check if user is admin
  if (auth.shop.role !== Roles.ADMIN && auth.shop.role !== Roles.SUPER_ADMIN) {
    return c.json({ error: 'Unauthorized. Admin access required.' }, 403);
  }

  try {
    const userId = c.req.param('userId');
    const { role } = await c.req.json();

    if (role !== Roles.MANAGER && role !== Roles.SALES_MAN) {
      return c.json({ error: 'Invalid role' }, 400);
    }

    const usersData = await kv.get(`users:${auth.shopId}`);
    const users = usersData ? JSON.parse(usersData) : [];
    
    const userIndex = users.findIndex((u: any) => u.id === userId);
    if (userIndex === -1) {
      return c.json({ error: 'User not found' }, 404);
    }

    users[userIndex].role = role;
    await kv.set(`users:${auth.shopId}`, JSON.stringify(users));

    return c.json({ 
      message: 'User role updated',
      user: users[userIndex],
    });
  } catch (error) {
    console.log('Update user role error:', error);
    return c.json({ error: 'Failed to update user role' }, 500);
  }
});

// Delete user
app.delete('/api/users/:userId', async (c) => {
  const auth = await getAuthenticatedShop(c.req.raw);
  if ('error' in auth) {
     return c.json({ error: auth.error }, (auth.status || 500) as any);
  }

  // Check if user is admin
  if (auth.shop.role !== Roles.ADMIN && auth.shop.role !== Roles.SUPER_ADMIN) {
    return c.json({ error: 'Unauthorized. Admin access required.' }, 403);
  }

  try {
    const userId = c.req.param('userId');

    // Cannot delete yourself
    if (userId === auth.user.id) {
      return c.json({ error: 'Cannot delete your own account' }, 400);
    }

    const usersData = await kv.get(`users:${auth.shopId}`);
    const users = usersData ? JSON.parse(usersData) : [];
    
    const filtered = users.filter((u: any) => u.id !== userId);
    await kv.set(`users:${auth.shopId}`, JSON.stringify(filtered));

    // Delete user from Supabase
    await supabase.auth.admin.deleteUser(userId);

    // Remove shop association
    await kv.del(`user:shop:${userId}`);

    return c.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.log('Delete user error:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

export default app;
