// Simulador Empresarial — aplicativo nativo do macOS (janela própria com WebKit, sem navegador).
import Cocoa
import WebKit

func jsLit(_ s: String) -> String {
    if let d = try? JSONSerialization.data(withJSONObject: [s]), let t = String(data: d, encoding: .utf8) {
        return String(t.dropFirst().dropLast())
    }
    return "\"\""
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate, WKScriptMessageHandler, WKUIDelegate {
    var window: NSWindow!
    var web: WKWebView!
    var portalWin: NSWindow?
    var portalWeb: WKWebView?
    var docWins: [String: NSWindow] = [:]
    var statePath: URL!
    var htmlURL: URL!

    func applicationDidFinishLaunching(_ notification: Notification) {
        let fm = FileManager.default
        let sup = fm.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Simulador Enividia")
        try? fm.createDirectory(at: sup, withIntermediateDirectories: true)
        statePath = sup.appendingPathComponent("estado.json")

        let proj = Bundle.main.bundleURL.deletingLastPathComponent()
        var html = proj.appendingPathComponent("simulador/index.html")
        if !fm.fileExists(atPath: html.path), let res = Bundle.main.resourceURL {
            html = res.appendingPathComponent("index.html")
        }
        htmlURL = html

        buildMenu()

        let cfg = WKWebViewConfiguration()
        cfg.userContentController.add(self, name: "sim")
        let frame = NSRect(x: 0, y: 0, width: 1440, height: 920)
        web = WKWebView(frame: frame, configuration: cfg)
        web.uiDelegate = self
        web.autoresizingMask = [.width, .height]
        installBoot()

        window = NSWindow(contentRect: frame, styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.isReleasedWhenClosed = false
        window.title = "Simulador Empresarial"
        window.minSize = NSSize(width: 900, height: 600)
        window.contentView = web
        window.delegate = self
        window.center()
        window.setFrameAutosaveName("SimuladorEmpresarialJanela")
        web.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    // injeta o estado salvo antes de a página carregar
    func installBoot() {
        let ucc = web.configuration.userContentController
        ucc.removeAllUserScripts()
        var boot = "window.__NATIVE=1;window.__NATIVE_SAVEFILE=1;"
        if let st = try? String(contentsOf: statePath, encoding: .utf8), !st.isEmpty {
            boot += "window.__NATIVE_STATE=" + jsLit(st) + ";"
        }
        ucc.addUserScript(WKUserScript(source: boot, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { return true }

    func windowWillClose(_ notification: Notification) {
        if let w = notification.object as? NSWindow, w === window { NSApp.terminate(nil) }
    }

    // ---------------- menus
    func buildMenu() {
        let main = NSMenu()

        let appItem = NSMenuItem(); main.addItem(appItem)
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "Ocultar Simulador Empresarial", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "Sair do Simulador Empresarial", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu

        let editItem = NSMenuItem(); main.addItem(editItem)
        let edit = NSMenu(title: "Editar")
        edit.addItem(withTitle: "Desfazer", action: Selector(("undo:")), keyEquivalent: "z")
        edit.addItem(withTitle: "Refazer", action: Selector(("redo:")), keyEquivalent: "Z")
        edit.addItem(NSMenuItem.separator())
        edit.addItem(withTitle: "Recortar", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        edit.addItem(withTitle: "Copiar", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: "Colar", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edit.addItem(withTitle: "Selecionar Tudo", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = edit

        let winItem = NSMenuItem(); main.addItem(winItem)
        let win = NSMenu(title: "Janela")
        let reload = NSMenuItem(title: "Recarregar", action: #selector(reloadPage(_:)), keyEquivalent: "r")
        reload.target = self
        win.addItem(reload)
        win.addItem(withTitle: "Minimizar", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        win.addItem(withTitle: "Fechar Janela", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        let fs = NSMenuItem(title: "Tela Cheia", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        fs.keyEquivalentModifierMask = [.command, .control]
        win.addItem(fs)
        winItem.submenu = win

        NSApp.mainMenu = main
    }

    @objc func reloadPage(_ sender: Any?) {
        installBoot()
        web.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())
    }

    // ---------------- mensagens da página
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let msg = message.body as? String else { return }
        if msg.hasPrefix("save:") {
            try? String(msg.dropFirst(5)).write(to: statePath, atomically: true, encoding: .utf8)
        } else if msg.hasPrefix("portal:") {
            showPortal(String(msg.dropFirst(7)), front: true)
        } else if msg.hasPrefix("portalrefresh:") {
            showPortal(String(msg.dropFirst(14)), front: false)
        } else if msg.hasPrefix("doc:") {
            let parts = String(msg.dropFirst(4)).components(separatedBy: "|")
            showDoc(parts[0], title: parts.count > 1 ? parts[1] : parts[0])
        } else if msg == "import" || msg == "openjson" {
            let p = NSOpenPanel()
            p.canChooseFiles = true; p.canChooseDirectories = false; p.allowsMultipleSelection = false
            p.allowedFileTypes = msg == "import" ? ["xls", "xlsx"] : ["json"]
            p.title = msg == "import" ? "Escolha a exportação \"Todos\" do SimulWeb" : "Escolha uma simulação salva"
            if p.runModal() == .OK, let url = p.url {
                if msg == "import", let data = try? Data(contentsOf: url) {
                    web.evaluateJavaScript("window.__nativeImport(" + jsLit(data.base64EncodedString()) + ")", completionHandler: nil)
                } else if msg == "openjson", let txt = try? String(contentsOf: url, encoding: .utf8) {
                    web.evaluateJavaScript("window.__nativeLoadJSON(" + jsLit(txt) + ")", completionHandler: nil)
                }
            }
        } else if msg.hasPrefix("savefile:") {
            let body = String(msg.dropFirst(9))
            if let bar = body.firstIndex(of: "|") {
                let name = String(body[..<bar]), b64 = String(body[body.index(after: bar)...])
                let s = NSSavePanel()
                s.nameFieldStringValue = name
                let ext = (name as NSString).pathExtension
                if !ext.isEmpty { s.allowedFileTypes = [ext] }
                // pasta padrão: "Planilhas", ao lado do app
                let pasta = Bundle.main.bundleURL.deletingLastPathComponent().appendingPathComponent("Planilhas")
                try? FileManager.default.createDirectory(at: pasta, withIntermediateDirectories: true)
                s.directoryURL = pasta
                if s.runModal() == .OK, let url = s.url, let data = Data(base64Encoded: b64) {
                    if (try? data.write(to: url)) != nil { NSWorkspace.shared.activateFileViewerSelecting([url]) }
                }
            }
        } else if msg.hasPrefix("export:") {
            let s = NSSavePanel()
            s.nameFieldStringValue = "simulacao.json"
            s.allowedFileTypes = ["json"]
            if s.runModal() == .OK, let url = s.url {
                try? String(msg.dropFirst(7)).write(to: url, atomically: true, encoding: .utf8)
            }
        }
    }

    func makeWindow(_ rect: NSRect, title: String, autosave: String) -> (NSWindow, WKWebView) {
        let w = NSWindow(contentRect: rect, styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        w.isReleasedWhenClosed = false
        w.title = title
        w.minSize = NSSize(width: 700, height: 500)
        let v = WKWebView(frame: rect, configuration: WKWebViewConfiguration())
        v.autoresizingMask = [.width, .height]
        w.contentView = v
        w.setFrameAutosaveName(autosave)
        return (w, v)
    }

    // Portal de Notícias em janela própria
    func showPortal(_ html: String, front: Bool) {
        if portalWin == nil {
            let (w, v) = makeWindow(NSRect(x: 80, y: 60, width: 1280, height: 880), title: "Portal S8 · Notícias", autosave: "SimuladorEmpresarialPortal")
            portalWin = w; portalWeb = v
        }
        guard let w = portalWin, let v = portalWeb else { return }
        if !front && !w.isVisible { return }
        v.loadHTMLString(html, baseURL: nil)
        if front { w.makeKeyAndOrderFront(nil) }
    }

    // Manual e glossário (PDF) em janela própria
    func showDoc(_ file: String, title: String) {
        if let w = docWins[file] { w.makeKeyAndOrderFront(nil); return }
        let url = htmlURL.deletingLastPathComponent().appendingPathComponent("docs").appendingPathComponent(file)
        let (w, v) = makeWindow(NSRect(x: 120, y: 80, width: 980, height: 900), title: title, autosave: "SimuladorEmpresarialDoc_" + file)
        v.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        docWins[file] = w
        w.makeKeyAndOrderFront(nil)
    }

    // seletor de arquivos para <input type="file">
    func webView(_ webView: WKWebView, runOpenPanelWith parameters: WKOpenPanelParameters, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping ([URL]?) -> Void) {
        let p = NSOpenPanel()
        p.allowsMultipleSelection = parameters.allowsMultipleSelection
        completionHandler(p.runModal() == .OK ? p.urls : nil)
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
