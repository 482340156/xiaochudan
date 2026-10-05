#!/usr/bin/env python3
"""个人电子菜单 · Flask 服务端

启动（在项目根目录）：
    .venv\\Scripts\\python server\\app.py          Windows
    .venv/bin/python server/app.py                macOS / Linux

或者直接双击 start.bat。

三个入口：
    /                菜单页 —— 发给朋友的就是这个地址
    /shop?token=...  店主后台 —— 看订单、标记完成
    /api/menu        菜单接口 —— 微信小程序也能用它取数据
"""

import argparse
import io
import json
import os
import socket
import subprocess
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

PROJECT_DIR = os.path.dirname(BASE_DIR)
# 菜品照片放这里：项目目录\images\
IMAGES_DIR = os.path.join(PROJECT_DIR, "images")

import qrcode
from flask import (
    Flask,
    abort,
    jsonify,
    make_response,
    redirect,
    render_template,
    request,
    send_file,
    send_from_directory,
    url_for,
)

import db
from menu import (
    CATEGORIES,
    SHOP,
    add_dish,
    all_dishes,
    avatar_image,
    cover_image,
    delete_dish,
    extra_dishes,
    get_dish,
    lower_image,
    next_dish_id,
    recommended,
)

app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
try:
    app.json.ensure_ascii = False
except AttributeError:
    app.config["JSON_AS_ASCII"] = False

COOKIE_NAME = "pm_shop_token"


def money(value):
    """91.0 显示成 91，91.5 显示成 91.50。"""
    try:
        number = float(value)
    except (TypeError, ValueError):
        return value
    if number.is_integer():
        return str(int(number))
    return "%.2f" % number


app.jinja_env.filters["money"] = money


# ------------------------------------------------------------------ 小工具


def lan_ip():
    """本机在局域网里的地址 —— 朋友要连的是这个，不是 127.0.0.1。"""
    found = []

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        found.append(sock.getsockname()[0])
    except OSError:
        pass
    finally:
        sock.close()

    try:
        found.append(socket.gethostbyname(socket.gethostname()))
    except OSError:
        pass

    for ip in found:
        if ip and not ip.startswith("127."):
            return ip
    return "127.0.0.1"


def menu_url():
    return "http://%s:%s/" % (lan_ip(), app.config.get("PORT") or 8000)


def current_token():
    return (
        request.form.get("token")
        or request.args.get("token")
        or request.cookies.get(COOKIE_NAME)
        or ""
    )


def shop_authed():
    return current_token() == SHOP["admin_token"]


def build_items(raw_items):
    """按菜单里的价格重新算钱 —— 不相信前端传来的金额。"""
    items = []
    total = 0.0
    count = 0

    for raw in raw_items or []:
        if not isinstance(raw, dict):
            continue
        dish = get_dish(raw.get("id"))
        if not dish:
            continue
        try:
            qty = int(raw.get("qty") or 0)
        except (TypeError, ValueError):
            qty = 0
        qty = max(0, min(qty, 99))
        if qty == 0:
            continue

        subtotal = round(dish["price"] * qty, 2)
        total += subtotal
        count += qty
        items.append(
            {
                "id": dish["id"],
                "name": dish["name"],
                "unit": dish["unit"],
                "price": dish["price"],
                "qty": qty,
                "subtotal": subtotal,
            }
        )

    return items, round(total, 2), count


def order_text(order_no, items, total, count, customer, contact, note):
    lines = ["【%s · 点单清单】" % SHOP["name"], "————————————"]
    lines.append("订单号：%s" % order_no)
    for it in items:
        lines.append("%s × %d   ¥%s" % (it["name"], it["qty"], money(it["subtotal"])))
    lines.append("————————————")
    lines.append("合计：¥%s（共 %d 份）" % (money(total), count))
    if customer:
        lines.append("称呼：%s" % customer)
    if contact:
        lines.append("联系：%s" % contact)
    if note:
        lines.append("备注：%s" % note)
    if SHOP.get("contact"):
        lines.append("主理人：%s" % SHOP["contact"])
    return "\n".join(lines)


