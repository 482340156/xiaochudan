"""把 server/menu.py 里的菜单导出成微信小程序用的 data/menu.js。

用法（项目根目录）：
    .venv\\Scripts\\python server\\export_menu.py

平时改菜单只改 server/menu.py，改完跑一次这个脚本，
小程序和网页版的内容就自动一致了。
"""

import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
TARGET = os.path.join(PROJECT_DIR, "data", "menu.js")

from menu import (  # noqa: E402
    CATEGORIES,
    DISHES,
    SHOP,
    all_dishes,
    avatar_image,
    cover_image,
    lower_image,
)

TEMPLATE = """\
/**
 * 这个文件由 server/export_menu.py 自动生成，不要手动改。
 * 数据源是 server/menu.py，改完菜单运行：
 *     python server/export_menu.py
 */

const menuInfo = %(shop)s

const categories = %(categories)s

const dishes = %(dishes)s

function getDishById(id) {
  const key = String(id)
  for (let i = 0; i < dishes.length; i++) {
    if (String(dishes[i].id) === key) return dishes[i]
  }
  return null
}

module.exports = {
  menuInfo: menuInfo,
  categories: categories,
  dishes: dishes,
  getDishById: getDishById
}
"""


def dumps(value):
    return json.dumps(value, ensure_ascii=False, indent=2)


def build_content():
    menu_info = {
        "shopName": SHOP["name"],
        "slogan": SHOP["slogan"],
        "avatarEmoji": SHOP["avatar"],
        "avatarImg": avatar_image(),
        "cover": cover_image(),
        "lower": lower_image(),
        "since": SHOP["since"],
        "notice": SHOP["notice"],
        "contact": SHOP["contact"],
        "intro": SHOP["intro"],
    }
    return TEMPLATE % {
        "shop": dumps(menu_info),
        "categories": dumps(CATEGORIES),
        "dishes": dumps(all_dishes()),
    }


def main():
    content = build_content()
    os.makedirs(os.path.dirname(TARGET), exist_ok=True)
    with open(TARGET, "w", encoding="utf-8") as fh:
        fh.write(content)
    print("已生成 %s" % TARGET)
    dishes = all_dishes()
    print("共 %d 个分类、%d 道菜" % (len(CATEGORIES), len(dishes)))
    extra = len(dishes) - len(DISHES)
    if extra > 0:
        print("其中 %d 道是店主在后台自己加的" % extra)


if __name__ == "__main__":
    main()
