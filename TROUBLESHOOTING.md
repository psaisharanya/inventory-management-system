# Troubleshooting: Purchases and Sales Not Storing

## Quick Diagnostic Steps

### 1. **Check Browser Console for Errors**
- Open DevTools (F12) → Console tab
- Try adding a purchase or sale
- Look for error messages in the console and red alert boxes

### 2. **Verify Supabase Connection**
- Check that `.env.local` has correct credentials:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_actual_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_key
  ```
- Restart the dev server after updating env vars

### 3. **Common Issues**

#### Issue A: "Error creating purchase: {...}"
- **Cause**: Supabase connection failed or RLS policy blocking insert
- **Fix**: 
  1. Verify env vars are correct
  2. Run the updated `database_setup.sql` in Supabase SQL Editor:
     - Go to Supabase Dashboard → SQL Editor
     - Click "New Query"
     - Copy the entire content from this project's `database_setup.sql`
     - Run it
  3. Drop old policies and re-run setup if conflicts occur

#### Issue B: "Error adding purchase detail: {...}"
- **Cause**: RLS policy issue on `purchase_details` table
- **Fix**: Same as above - run the updated database_setup.sql

#### Issue C: No error shown but data not appearing
- **Cause**: Insert succeeded but read query failing
- **Fix**:
  1. Check Supabase Dashboard → Tables
  2. Manually verify if data exists in `purchases`, `purchase_details`, `sales`, `sales_details`
  3. Check browser console for read errors

#### Issue D: "Insufficient stock" error on sales
- **Cause**: Inventory not created for product beforehand
- **Fix**:
  1. Go to Purchases page
  2. Add a purchase for the product first to create inventory
  3. Then attempt the sale

### 4. **Manual Database Check**
In Supabase SQL Editor, run:
```sql
-- Check if suppliers exist
SELECT * FROM suppliers;

-- Check if products exist
SELECT * FROM products;

-- Check if purchases exist
SELECT * FROM purchases;

-- Check if purchase_details exist
SELECT * FROM purchase_details;

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'purchases';
```

### 5. **Reset & Rebuild**
If all else fails:
1. Delete `.next/` folder: `rm -Recurse -Force .next`
2. Clear browser cache (Ctrl+Shift+Delete)
3. Run: `npm run build`
4. Restart dev server

### 6. **Console Logging**
When submitting a form, check console for detailed logs showing:
- Input values
- Each database operation
- Success/failure of each step

Look for patterns like:
```
Starting purchase submit with: {...}
Creating purchase record...
Purchase created: {purchase_id: "123"}
Parsed values: {quantityValue: 5, priceValue: 25}
Inserting purchase detail...
Purchase detail created successfully
...
All operations completed, reloading purchases...
```

## Database Policy Fix Applied

The `database_setup.sql` has been updated with explicit RLS policies for each operation:
- SELECT policy
- INSERT policy (with WITH CHECK)
- UPDATE policy (with USING and WITH CHECK)
- DELETE policy (with USING)

This replaces the generic "FOR ALL USING (true)" policies that might not work correctly with the Supabase anon key.

## Still Having Issues?

1. Check the **Console tab** in DevTools for exact error messages
2. Check the **Network tab** for failed API calls to `supabase.co`
3. Verify `.env.local` has BOTH variables (URL and ANON_KEY)
4. Try creating a dummy supplier/product first if lists are empty
