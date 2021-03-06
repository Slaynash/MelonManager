using Mono.Cecil;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace MelonManagerUtils
{
    class Program
    {
        static int Main(string[] args)
        {
            if (args.Length < 1)
            {
                Console.WriteLine("Missing arguments");
                return -1;
            }

            string command = args[0];

            if (command == "liststeamgames")
            {
                SteamFinder sf = new SteamFinder();
                sf.FindSteam();
                List<string> paths = sf.ListGamesPath();

                List<UnityGame> games = new List<UnityGame>();

                foreach (string path in paths)
                {
                    ScanSteamGame(path, games);
                }

                Console.WriteLine(JsonConvert.SerializeObject(games));

                return 0;
            }

            if (command == "getmeloninfos")
            {
                if (args.Length != 2)
                {
                    Console.WriteLine("Missing arguments");
                    return -1;
                }

                string gamePath = args[1];

                if (!Directory.Exists(gamePath))
                {
                    Console.WriteLine("{\"error\":\"Directory not found\"}");
                    return 0;
                }

                List<MelonInfo> meloninfos = new List<MelonInfo>();

                foreach (string folder in new[] { "Plugins", "Mods" })
                {
                    if (!Directory.Exists(Path.Combine(gamePath, folder)))
                        continue;

                    string[] files = Directory.GetFiles(Path.Combine(gamePath, folder), "*.dll");

                    foreach (string file in files)
                    {
                        using (AssemblyDefinition assembly = AssemblyDefinition.ReadAssembly(file, new ReaderParameters { ReadWrite = true }))
                        {

                            CustomAttribute melonInfoAttribute = assembly.CustomAttributes.FirstOrDefault(a =>
                                a.AttributeType.Name == "MelonModInfoAttribute" || a.AttributeType.Name == "MelonInfoAttribute");

                            if (melonInfoAttribute == null)
                                continue;

                            meloninfos.Add(new MelonInfo()
                            {
                                name = melonInfoAttribute.ConstructorArguments[1].Value as string,
                                version = melonInfoAttribute.ConstructorArguments[2].Value as string,
                                path = file
                            });
                        }
                    }
                }

                string melonloaderDllPath = Path.Combine(gamePath, "MelonLoader", "MelonLoader.ModHandler.dll");
                if (!File.Exists(melonloaderDllPath))
                    melonloaderDllPath = Path.Combine(gamePath, "MelonLoader", "MelonLoader.dll");

                string melonloaderversion = null;

                if (File.Exists(melonloaderDllPath))
                {
                    using (AssemblyDefinition assembly = AssemblyDefinition.ReadAssembly(melonloaderDllPath, new ReaderParameters { ReadWrite = true }))
                    {
                        melonloaderversion = assembly.MainModule.GetType("MelonLoader.BuildInfo").Fields.First(f => f.Name == "Version").Constant as string;
                    }
                }


                Console.WriteLine(JsonConvert.SerializeObject(new MelonLoaderInfos()
                {
                    melonloaderversion = melonloaderversion,
                    mods = meloninfos
                }));
            }

            return 0;
        }

        private static bool ScanSteamGame(string path, List<UnityGame> games)
        {
            string gameexe = Directory.GetFiles(path, "*.exe").FirstOrDefault(f => Directory.Exists(f.Substring(0, f.Length - 4) + "_Data"));
            if (gameexe != null)
            {
                string exename = gameexe.Split(new[] { Path.DirectorySeparatorChar }).Last();
                exename = exename.Substring(0, exename.Length - 4);

                string gamename = exename;

                try
                {
                    string[] appinfo = File.ReadAllLines(Path.Combine(path, exename + "_Data", "app.info"));
                    gamename = appinfo[1];
                    //Console.WriteLine("gamename: " + gamename);
                }
                catch (Exception) { }

                // https://github.com/LavaGang/MelonLoader.Installer/blob/4222e25152991347777cddb2a354b56e4953cdbc/MainForm.cs#L101-L106
                byte[] exedata = File.ReadAllBytes(gameexe);
                if (exedata == null || exedata.Length <= 0) // Error
                {
                    games.Add(new UnityGame()
                    {
                        name = gamename,
                        path = path,
                        error = "Failed to read the game executable"
                    });
                    return true;
                }

                bool x64 = BitConverter.ToUInt16(exedata, BitConverter.ToInt32(exedata, 60) + 4) == 34404;

                UnityGame game = new UnityGame()
                {
                    name = gamename,
                    path = path,
                    arch = x64 ? "x64" : "x32"
                };

                games.Add(game);

                return true;
            }
            else
            {
                foreach (string childDir in Directory.GetDirectories(path))
                    if (ScanSteamGame(childDir, games))
                        return true;
            }

            return false;
        }
    }
}
