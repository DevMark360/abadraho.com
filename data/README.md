# Database dump (legacy data)

Place your MySQL dump here so v2 uses the **same data** as dev.abadraho.com:

- `markprop_dev_abadraho.sql` (recommended name)
- or any `*.sql` file

Then import:

```powershell
powershell -ExecutionPolicy Bypass -File e:\abadraho-v2\scripts\import-sql-dump.ps1
```

Verify:

```powershell
cd e:\abadraho-v2
npm run db:verify
```

`.env` must use the imported database:

```env
USE_DATABASE=true
DATABASE_URL="mysql://markprop_usrDev:YOUR_PASSWORD@127.0.0.1:3306/markprop_dev_abadraho"
```

Use the **same** credentials as `e:\dev.abadraho.com\.env` if you import `markprop_dev` instead (change `-DbName markprop_dev` in the import script).
