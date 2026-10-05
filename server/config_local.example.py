"""本地私有配置模板。

用法：
  1. 把本文件复制一份，改名为  config_local.py（放在同一个文件夹）
  2. 填上你自己的联系方式和你自己的后台口令

config_local.py 已经被 .gitignore 排除，不会上传到 GitHub。
这里填的值会覆盖 menu.py 里的默认值。
"""

OVERRIDES = {
    # 联系方式（手机号或微信号）
    "contact": "",
    # 店主后台的进入口令，请改成不容易猜的
    "admin_token": "change-me",
}
