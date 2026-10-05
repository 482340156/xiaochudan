"""订单存储 —— 只用标准库 sqlite3，数据文件在 server/data/orders.db。

想清空所有订单：删掉 server/data/orders.db 再重启即可。
"""

import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DB_PATH = os.path.join(DATA_DIR, "orders.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS orders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no   TEXT    UNIQUE NOT NULL,
    customer   TEXT,
    contact    TEXT,
    note       TEXT,
    items_json TEXT    NOT NULL,
    total      REAL    NOT NULL,
    item_count INTEGER NOT NULL,
    status     TEXT    NOT NULL DEFAULT 'new',
    created_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
"""

STATUS_LABEL = {
    "new": "待处理",
    "done": "已完成",
    "cancel": "已取消",
}


@contextmanager
def connect():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with connect() as conn:
        conn.executescript(SCHEMA)


def _next_order_no(conn, now):
    day = now.strftime("%Y%m%d")
    row = conn.execute(
        "SELECT COUNT(*) AS n FROM orders WHERE order_no LIKE ?",
        (day + "-%",),
    ).fetchone()
    return "%s-%03d" % (day, row["n"] + 1)


def create_order(customer, contact, note, items, total, item_count):
    """写入一笔订单，返回订单号。"""
    now = datetime.now()
    with connect() as conn:
        order_no = _next_order_no(conn, now)
        conn.execute(
            "INSERT INTO orders"
            " (order_no, customer, contact, note, items_json, total, item_count, status, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                order_no,
                customer,
                contact,
                note,
                json.dumps(items, ensure_ascii=False),
                total,
                item_count,
                "new",
                now.strftime("%Y-%m-%d %H:%M:%S"),
            ),
        )
    return order_no


def _row_to_order(row):
    order = dict(row)
    try:
        order["items"] = json.loads(order.pop("items_json"))
    except (ValueError, TypeError):
        order["items"] = []
        order.pop("items_json", None)
    order["status_label"] = STATUS_LABEL.get(order["status"], order["status"])
    return order


def list_orders(limit=200, status=None):
    """按时间倒序列出订单。"""
    sql = "SELECT * FROM orders"
    args = []
    if status:
        sql += " WHERE status = ?"
        args.append(status)
    sql += " ORDER BY id DESC LIMIT ?"
    args.append(int(limit))

    with connect() as conn:
        rows = conn.execute(sql, args).fetchall()
    return [_row_to_order(r) for r in rows]


def get_order(order_no):
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM orders WHERE order_no = ?", (order_no,)
        ).fetchone()
    return _row_to_order(row) if row else None


def set_status(order_no, status):
    """更新订单状态，返回是否成功。"""
    if status not in STATUS_LABEL:
        return False
    with connect() as conn:
        cur = conn.execute(
            "UPDATE orders SET status = ? WHERE order_no = ?", (status, order_no)
        )
    return cur.rowcount > 0


def stats():
    """今日概况，给店主后台用。"""
    today = datetime.now().strftime("%Y-%m-%d")
    with connect() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS amount"
            " FROM orders WHERE created_at LIKE ?",
            (today + "%",),
        ).fetchone()
        pending = conn.execute(
            "SELECT COUNT(*) AS n FROM orders WHERE status = 'new'"
        ).fetchone()["n"]
        all_time = conn.execute(
            "SELECT COUNT(*) AS n FROM orders"
        ).fetchone()["n"]
    return {
        "today_orders": row["orders"],
        "today_amount": round(row["amount"], 2),
        "pending": pending,
        "all_orders": all_time,
    }
