from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine, event, inspect

from app import db
from app.db_models import Product


def test_old_sqlite_requires_rebuild_and_preserves_data_and_references():
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.exec_driver_sql("PRAGMA foreign_keys=ON")
        connection.exec_driver_sql("CREATE TABLE stores (id TEXT PRIMARY KEY)")
        connection.exec_driver_sql("CREATE TABLE generated_sites (id TEXT PRIMARY KEY)")
        connection.exec_driver_sql("INSERT INTO stores VALUES ('store')")
        connection.exec_driver_sql("CREATE TABLE products (id TEXT PRIMARY KEY, store_id TEXT REFERENCES stores(id), name TEXT, price_cents INTEGER NOT NULL)")
        connection.exec_driver_sql("CREATE INDEX product_name_test ON products(name)")
        connection.exec_driver_sql("CREATE TABLE product_changes (name TEXT)")
        connection.exec_driver_sql("CREATE TRIGGER product_name_audit AFTER UPDATE OF name ON products BEGIN INSERT INTO product_changes VALUES (NEW.name); END")
        connection.exec_driver_sql("CREATE TABLE references_product (product_id TEXT REFERENCES products(id))")
        connection.exec_driver_sql("INSERT INTO products VALUES ('p','store','Original',2500)")
        connection.exec_driver_sql("INSERT INTO references_product VALUES ('p')")
    assert not next(c for c in inspect(engine).get_columns("products") if c["name"] == "price_cents")["nullable"]
    statements = []
    event.listen(engine, "before_cursor_execute", lambda conn, cursor, statement, parameters, context, many: statements.append(statement))
    with patch.object(db, "engine", engine):
        db._ensure_additive_columns()
        assert next(c for c in inspect(engine).get_columns("products") if c["name"] == "price_cents")["nullable"]
        with engine.begin() as connection:
            assert connection.exec_driver_sql("SELECT name,price_cents,quote_only FROM products WHERE id='p'").one() == ("Original", 2500, 0)
            assert connection.exec_driver_sql("PRAGMA foreign_keys").scalar() == 1
            assert not connection.exec_driver_sql("PRAGMA foreign_key_check").all()
            assert connection.exec_driver_sql("SELECT product_id FROM references_product").scalar() == "p"
            connection.exec_driver_sql("INSERT INTO products (id,store_id,name,quote_only,price_cents) VALUES ('q','store','Quote',1,NULL)")
            connection.exec_driver_sql("UPDATE products SET name='Changed' WHERE id='q'")
            assert connection.exec_driver_sql("SELECT name FROM product_changes").scalar() == "Changed"
        assert any(i["name"] == "product_name_test" for i in inspect(engine).get_indexes("products"))
        statements.clear()
        db._ensure_additive_columns()
        assert not any(s.startswith(("ALTER TABLE", "DROP TABLE", "CREATE TABLE", "INSERT INTO")) for s in statements)
    engine.dispose()


def test_phase3_sqlite_upgrade_is_additive_with_defaults_and_foreign_key():
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.exec_driver_sql("PRAGMA foreign_keys=ON")
        connection.exec_driver_sql("CREATE TABLE generated_sites (id TEXT PRIMARY KEY)")
        connection.exec_driver_sql("CREATE TABLE products (id TEXT PRIMARY KEY, price_cents INTEGER, description TEXT, image_url TEXT, sku TEXT, quote_only BOOLEAN NOT NULL DEFAULT FALSE)")
        connection.exec_driver_sql("INSERT INTO products (id,price_cents) VALUES ('existing',2500)")
    statements = []
    event.listen(engine, "before_cursor_execute", lambda conn, cursor, statement, parameters, context, many: statements.append(statement))
    with patch.object(db, "engine", engine):
        db._ensure_additive_columns()
        assert sum("ALTER TABLE products ADD COLUMN" in s for s in statements) == 5
        assert not any(s.startswith(("CREATE TABLE", "DROP TABLE", "INSERT INTO")) for s in statements)
        with engine.connect() as connection:
            assert connection.exec_driver_sql("SELECT source,site_id,price_is_approximate,price_cents FROM products").one() == ("owner_edited", None, 0, 2500)
            fk = connection.exec_driver_sql("PRAGMA foreign_key_list(products)").one()
            assert fk[2:5] == ("generated_sites", "site_id", "id")
            assert fk[6] == "SET NULL"
        statements.clear()
        db._ensure_additive_columns()
        assert not any(s.startswith(("ALTER TABLE", "DROP TABLE", "CREATE TABLE", "INSERT INTO")) for s in statements)
    engine.dispose()