def boot_json():
    """给前端用的精简数据。"""
    dish_map = {
        str(d["id"]): {
            "name": d["name"],
            "price": d["price"],
            "unit": d["unit"],
            "emoji": d["emoji"],
        }
        for d in all_dishes()
    }
    shop_info = {
        "name": SHOP["name"],
        "contact": SHOP["contact"],
        "notice": SHOP["notice"],
    }
    return json.dumps(shop_info, ensure_ascii=False), json.dumps(
        dish_map, ensure_ascii=False
    )


# ------------------------------------------------------------------ 页面


@app.get("/")
def menu_page():
    shop_json, dishes_json = boot_json()
    return render_template(
        "menu.html",
        shop=SHOP,
        categories=CATEGORIES,
        dishes=all_dishes(),
        recommends=recommended(),
        cover=cover_image(),
        avatar=avatar_image(),
        lower=lower_image(),
        shop_json=shop_json,
        dishes_json=dishes_json,
    )


@app.get("/dish/<int:dish_id>")
def dish_page(dish_id):
    dish = get_dish(dish_id)
    if not dish:
        abort(404)

    lines = ["【%s】来自 %s" % (dish["name"], SHOP["name"]), "", "食材："]
    lines += ["· " + x for x in dish["ingredients"]]
    lines += ["", "做法："]
    lines += ["%d. %s" % (i + 1, s) for i, s in enumerate(dish["steps"])]
    if dish.get("tips"):
        lines += ["", "小贴士：" + dish["tips"]]

    shop_json, dishes_json = boot_json()
    return render_template(
        "dish.html",
        shop=SHOP,
        dish=dish,
        recipe_text="\n".join(lines),
        shop_json=shop_json,
        dishes_json=dishes_json,
    )


@app.get("/shop")
def shop():
    if not shop_authed():
        return render_template(
            "token.html", shop=SHOP, has_error=bool(request.args.get("token"))
        )

    resp = make_response(
        render_template(
            "shop.html",
            shop=SHOP,
            orders=db.list_orders(),
            stats=db.stats(),
            custom_dishes=extra_dishes(),
            dish_count=len(all_dishes()),
            synced=request.args.get("synced", ""),
            menu_url=menu_url(),
            token=SHOP["admin_token"],
        )
    )
    resp.set_cookie(
        COOKIE_NAME,
        SHOP["admin_token"],
        max_age=60 * 60 * 24 * 30,
        httponly=True,
        samesite="Lax",
    )
    return resp


@app.post("/shop/status")
def shop_status():
    if not shop_authed():
        abort(403)
    db.set_status(request.form.get("order_no", ""), request.form.get("status", ""))
    return redirect(url_for("shop"))


ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_PHOTO_EDGE = 1200


def _save_dish_photo(file_storage, base_path):
    """存菜品照片，顺手压缩。

    手机拍的照片动辄 2~5MB，而微信小程序整个包不能超过 2MB，
    所以这里统一缩到最长边 1200 像素、转成 jpg（一般 100~300KB）。
    万一图片格式特殊压不了，就原样存下来兜底。
    返回实际使用的后缀。
    """
    try:
        from PIL import Image

        file_storage.stream.seek(0)
        img = Image.open(file_storage.stream)
        if img.mode not in ("RGB", "L"):
            img = img.convert("RGB")
        if max(img.size) > MAX_PHOTO_EDGE:
            img.thumbnail((MAX_PHOTO_EDGE, MAX_PHOTO_EDGE), Image.LANCZOS)
        img.save(base_path + ".jpg", "JPEG", quality=82, optimize=True)
        return ".jpg"
    except Exception:
        file_storage.stream.seek(0)
        ext = os.path.splitext(file_storage.filename or "")[1].lower()
        if ext not in ALLOWED_IMAGE_EXT:
            ext = ".jpg"
        file_storage.save(base_path + ext)
        return ext


