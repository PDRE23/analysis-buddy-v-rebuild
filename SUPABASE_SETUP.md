# Supabase Database Setup

This guide will help you set up the required database tables in your Supabase project.

## Step 1: Access Supabase SQL Editor

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project (`ivgllaiefjwjkgwjcvsk`)
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**

## Step 2: Run the Schema SQL

1. Open the file `supabase/schema.sql` in this project
2. Copy the entire contents of the file
3. Paste it into the Supabase SQL Editor
4. Click **Run** (or press `Ctrl+Enter`)

## Step 3: Verify Tables Were Created

After running the SQL, you should see:
- ✅ Two tables created: `user_deals` and `user_analyses`
- ✅ Indexes created for performance
- ✅ Triggers created for automatic timestamp updates
- ✅ Row Level Security (RLS) policies enabled

To verify:
1. Go to **Table Editor** in the Supabase dashboard
2. You should see `user_deals` and `user_analyses` in the list

## What the Schema Creates

### Tables

**`user_deals`**
- Stores deal data for each user
- Columns: `id` (text), `user_id` (uuid), `deal` (jsonb), `created_at`, `updated_at`

**`user_analyses`**
- Stores analysis data for each user
- Columns: `id` (text), `user_id` (uuid), `analysis` (jsonb), `created_at`, `updated_at`

### Security

- Row Level Security (RLS) is enabled
- Users can only access their own data
- Policies automatically filter data by `user_id`

## Troubleshooting

### Error: "relation does not exist"
- Make sure you ran the entire `schema.sql` file
- Check that you're in the correct Supabase project

### Error: "permission denied"
- Make sure you're logged in as the project owner
- Check that RLS policies were created successfully

### Still seeing "Could not find the table" error
- Refresh your browser after running the SQL
- Make sure you're logged in to the app (authentication required)
- Check the browser console for more detailed error messages

## Next Steps

After setting up the tables:
1. Restart your local dev server (`npm run dev`)
2. Log in to the application
3. Your deals and analyses will now sync to Supabase!

