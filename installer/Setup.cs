// QG 1.0 - installateur Windows (compilé par BUILD-QG10.bat avec le compilateur C# inclus dans Windows)
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

static class Setup
{
    const string AppName = "QG 1.0";
    const string Folder = "QG-1.0";
    const string Exe = "QG-1.0.exe";
    const string Version = "1.0.1";
    static readonly bool FR = System.Globalization.CultureInfo.CurrentUICulture.TwoLetterISOLanguageName == "fr";
    static string L(string fr, string en) { return FR ? fr : en; }

    [STAThread]
    static int Main()
    {
        Application.EnableVisualStyles();
        if (MessageBox.Show(L("Installer ", "Install ") + AppName + L(" sur cet ordinateur ?\n\nDossier : ", " on this computer?\n\nFolder: ") + "%LOCALAPPDATA%\\Programs\\" + Folder,
            AppName + " - Installation", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) return 0;

        Form f = new Form();
        f.Text = AppName + " - Installation";
        f.Width = 460; f.Height = 150;
        f.FormBorderStyle = FormBorderStyle.FixedDialog; f.MaximizeBox = false; f.MinimizeBox = false;
        f.StartPosition = FormStartPosition.CenterScreen;
        f.BackColor = Color.FromArgb(11, 13, 16); f.ForeColor = Color.FromArgb(228, 168, 58);
        Label lbl = new Label(); lbl.Text = L("Installation en cours...", "Installing..."); lbl.Left = 20; lbl.Top = 20; lbl.Width = 400; lbl.Font = new Font("Consolas", 10);
        ProgressBar bar = new ProgressBar(); bar.Style = ProgressBarStyle.Marquee; bar.Left = 20; bar.Top = 55; bar.Width = 400; bar.Height = 18;
        f.Controls.Add(lbl); f.Controls.Add(bar);

        string error = null;
        string programs = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Programs");
        string dest = Path.Combine(programs, Folder);

        Thread t = new Thread(delegate ()
        {
            try { Install(programs, dest); }
            catch (Exception ex) { error = ex.Message; }
            f.BeginInvoke((MethodInvoker)delegate { f.Close(); });
        });
        f.Shown += delegate { t.Start(); };
        Application.Run(f);

        if (error != null)
        {
            MessageBox.Show(L("L'installation a échoué :\n", "Installation failed:\n") + error, AppName, MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
        try { Process.Start(new ProcessStartInfo(Path.Combine(dest, Exe)) { WorkingDirectory = dest, UseShellExecute = true }); } catch { }
        return 0;
    }

    static void Install(string programs, string dest)
    {
        foreach (Process p in Process.GetProcessesByName(Path.GetFileNameWithoutExtension(Exe)))
        {
            try { p.Kill(); p.WaitForExit(5000); } catch { }
        }
        Directory.CreateDirectory(programs);
        if (Directory.Exists(dest)) Directory.Delete(dest, true);

        // Le zip de l'application est embarqué dans cet exe
        string tmp = Path.Combine(Path.GetTempPath(), "qg10-" + Guid.NewGuid().ToString("N") + ".zip");
        using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream("qg-app.zip"))
        {
            if (s == null) throw new Exception("Archive de l'application introuvable dans l'installateur.");
            using (FileStream o = File.Create(tmp)) s.CopyTo(o);
        }
        try { ZipFile.ExtractToDirectory(tmp, programs); }
        finally { try { File.Delete(tmp); } catch { } }
        if (!File.Exists(Path.Combine(dest, Exe))) throw new Exception("Fichiers incomplets après extraction.");

        // Raccourcis Bureau + menu Démarrer
        string target = Path.Combine(dest, Exe), icon = Path.Combine(dest, "QG.ico");
        Shortcut(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), AppName + ".lnk"), target, dest, icon);
        Shortcut(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), AppName + ".lnk"), target, dest, icon);

        // Entrée « Désinstaller » dans Paramètres > Applications (utilisateur courant, sans droits admin)
        using (RegistryKey k = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall\" + Folder))
        {
            k.SetValue("DisplayName", AppName);
            k.SetValue("DisplayVersion", Version);
            k.SetValue("Publisher", "QG");
            k.SetValue("DisplayIcon", icon);
            k.SetValue("InstallLocation", dest);
            k.SetValue("UninstallString", "\"" + Path.Combine(dest, "uninstall.cmd") + "\"");
            k.SetValue("NoModify", 1, RegistryValueKind.DWord);
            k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
        }
    }

    static void Shortcut(string lnk, string target, string workdir, string icon)
    {
        try
        {
            Type t = Type.GetTypeFromProgID("WScript.Shell");
            object sh = Activator.CreateInstance(t);
            object sc = t.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, sh, new object[] { lnk });
            Type st = sc.GetType();
            st.InvokeMember("TargetPath", BindingFlags.SetProperty, null, sc, new object[] { target });
            st.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, sc, new object[] { workdir });
            st.InvokeMember("IconLocation", BindingFlags.SetProperty, null, sc, new object[] { icon });
            st.InvokeMember("Description", BindingFlags.SetProperty, null, sc, new object[] { AppName });
            st.InvokeMember("Save", BindingFlags.InvokeMethod, null, sc, null);
        }
        catch { }
    }
}
