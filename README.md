# Web Extension Store Screenshot Tool

面向 Web 扩展开发者的桌面截图与 PNG 导出工具，用来快速生成 Chrome Web Store、Microsoft Edge Add-ons、Firefox AMO、Opera Add-ons 等商店页面需要的截图素材。

## 下载

Windows 便携版 EXE 会发布在 GitHub Releases：

- [查看最新 Release](https://github.com/Un1quer23/web-extension-store-screenshot-tool/releases/latest)

便携版不内置 Playwright Chromium。截图时会优先调用本机 Chrome，其次调用 Microsoft Edge。

## 功能

- 本机浏览器：通过 CDP 连接手动启动的 Chrome 或 Edge，截取已经打开并调整好状态的页面。
- 在线网页：输入 URL 后，由工具使用本机 Chrome 或 Edge 打开页面并截图。
- 素材尺寸：内置常用商店素材尺寸，并支持自定义宽高。
- 页面位置：在线网页模式支持顶部、中部、底部和自定义滚动位置。
- PNG 导出：截图后选择保存位置，导出符合当前尺寸设置的 PNG 文件。

## 使用方法

1. 在左侧选择截图来源：`本机浏览器` 或 `在线网页`。
2. 在顶部选择素材尺寸；需要自由尺寸时选择 `自定义尺寸` 并输入宽高。
3. 在截图设置中配置当前来源并执行截图。
4. 在右侧预览截图结果和合规提示。
5. 点击 `导出 PNG`，选择保存位置。

## 本机浏览器模式

本机浏览器模式适合截取已经打开并调整好状态的页面。先用远程调试端口启动 Chrome 或 Edge，再回到应用刷新页面列表。

Chrome:

```powershell
& "$env:ProgramFiles\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\store-shot-chrome-cdp"
```

Edge:

```powershell
& "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\store-shot-edge-cdp"
```

如果 Chrome 安装在 32 位目录：

```powershell
& "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="$env:TEMP\store-shot-chrome-cdp"
```

启动后，在该浏览器窗口中打开目标页面，然后在应用中保持 CDP 地址为 `http://127.0.0.1:9222`，点击 `刷新页面列表`，选择目标页面并截图。

## 自定义尺寸

自定义尺寸要求宽高为整数，范围为 `100-7680`，并限制最大像素面积不超过 `7680x4320`。

自定义尺寸是自由截图能力，不代表截图一定符合 Chrome Web Store、Microsoft Edge Add-ons、Firefox AMO 或 Opera Add-ons 的素材提交规范。

## 开发

```bash
npm install
npm run dev
npm run build
npm test
```

## 打包

```bash
npm run dist:portable
```

打包产物会输出到 `dist/`。

## 许可证

本软件使用 GNU General Public License v3.0 开源。详见 [LICENSE](LICENSE)。
