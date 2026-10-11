@echo off
chcp 936 >nul
title LoL 信号盘 - 策略安装（需要管理员）
color 0E
setlocal
set "ID=cjpelefbgpepopbcgkbdfpphmpclponm"
set "XML=file:///C:/Users/Lenovo/Desktop/CHI%E8%AE%BA%E6%96%87/lol-ping-wheel-update.xml"
echo.
echo   ==============================================================
echo    策略安装：让扩展永不被停用（需要管理员权限）
echo   ==============================================================
echo.
net session >nul 2>&1
if errorlevel 1 (
  echo    [!] 需要管理员权限。
  echo.
  echo    请关掉本窗口，右键本文件，选择「以管理员身份运行」。
  echo.
  pause
  exit /b 1
)
echo    正在写入 Edge 策略 ...
reg add "HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist" /v 1 /t REG_SZ /d "%ID%;%XML%" /f >nul 2>&1
reg query "HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist" /v 1 >nul 2>&1
if errorlevel 1 goto fail
echo.
echo   ==============================================================
echo    [成功] 策略已写入
echo   ==============================================================
echo.
echo    请完全关闭 Edge，再重新打开。Edge 会按策略自动安装本扩展：
echo      - 不能被停用，重启不会失效
echo      - 不需要开发者模式
echo.
echo    副作用：Edge 菜单里会出现「由你的组织管理」，这是策略生效的标志。
echo.
echo    撤销（同样以管理员身份运行）：
echo      reg delete "HKLM\SOFTWARE\Policies\Microsoft\Edge\ExtensionInstallForcelist" /v 1 /f
echo.
pause
exit /b 0
:fail
echo.
echo   [失败] 策略写入被拒绝 —— 多半是安全软件锁了注册表。
echo    那就先用开发者模式加载的那份，功能完全一样。
echo.
pause
exit /b 1
