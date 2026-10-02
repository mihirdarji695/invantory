# Inventory Barcode Admin

A local-only inventory and barcode management panel. It runs on your own computer at `http://localhost:3000`, stores everything in one SQLite file, and needs no accounts, cloud services or internet connection after installation.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn-style UI on Radix · Prisma 7 + SQLite (better-sqlite3 adapter) · bwip-js barcodes · Lucide icons.

---

## Installation

You need **Node.js 20.19 or newer** (Node 22 LTS recommended). Check with `node -v`.

```bash
cd inventory-barcode
npm install
```

`npm install` also downloads Prisma's engine and generates the database client. That step needs internet once; after that the app works fully offline.

## Running locally

```bash
npm run dev
```

Open **http://localhost:3000**.

On the very first run, `npm run dev` automatically creates the database, applies the schema and adds 10 sample products. On later runs it only applies new migrations (if any). Your data is never reset.

To run the faster production build instead:

```bash
npm run build
npm start
```

Stop the app with `Ctrl + C` in the terminal.

---

## Database setup

The database is a single SQLite file:

```text
data/inventory.db        ← all products, categories, stock movements, settings
data/uploads/            ← product images
```

The location is set in `.env`:

```env
DATABASE_URL="file:./data/inventory.db"
```

You can point it at another folder (for example a synced Dropbox/OneDrive folder) with an absolute path such as `file:/Users/me/Inventory/inventory.db`.

Manual setup (normally not needed, `npm run dev` does it):

```bash
npm run setup     # create tables, generate client, add sample data
```

## Prisma commands

| Command | What it does |
| --- | --- |
| `npm run db:migrate` | Apply migrations to the database (`prisma migrate deploy`) |
| `npm run db:generate` | Regenerate the Prisma client after editing `prisma/schema.prisma` |
| `npm run db:seed` | Add the sample products (skips any that already exist) |
| `npm run db:studio` | Open Prisma Studio, a spreadsheet-like view of the raw data |
| `npm run db:remove-samples` | Delete only the sample data |
| `npm run db:reset` | **Erase everything** and start again with sample data |

Changing the schema later: edit `prisma/schema.prisma`, then run `npx prisma migrate dev --name describe-change`.

---

## How to add products

1. Click **Add product** (top right, on every page) or **Add Product** in the sidebar.
2. Fill in **Product name** and **SKU** (required). SKUs are saved in capitals and must be unique.
3. Under **Barcode**, choose the type (Code 128 by default) and either:
   - click **Generate barcode automatically**, or
   - type or scan the barcode already printed on the product.

   The field checks as you type. A barcode already used by another product shows *"This barcode is already assigned to another product."*
4. Set the opening stock, minimum stock (the low-stock alert level), prices and an optional image.
5. Click **Save product**.

Opening stock is recorded as a stock movement. After that, stock can only change through **Adjust stock**, so every change has a record.

### Adjusting stock

From the product page, the Inventory page, Barcode Search, or any product's **⋯** menu, choose **Adjust stock**:

- **Stock in** with reason Purchase, Return or Manual Adjustment
- **Stock out** with reason Sale, Damaged, Lost or Manual Adjustment
- **Set stock** sets an exact count (for stocktakes)

Each save updates the product and adds a row to **Stock Movements** with the previous and new stock. You can't remove more than you have.

## How to generate barcodes

- **Automatically:** while adding a product, click **Generate barcode automatically**.
- **Barcode Generator page:** pick a saved product or make a custom label, choose a type, and click **Generate** for a fresh unique code. Download it with **PNG** or **SVG**.

Generated codes use "in-store" number ranges, so they never clash with real retail barcodes:

| Type | Format | Example |
| --- | --- | --- |
| Code 128 | 12 digits starting with 2 (any text allowed when entered manually) | `200810000002` |
| EAN-13 | 13 digits, prefix 2, valid check digit | `2009100000017` |
| UPC-A | 12 digits, prefix 2, valid check digit | `209100000051` |

### Barcode search and scanners

Open **Barcode Search**. The input is focused automatically. Scan or type a code and press Enter. It matches the exact barcode first, then the exact SKU, then partial names, SKUs and barcodes.