def _split_lines(text):
    """每行一条 —— 食材和做法都这么填。"""
    return [line.strip() for line in (text or "").splitlines() if line.strip()]


def _split_words(text):
    """标签：顿号、逗号、空格分开都行。"""
    cleaned = text or ""
    for sep in ("、", "，", ",", "；", ";", "|"):
        cleaned = cleaned.replace(sep, " ")
    return [w for w in cleaned.split() if w]


@app.get("/images/<path:filename>")
def images(filename):
    """菜品照片。文件放在 D:\\小程序\\images\\ 里面。"""
    return send_from_directory(IMAGES_DIR, filename)


@app.get("/shop/dish/new")
def shop_dish_new():
    if not shop_authed():
        return render_template("token.html", shop=SHOP, has_error=False)
    return render_template(
        "dish_form.html",
        shop=SHOP,
        categories=CATEGORIES,
        error="",
        values={},
        token=SHOP["admin_token"],
    )


@app.post("/shop/dish/new")
def shop_dish_create():
    if not shop_authed():
        abort(403)

    form = request.form
    name = (form.get("name") or "").strip()
    if not name:
        return (
            render_template(
                "dish_form.html",
                shop=SHOP,
                categories=CATEGORIES,
                error="菜名不能空",
                values=form,
                token=SHOP["admin_token"],
            ),
            400,
        )

    dish_id = next_dish_id()

    # 照片存到 images/dishes/<菜品编号>.jpg，并自动压缩
    image_path = (form.get("image") or "").strip()
    photo = request.files.get("photo")
    if photo and photo.filename:
        target_base = os.path.join(IMAGES_DIR, "dishes", str(dish_id))
        os.makedirs(os.path.dirname(target_base), exist_ok=True)
        ext = _save_dish_photo(photo, target_base)
        image_path = "/images/dishes/%d%s" % (dish_id, ext)

    try:
        price = round(float(form.get("price") or 0), 2)
    except (TypeError, ValueError):
        price = 0

    try:
        spicy = max(0, min(3, int(form.get("spicy") or 0)))
    except (TypeError, ValueError):
        spicy = 0

    add_dish(
        {
            "name": name,
            "category": form.get("category") or CATEGORIES[0]["id"],
            "price": price,
            "unit": (form.get("unit") or "份").strip(),
            "emoji": (form.get("emoji") or "🍽️").strip(),
            "image": image_path,
            "recommend": form.get("recommend") == "on",
            "spicy": spicy,
            "tags": _split_words(form.get("tags")),
            "time": (form.get("time") or "").strip(),
            "level": (form.get("level") or "").strip(),
            "desc": (form.get("desc") or "").strip(),
            "ingredients": _split_lines(form.get("ingredients")),
            "steps": _split_lines(form.get("steps")),
            "tips": (form.get("tips") or "").strip(),
        },
        dish_id=dish_id,
    )
    return redirect(url_for("shop", synced="added"))


@app.post("/shop/dish/delete")
def shop_dish_delete():
    if not shop_authed():
        abort(403)
    delete_dish(request.form.get("dish_id"))
    return redirect(url_for("shop", synced="deleted"))


@app.post("/shop/sync")
def shop_sync():
    """把菜单导出给微信小程序（相当于帮你跑 export_menu.py）。"""
    if not shop_authed():
        abort(403)
    script = os.path.join(BASE_DIR, "export_menu.py")
    try:
        result = subprocess.run(
            [sys.executable, script],
            capture_output=True,
            text=True,
            encoding="utf-8",
            cwd=PROJECT_DIR,
        )
        ok = result.returncode == 0
    except OSError:
        ok = False
    return redirect(url_for("shop", synced="sync-ok" if ok else "sync-fail"))


