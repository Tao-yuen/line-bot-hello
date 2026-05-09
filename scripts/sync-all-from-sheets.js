const { execFile } = require("child_process");
const path = require("path");

function runScript(scriptName) {
  return new Promise((resolve, reject) => {
    execFile(
      process.execPath,
      [path.join(__dirname, scriptName)],
      { cwd: path.join(__dirname, "..") },
      (error, stdout, stderr) => {
        if (stdout) {
          process.stdout.write(stdout);
        }

        if (stderr) {
          process.stderr.write(stderr);
        }

        if (error) {
          reject(error);
          return;
        }

        resolve();
      }
    );
  });
}

async function main() {
  console.log("Syncing tires from Google Sheets...");
  await runScript("sync-tires-from-sheets.js");

  console.log("Syncing business hours from Google Sheets...");
  await runScript("sync-business-hours-from-sheets.js");

  console.log("All Google Sheets sync jobs completed.");
}

main().catch((error) => {
  console.error("Combined Google Sheets sync failed:", error);
  process.exitCode = 1;
});
