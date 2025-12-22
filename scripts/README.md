# Admin Scripts

## Promote User to Admin

To promote a user to admin role:

1. Edit `promote-to-admin.sql` and replace `REPLACE_WITH_EMAIL` with the user's email
2. Run on VPS:

```bash
# Method 1: Direct SQL execution
docker exec bitchange-db mysql -ubitchange -p'PNskCx58YLkXcpj2s16X' bitchange_pro -e "UPDATE users SET role = 'admin' WHERE email = 'user@example.com';"

# Method 2: Using SQL file
docker exec -i bitchange-db mysql -ubitchange -p'PNskCx58YLkXcpj2s16X' bitchange_pro < promote-to-admin.sql
```

3. Verify the change:

```bash
docker exec bitchange-db mysql -ubitchange -p'PNskCx58YLkXcpj2s16X' bitchange_pro -e "SELECT id, name, email, role FROM users WHERE email = 'user@example.com';"
```

## List All Admin Users

```bash
docker exec bitchange-db mysql -ubitchange -p'PNskCx58YLkXcpj2s16X' bitchange_pro -e "SELECT id, name, email, role, createdAt FROM users WHERE role = 'admin';"
```