@app.get("/qr.png")
def qr_png():
    """菜单地址的二维码，朋友扫一下就能打开。"""
    image = qrcode.make(menu_url())
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return send_file(buffer, mimetype="image/png")


# ------------------------------------------------------------------ 接口


@app.get("/api/menu")
def api_menu():
    return jsonify(
        {
            "shop": {k: v for k, v in SHOP.items() if k != "admin_token"},
            "categories": CATEGORIES,
            "dishes": all_dishes(),
        }
    )


@app.get("/api/orders")
def api_orders():
    if not shop_authed():
        return jsonify({"ok": False, "error": "口令不对"}), 403
    return jsonify({"ok": True, "orders": db.list_orders(), "stats": db.stats()})


@app.post("/api/order")
def api_order():
    payload = request.get_json(silent=True) or request.form
    items, total, count = build_items(payload.get("items"))
    if not items:
        return jsonify({"ok": False, "error": "请先选几道菜"}), 400

    customer = (payload.get("customer") or "").strip()[:20]
    contact = (payload.get("contact") or "").strip()[:40]
    note = (payload.get("note") or "").strip()[:120]

    order_no = db.create_order(customer, contact, note, items, total, count)
    return jsonify(
        {
            "ok": True,
            "order_no": order_no,
            "total": total,
            "count": count,
            "text": order_text(order_no, items, total, count, customer, contact, note),
        }
    )


@app.get("/health")
def health():
    return jsonify({"ok": True, "service": "personal-menu"})


@app.errorhandler(404)
def not_found(_err):
    return render_template("404.html", shop=SHOP), 404


# ------------------------------------------------------------------ 启动


def print_qr(url):
    """在控制台画一个二维码，手机扫一下就能打开菜单。"""
    try:
        qr = qrcode.QRCode(border=2)
        qr.add_data(url)
        qr.make(fit=True)
        qr.print_ascii(invert=True, out=sys.stdout)
    except Exception:
        print("    （二维码没画出来，用下面的网址就行）")


def print_banner(url, port):
    line = "=" * 58
    print(line)
    print("  %s 开张了" % SHOP["name"])
    print(line)
    print()
    print("  朋友手机扫码就能点单（手机要和电脑连同一个 Wi-Fi）：")
    print()
    print_qr(url)
    print()
    print("  扫不出来就手动输入这个网址：")
    print("      %s" % url)
    print()
    print("  你自己在这台电脑上看菜单：http://127.0.0.1:%s/" % port)
    print("  店主后台（看订单）：%sshop?token=%s" % (url, SHOP["admin_token"]))
    print()
    print("  想停下来：按 Ctrl+C")
    print(line)


def main():
    parser = argparse.ArgumentParser(description="个人电子菜单服务端")
    parser.add_argument("--port", type=int, default=8000, help="端口，默认 8000")
    parser.add_argument("--host", default="0.0.0.0", help="监听地址，默认所有网卡")
    parser.add_argument(
        "--dev", action="store_true", help="调试模式，改完代码自动重启"
    )
    parser.add_argument(
        "--open",
        dest="open_browser",
        action="store_true",
        help="启动后自动用浏览器打开菜单页",
    )
    args = parser.parse_args()

    db.init_db()
    app.config["PORT"] = args.port

    url = "http://%s:%s/" % (lan_ip(), args.port)
    print_banner(url, args.port)

    if args.open_browser:
        try:
            import webbrowser

            webbrowser.open("http://127.0.0.1:%s/" % args.port)
        except Exception:
            pass

    if args.dev:
        app.run(host=args.host, port=args.port, debug=True)
        return

    try:
        from waitress import serve

        print("  正在服务中…（这个窗口别关，关了朋友就打不开了）")
        serve(app, host=args.host, port=args.port, threads=8)
    except ImportError:
        print("  没装 waitress，改用 Flask 自带服务器")
        app.run(host=args.host, port=args.port, debug=False)


if __name__ == "__main__":
    main()