def test_phase4_sqlite_adds_only_nullable_catalog_index_without_rebuild():
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE products (id TEXT PRIMARY KEY, price_cents INTEGER, description TEXT, image_url TEXT, sku TEXT, quote_only BOOLEAN NOT NULL DEFAULT FALSE, source TEXT NOT NULL DEFAULT 'owner_edited', site_id TEXT, price_is_approximate BOOLEAN NOT NULL DEFAULT FALSE)")
        connection.exec_driver_sql("INSERT INTO products(id,price_cents) VALUES ('old',2500)")
    statements = []
    event.listen(engine, "before_cursor_execute", lambda conn, cursor, statement, parameters, context, many: statements.append(statement))
    with patch.object(db, "engine", engine):
        db._ensure_additive_columns()
        ddl = [s for s in statements if s.startswith(("ALTER TABLE", "CREATE TABLE", "DROP TABLE", "INSERT INTO"))]
        assert ddl == [
            "ALTER TABLE products ADD COLUMN catalog_index INTEGER",
            "ALTER TABLE products ADD COLUMN weight_oz INTEGER",
        ]
        with engine.connect() as connection:
            assert connection.exec_driver_sql("SELECT price_cents,catalog_index FROM products").one() == (2500, None)
        statements.clear()
        db._ensure_additive_columns()
        assert not any(s.startswith(("ALTER TABLE", "CREATE TABLE", "DROP TABLE", "INSERT INTO")) for s in statements)
    engine.dispose()


def test_phase4_postgres_adds_only_catalog_index():
    engine = MagicMock()
    engine.dialect.name = "postgresql"
    connection = engine.begin.return_value.__enter__.return_value
    columns = {"id", "price_cents", "description", "image_url", "sku", "quote_only", "source", "site_id", "price_is_approximate"}
    inspector = MagicMock()
    inspector.get_table_names.return_value = ["products"]
    inspector.get_columns.side_effect = lambda table: [{"name": name, "nullable": True} for name in columns]
    def execute(sql):
        if "ADD COLUMN" in sql:
            columns.add(sql.split("ADD COLUMN ")[1].split()[0])
    connection.exec_driver_sql.side_effect = execute
    with patch.object(db, "engine", engine), patch.object(db, "inspect", return_value=inspector):
        db._ensure_additive_columns()
        assert [c.args[0] for c in connection.exec_driver_sql.call_args_list if "ALTER TABLE" in c.args[0]] == [
            "ALTER TABLE products ADD COLUMN catalog_index INTEGER",
            "ALTER TABLE products ADD COLUMN weight_oz INTEGER",
        ]
        connection.exec_driver_sql.reset_mock()
        db._ensure_additive_columns()
        assert not any("ALTER TABLE" in c.args[0] for c in connection.exec_driver_sql.call_args_list)


def test_fresh_sqlite_schema_is_already_nullable():
    engine = create_engine("sqlite://")
    db.Base.metadata.create_all(engine)
    assert Product.__table__.c.price_cents.nullable
    assert next(c for c in inspect(engine).get_columns("products") if c["name"] == "price_cents")["nullable"]
    engine.dispose()


def test_postgres_migration_uses_drop_not_null_once():
    engine = MagicMock()
    engine.dialect.name = "postgresql"
    connection = engine.begin.return_value.__enter__.return_value
    nullable = False
    columns = {"id", "price_cents"}

    def execute(sql):
        nonlocal nullable
        if "ADD COLUMN" in sql:
            columns.add(sql.split("ADD COLUMN ")[1].split()[0])
        if "DROP NOT NULL" in sql:
            nullable = True

    connection.exec_driver_sql.side_effect = execute
    inspector = MagicMock()
    inspector.get_table_names.return_value = ["products"]
    inspector.get_columns.side_effect = lambda table: [
        {"name": name, "nullable": nullable if name == "price_cents" else True} for name in columns
    ]
    with patch.object(db, "engine", engine), patch.object(db, "inspect", return_value=inspector):
        db._ensure_additive_columns()
        first_sql = [call.args[0] for call in connection.exec_driver_sql.call_args_list]
        assert "ALTER TABLE products ALTER COLUMN price_cents DROP NOT NULL" in first_sql
        assert "SET LOCAL lock_timeout = '5s'" in first_sql
        assert sum("ADD COLUMN" in sql for sql in first_sql) == 9
        connection.exec_driver_sql.reset_mock()
        db._ensure_additive_columns()
        assert not any("ALTER TABLE" in call.args[0] for call in connection.exec_driver_sql.call_args_list)