USB and Bluetooth scanners work out of the box because they type like a keyboard and press Enter. Scanning while on **any page** (outside a text field) jumps straight to the result. You can also press `/` anywhere to focus the top search bar.

Camera scanning can be added later. See `components/barcode/scanner/types.ts`; every barcode source uses the same `onScan(code, source)` callback.

## How to print labels

Labels are **63.5 × 38.1 mm**, laid out 3 × 7 on A4 (standard 21-per-sheet label paper). Each shows the product name, SKU, barcode, number and optionally the price.

1. Use **Print barcode** on a product, or open the **Barcode Generator**.
2. Choose **1, 2, 4 or 8** labels, or type a custom quantity (up to 210).
3. Click **Print labels**. Only the labels are printed; the sidebar and menus are hidden.
4. In the print dialog, set **Margins: Default** and **Scale: 100%** (not "Fit to page") so labels line up with the sheet.

## How to back up the database

- **In the app:** go to **Settings → Backup → Export database**. This downloads a consistent copy (`inventory-backup-YYYY-MM-DD-HH-MM.db`) and is safe while the app is running.
- **Manually:** stop the app and copy `data/inventory.db`.

Copy `data/uploads/` too if you use product images; they are not stored inside the database.

**To restore:** stop the app, replace `data/inventory.db` with your backup file (rename it to `inventory.db`), then start the app again.

## How to import and export CSV

**Export:** go to **Products → Export CSV** or **Settings → Export products CSV**.

**Import:** go to **Settings → Import and export**, then choose a CSV and click **Validate and import**. You can download a template from the same place.

Expected columns (header row required; `description` is optional):

```text
name,sku,barcode,barcodeType,brand,category,stock,minStock,maxStock,unit,costPrice,sellingPrice
```

- Only `name` and `sku` are required.
- An empty `barcode` gets an auto-generated one.
- `barcodeType` accepts `CODE128`, `EAN13` or `UPCA`.
- Unknown categories are created automatically.
- Prices are normal amounts, like `449.00`.

The whole file is checked **before anything is written**. If any row has a problem, nothing is imported and every error is listed with its row number and column. Two options change this:

- **Import valid rows even if some rows have errors** imports the good rows and skips the bad ones.
- **Update existing products with the same SKU** updates matching products instead of rejecting them. Stock changes made this way are recorded as movements.

## How to reset sample data

The seed creates 10 hair-care sample products marked as samples. To remove them and keep your own data:

- **In the app:** go to **Settings → Sample data → Remove sample data**, or
- run `npm run db:remove-samples`.

Sample categories are kept if any of your products use them.

To wipe **everything** and start over with fresh samples:

```bash
npm run db:reset
```

---

## Project structure

```text
app/                 Pages (dashboard, products, inventory, movements, categories,
                     barcodes, search, settings) and API routes (CSV, backup, images, lookup)
components/          UI, grouped by feature; components/ui holds the shadcn-style primitives
  barcode/scanner/   Scanner input + keyboard-wedge detection (camera can plug in here)
lib/
  barcode.ts         Barcode types, check digits, validation, generation (shared client/server)
  validation.ts      Zod schemas for every form
  actions/           Server actions (create/update/delete, adjust stock, import, settings)
  services/          Database logic (products, CSV, images, error translation)
  money.ts           Prices are stored as integer paise; converted only for display/CSV
prisma/              schema.prisma, migrations, seed.ts
scripts/             prepare-db (runs before dev/start), remove-samples
data/                Your database and images (git-ignored)
```

**Adding authentication later:** all writes go through `lib/actions/*` and all reads happen in server components or `app/api/*`. Add a `proxy.ts` (Next.js 16's replacement for middleware) plus a session check at the top of each action.

## Troubleshooting

- **"The database isn't set up yet"**: stop the app, run `npm run setup`, then start again.
- **Port 3000 in use**: run `npx next dev -p 3001`.
- **`better-sqlite3` build errors on install**: use a Node LTS version (20 or 22), delete `node_modules`, and run `npm install` again.
- **Prices**: stored as integer paise (₹449.00 is stored as `44900`) to avoid rounding errors. This only matters if you read the database directly.
